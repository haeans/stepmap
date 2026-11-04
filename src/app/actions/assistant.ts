"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { loadTripContext } from "@/lib/assistant/context";
import { chatMessage } from "@/lib/assistant/prompt";
import { MAX_CHAT_LENGTH } from "@/lib/assistant/route";
import { normalizeChanges, normalizeProposal, type ChangeFields, type ProposalChange, type ProposalItem } from "@/lib/assistant/proposal";
import { requireUser } from "@/lib/auth/user";
import { chatWithGemini } from "@/lib/extract/gemini";
import { maskPersonal } from "@/lib/extract/mask";
import { hideForAi, stripPlaceholders } from "@/lib/extract/vault";
import { geocodePlace, geocodeQuery } from "@/lib/items/geocode";
import { nextPosition, resolvePlace, toRow } from "@/lib/items/store";
import { GEOCODED_KINDS, ITEM_KINDS } from "@/lib/items/types";
import { parseItemForm } from "@/lib/items/validation";
import { createClient } from "@/lib/supabase/server";

// F19 대화 도우미 한 턴. 메시지 하나에 AI 호출 하나다. 대화는 서버·DB에 남기지 않는다. ([hyunw0000-f19-ai-planner] 결정 2·6·7)
// 저장은 여기서 하지 않는다. 사용자가 제안 미리보기에서 "저장"을 누르면 saveExtractedItems로 저장한다(결정 4).
// 저장된 일정 고치기·지우기도 제안만 하고, 사용자가 카드에서 "반영"·"삭제"를 누르면 applyChange로 반영한다(범위 추가, 2026-11-04).

const MAX_HISTORY = 10;
const MAX_PLAN = 30;

const ChatInput = z.object({
  message: z.string().trim().min(1).max(MAX_CHAT_LENGTH),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(MAX_CHAT_LENGTH) }))
    .max(50)
    .transform((list) => list.slice(-MAX_HISTORY)),
  plan: z
    .array(z.object({ kind: z.enum(ITEM_KINDS), day: z.number().int(), time: z.string().nullable(), name: z.string().max(200) }))
    .max(MAX_PLAN),
});

export type ChatRequest = z.input<typeof ChatInput>;

export type ChatResponse =
  | { ok: true; reply: string; items: ProposalItem[]; changes: ProposalChange[]; notes: string[]; quickReplies: string[] }
  | { ok: false; error: string };

export async function sendChat(tripId: string, request: ChatRequest): Promise<ChatResponse> {
  const user = await requireUser();
  const parsed = ChatInput.safeParse(request);
  if (!parsed.success) return { ok: false, error: `말은 ${MAX_CHAT_LENGTH.toLocaleString()}자까지 보낼 수 있습니다.` };
  const { message, history, plan } = parsed.data;

  // AI 호출은 소유자만 (B17)
  const supabase = await createClient();
  const trip = await loadTripContext(supabase, tripId, user.id);
  if (!trip) return { ok: false, error: "여행을 찾을 수 없습니다." };

  // 보내기 전에 링크·예약번호는 자리표시로 바꾸고(F20 hideForAi), 저장 금지 정보는 가린다(B18). 대화 기록·직전 제안·기존 일정도 같다.
  // 대화는 예약 정보를 저장하지 않으므로 숨긴 원래 값(vault)은 버린다.
  const safe = (text: string) => maskPersonal(hideForAi(text).text);
  const input = chatMessage(
    trip,
    trip.existing.map((i) => ({ ...i, name: safe(i.name), address: safe(i.address) })),
    plan.map((p) => ({ ...p, name: safe(p.name) })),
    history.map((t) => ({ role: t.role, text: safe(t.text) })),
    safe(message),
  );
  const result = await chatWithGemini(input);
  if (!result.ok) return { ok: false, error: "답하지 못했습니다. 잠시 뒤 다시 보내 주세요." };

  // 모델이 자리표시("[링크1]")를 그대로 옮겨 쓰면 지운다(F20). 대화에서는 원래 값으로 되돌리지 않는다.
  const unmark = (text: string | null) => (text === null ? null : stripPlaceholders(text).text);
  result.items = result.items.map((r) => ({ ...r, name: unmark(r.name)!, address: unmark(r.address)!, memo: unmark(r.memo)! }));
  result.changes = result.changes.map((c) => ({ ...c, name: unmark(c.name), address: unmark(c.address), memo: unmark(c.memo) }));

  const { items, notes } = normalizeProposal(result.items, { dayCount: trip.dayCount, existing: trip.existing });

  // 실제로 있는 장소인지 Places로 확인하고 주소를 채운다. 못 찾으면 found=false(화면에서 넣기를 끈다). (결정 5)
  const checked = await Promise.all(
    items.map(async (item) => {
      if (!GEOCODED_KINDS.includes(item.kind)) return item;
      const place = await geocodePlace(geocodeQuery(item.name, trip.destination));
      return place ? { ...item, address: place.address, found: true } : { ...item, address: "", found: false };
    }),
  );
  const missing = checked.filter((i) => i.found === false).length;
  if (missing) notes.push(`${missing}곳은 지도에서 찾지 못해 넣기를 꺼 두었습니다. 이름을 확인해 주세요.`);

  // 저장된 일정 고치기·지우기: "#번호" → 실제 일정. 이름을 바꾼 장소는 Places로 찾아 보고 못 찾으면 반영을 끈다.
  const targets = trip.existing.map((e, i) => ({ ...e, id: trip.refs[i].id, memo: trip.refs[i].memo }));
  const normalized = normalizeChanges(result.changes, { dayCount: trip.dayCount, targets });
  notes.push(...normalized.notes);
  const changes = await Promise.all(
    normalized.changes.map(async (c) => {
      if (!c.after || c.after.name === c.before.name || !GEOCODED_KINDS.includes(c.kind)) return c;
      const place = await geocodePlace(geocodeQuery(c.after.name, trip.destination));
      return { ...c, found: place !== null };
    }),
  );
  const lost = changes.filter((c) => c.found === false).length;
  if (lost) notes.push(`${lost}곳은 바꾼 이름을 지도에서 찾지 못해 반영을 꺼 두었습니다.`);

  const reply =
    result.reply.trim().slice(0, 600) ||
    (checked.length ? "일정을 짜 봤어요." : changes.length ? "아래 카드에서 확인해 주세요." : "다시 말씀해 주세요.");
  const quickReplies = result.quickReplies
    .map((q) => q.trim().slice(0, 30))
    .filter(Boolean)
    .slice(0, 3);
  return { ok: true, reply, items: checked, changes, notes, quickReplies };
}

// ───────── 대화로 제안한 고치기·지우기 반영 ─────────
// 사용자가 카드에서 "반영"·"삭제"를 눌렀을 때만 부른다. AI를 부르지 않는다.
// 반영할 값은 화면에서 오므로 믿지 않고, 일정을 다시 읽어 직접 입력과 같은 검사(parseItemForm)를 거친다.

const ChangeInput = z.object({
  itemId: z.string().uuid(),
  action: z.enum(["update", "delete"]),
  after: z
    .object({
      day: z.number().int(),
      time: z.string().nullable(),
      name: z.string(),
      address: z.string(),
      memo: z.string(),
    })
    .nullable(),
});

export type ApplyChangeRequest = { itemId: string; action: "update" | "delete"; after: ChangeFields | null };

export async function applyChange(tripId: string, request: ApplyChangeRequest): Promise<{ error: string | null }> {
  const user = await requireUser();
  const parsed = ChangeInput.safeParse(request);
  if (!parsed.success) return { error: "바꿀 내용이 올바르지 않습니다." };
  const { itemId, action, after } = parsed.data;

  // 대화 도우미는 소유자만 쓴다(B17). 쓰기 권한은 RLS가 한 번 더 막는다.
  const supabase = await createClient();
  const { data: prev } = await supabase
    .from("items")
    .select("kind, day, name, address, lat, lng, link, cost_amount, cost_currency, trips(owner_id, destination)")
    .eq("id", itemId)
    .eq("trip_id", tripId)
    .maybeSingle();
  const trip = prev?.trips as unknown as { owner_id: string; destination: string } | null;
  if (!prev || !trip) return { error: "이미 없는 일정입니다." };
  if (trip.owner_id !== user.id) return { error: "여행을 만든 사람만 고칠 수 있습니다." };
  if (prev.kind === "memo") return { error: "쪽지는 매거진에서 직접 고쳐 주세요." };

  if (action === "delete") {
    const { data, error } = await supabase.from("items").delete().eq("id", itemId).eq("trip_id", tripId).select("id");
    if (error || !data?.length) return { error: "일정을 지우지 못했습니다." };
    revalidatePath(`/trips/${tripId}`);
    return { error: null };
  }

  if (!after) return { error: "바꿀 내용이 없습니다." };
  // 종류·링크·비용은 대화로 바꾸지 않는다. 지금 값을 그대로 넣어 직접 입력과 같은 검사를 거친다.
  const form = new FormData();
  form.set("kind", prev.kind);
  form.set("day", String(after.day));
  form.set("time", after.time ?? "");
  form.set("name", after.name);
  form.set("address", after.address);
  form.set("memo", after.memo);
  form.set("link", prev.link ?? "");
  form.set("costAmount", prev.cost_amount === null ? "" : String(prev.cost_amount));
  form.set("costCurrency", prev.cost_currency ?? "");
  const input = parseItemForm(form);
  if (!input.ok) return { error: input.error };

  const place = await resolvePlace(input.value, trip.destination, prev);
  const position = input.value.day !== prev.day ? { position: await nextPosition(supabase, tripId, input.value.day) } : {};
  const { data, error } = await supabase
    .from("items")
    .update({ ...toRow(input.value), ...place, ...position })
    .eq("id", itemId)
    .eq("trip_id", tripId)
    .select("id");
  if (error || !data?.length) return { error: "일정을 고치지 못했습니다." };

  revalidatePath(`/trips/${tripId}`);
  return { error: null };
}
