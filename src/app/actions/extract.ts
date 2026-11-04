"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/user";
import { extractWithGemini } from "@/lib/extract/gemini";
import { maskPersonal } from "@/lib/extract/mask";
import { hideForAi } from "@/lib/extract/vault";
import { MAX_ITEMS, MAX_TEXT_LENGTH, normalizeItems, type ExtractedItem } from "@/lib/extract/normalize";
import { loadTripContext } from "@/lib/assistant/context";
import { nextPosition, resolvePlace, saveSecret, toRow } from "@/lib/items/store";
import { parseItemForm, toSecretRow, type ItemInput } from "@/lib/items/validation";
import { createClient } from "@/lib/supabase/server";

// R-04 붙여넣기 → 자동 추출. 원문은 저장하지 않고 추출 결과만 미리보기로 돌려준다. (B15)
// F18: 원문에 일차·시각이 없는 항목은 AI 추천값을 채우고 suggest로 표시한다.
// F20: 링크·예약번호는 자리표시로 바꿔 보내고(hideForAi) 결과에서 되돌린다. 저장 금지 정보는 maskPersonal이 가린다.

// unassigned: AI가 어느 항목에도 붙이지 않은 예약번호(F20). 미리보기에서 사용자가 직접 넣는다.
export type ExtractState = { error: string | null; items: ExtractedItem[] | null; unassigned?: string[] };
export type SaveExtractedState = { error: string | null; saved: number | null };

export async function extractItems(tripId: string, _prev: ExtractState, form: FormData): Promise<ExtractState> {
  const user = await requireUser();
  const raw = form.get("text");
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return { error: "붙여넣을 내용을 입력해 주세요.", items: null };
  if (text.length > MAX_TEXT_LENGTH) return { error: `원문은 ${MAX_TEXT_LENGTH.toLocaleString()}자까지 넣을 수 있습니다.`, items: null };

  // 추출은 비용이 드는 호출이라 소유자만 할 수 있게 먼저 확인한다. 저장 권한은 RLS가 따로 막는다.
  // F18: 추천할 때 빈 날·같은 지역을 보려고 이미 있는 일정의 종류·일차·시각·이름·주소만 함께 보낸다(메모·링크·비용은 빼고).
  const supabase = await createClient();
  const trip = await loadTripContext(supabase, tripId, user.id);
  if (!trip) return { error: "여행을 찾을 수 없습니다.", items: null };
  const { dayCount, busy } = trip;

  const hidden = hideForAi(text);
  const result = await extractWithGemini(
    { destination: trip.destination, startDate: trip.startDate, endDate: trip.endDate, dayCount },
    maskPersonal(hidden.text),
    trip.existing.map((i) => ({ ...i, name: maskPersonal(i.name), address: maskPersonal(i.address) })),
  );
  if (!result.ok) return { error: "추출하지 못했습니다. 잠시 뒤 다시 시도하거나 직접 입력을 써 주세요.", items: null };

  const items = normalizeItems(result.items, { startDate: trip.startDate, dayCount, busy, vault: hidden.vault });
  if (!items.length) return { error: "찾은 항목이 없습니다.", items: null };
  const used = new Set(items.map((i) => i.booking?.no).filter(Boolean));
  const unassigned = [...new Set(hidden.vault.bookings)].filter((b) => !used.has(b));
  return { error: null, items, unassigned };
}

export async function saveExtractedItems(
  tripId: string,
  _prev: SaveExtractedState,
  form: FormData,
): Promise<SaveExtractedState> {
  await requireUser();
  const count = Math.min(Number(form.get("count")) || 0, MAX_ITEMS);

  const inputs: ItemInput[] = [];
  for (let i = 0; i < count; i++) {
    const prefix = `items.${i}.`;
    if (form.get(`${prefix}include`) !== "on") continue;
    const parsed = parseItemForm(form, prefix);
    if (!parsed.ok) return { error: `${i + 1}번째 항목: ${parsed.error}`, saved: null };
    inputs.push(parsed.value);
  }
  if (!inputs.length) return { error: "저장할 항목을 하나 이상 골라 주세요.", saved: null };

  const supabase = await createClient();
  const { data: trip } = await supabase.from("trips").select("destination").eq("id", tripId).maybeSingle();
  if (!trip) return { error: "여행을 찾을 수 없습니다.", saved: null };

  const places = await Promise.all(inputs.map((input) => resolvePlace(input, trip.destination, null)));

  // 같은 날의 순서는 넣은 순서(미리보기 순서)로 이어 붙인다.
  const next = new Map<number, number>();
  const rows = [];
  for (const [i, input] of inputs.entries()) {
    const position = next.get(input.day) ?? (await nextPosition(supabase, tripId, input.day));
    next.set(input.day, position + 1);
    rows.push({ ...toRow(input), ...places[i], trip_id: tripId, position, source: "ai" as const });
  }

  const { data, error } = await supabase.from("items").insert(rows).select("id");
  if (error || data?.length !== rows.length) return { error: "항목을 저장하지 못했습니다.", saved: null };

  // F20: 예약 정보는 item_secrets에 따로. 여러 행 insert의 결과는 넣은 순서와 같다.
  const secrets = inputs.map((input, i) => ({ id: data[i].id, row: toSecretRow(input) })).filter((s) => s.row);
  const ok = await Promise.all(secrets.map((s) => saveSecret(supabase, s.id, tripId, s.row!)));

  revalidatePath(`/trips/${tripId}`);
  if (ok.includes(false)) return { error: "항목은 저장했지만 예약 정보 일부를 저장하지 못했습니다. 항목을 고쳐 다시 넣어 주세요.", saved: rows.length };
  return { error: null, saved: rows.length };
}
