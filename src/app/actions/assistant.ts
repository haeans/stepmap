"use server";

import { z } from "zod";
import { loadTripContext } from "@/lib/assistant/context";
import { chatMessage } from "@/lib/assistant/prompt";
import { MAX_CHAT_LENGTH } from "@/lib/assistant/route";
import { normalizeProposal, type ProposalItem } from "@/lib/assistant/proposal";
import { requireUser } from "@/lib/auth/user";
import { chatWithGemini } from "@/lib/extract/gemini";
import { maskPersonal } from "@/lib/extract/mask";
import { geocodePlace, geocodeQuery } from "@/lib/items/geocode";
import { GEOCODED_KINDS, ITEM_KINDS } from "@/lib/items/types";
import { createClient } from "@/lib/supabase/server";

// F19 대화 도우미 한 턴. 메시지 하나에 AI 호출 하나다. 대화는 서버·DB에 남기지 않는다. ([hyunw0000-f19-ai-planner] 결정 2·6·7)
// 저장은 여기서 하지 않는다. 사용자가 제안 미리보기에서 "저장"을 누르면 saveExtractedItems로 저장한다(결정 4).

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
  | { ok: true; reply: string; items: ProposalItem[]; notes: string[]; quickReplies: string[] }
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

  // 보내기 전에 개인정보 모양의 값을 가린다(B18). 대화 기록·기존 일정도 같다.
  const input = chatMessage(
    trip,
    trip.existing.map((i) => ({ ...i, name: maskPersonal(i.name), address: maskPersonal(i.address) })),
    plan.map((p) => ({ ...p, name: maskPersonal(p.name) })),
    history.map((t) => ({ role: t.role, text: maskPersonal(t.text) })),
    maskPersonal(message),
  );
  const result = await chatWithGemini(input);
  if (!result.ok) return { ok: false, error: "답하지 못했습니다. 잠시 뒤 다시 보내 주세요." };

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

  const reply = result.reply.trim().slice(0, 600) || (checked.length ? "일정을 짜 봤어요." : "다시 말씀해 주세요.");
  const quickReplies = result.quickReplies
    .map((q) => q.trim().slice(0, 30))
    .filter(Boolean)
    .slice(0, 3);
  return { ok: true, reply, items: checked, notes, quickReplies };
}
