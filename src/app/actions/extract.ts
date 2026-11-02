"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/user";
import { extractWithGemini } from "@/lib/extract/gemini";
import { maskPersonal } from "@/lib/extract/mask";
import { MAX_ITEMS, MAX_TEXT_LENGTH, normalizeItems } from "@/lib/extract/normalize";
import { nextPosition, resolvePlace, toRow } from "@/lib/items/store";
import { parseItemForm, type ItemInput } from "@/lib/items/validation";
import { createClient } from "@/lib/supabase/server";

// R-04 붙여넣기 → 자동 추출. 원문은 저장하지 않고 추출 결과만 미리보기로 돌려준다. (B15)

export type ExtractState = { error: string | null; items: ItemInput[] | null };
export type SaveExtractedState = { error: string | null; saved: number | null };

export async function extractItems(tripId: string, _prev: ExtractState, form: FormData): Promise<ExtractState> {
  const user = await requireUser();
  const raw = form.get("text");
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return { error: "붙여넣을 내용을 입력해 주세요.", items: null };
  if (text.length > MAX_TEXT_LENGTH) return { error: `원문은 ${MAX_TEXT_LENGTH.toLocaleString()}자까지 넣을 수 있습니다.`, items: null };

  // 추출은 비용이 드는 호출이라 소유자만 할 수 있게 먼저 확인한다. 저장 권한은 RLS가 따로 막는다.
  const supabase = await createClient();
  const { data: trip } = await supabase
    .from("trips")
    .select("owner_id, destination, start_date, end_date")
    .eq("id", tripId)
    .maybeSingle();
  if (!trip || trip.owner_id !== user.id) return { error: "여행을 찾을 수 없습니다.", items: null };

  const result = await extractWithGemini(
    { destination: trip.destination, startDate: trip.start_date, endDate: trip.end_date },
    maskPersonal(text),
  );
  if (!result.ok) return { error: "추출하지 못했습니다. 잠시 뒤 다시 시도하거나 직접 입력을 써 주세요.", items: null };

  const items = normalizeItems(result.items, trip.start_date);
  if (!items.length) return { error: "찾은 항목이 없습니다.", items: null };
  return { error: null, items };
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

  revalidatePath(`/trips/${tripId}`);
  return { error: null, saved: rows.length };
}
