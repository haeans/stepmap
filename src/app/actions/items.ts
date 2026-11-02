"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/user";
import { nextPosition, resolvePlace, toRow } from "@/lib/items/store";
import { parseItemForm } from "@/lib/items/validation";
import { createClient } from "@/lib/supabase/server";

export type ItemActionState = { error: string | null; saved: string | null };

// 소유자 확인은 RLS가 한다. 바뀐 행이 없으면 실패로 본다. (03-BACKEND.md 1절)

export async function createItem(tripId: string, _prev: ItemActionState, form: FormData): Promise<ItemActionState> {
  await requireUser();
  const parsed = parseItemForm(form);
  if (!parsed.ok) return { error: parsed.error, saved: null };
  const input = parsed.value;

  const supabase = await createClient();
  const { data: trip } = await supabase.from("trips").select("destination").eq("id", tripId).maybeSingle();
  if (!trip) return { error: "여행을 찾을 수 없습니다.", saved: null };

  const place = await resolvePlace(input, trip.destination, null);
  const { error } = await supabase.from("items").insert({
    ...toRow(input),
    ...place,
    trip_id: tripId,
    position: await nextPosition(supabase, tripId, input.day),
    source: "manual",
  });
  if (error) return { error: "항목을 저장하지 못했습니다.", saved: null };

  revalidatePath(`/trips/${tripId}`);
  return { error: null, saved: input.name };
}

export async function updateItem(
  itemId: string,
  tripId: string,
  _prev: ItemActionState,
  form: FormData,
): Promise<ItemActionState> {
  await requireUser();
  const parsed = parseItemForm(form);
  if (!parsed.ok) return { error: parsed.error, saved: null };
  const input = parsed.value;

  const supabase = await createClient();
  const { data: prev } = await supabase
    .from("items")
    .select("kind, name, address, lat, lng, day, trips(destination)")
    .eq("id", itemId)
    .eq("trip_id", tripId)
    .maybeSingle();
  if (!prev) return { error: "항목을 찾을 수 없습니다.", saved: null };

  const destination = (prev.trips as unknown as { destination: string } | null)?.destination ?? "";
  const place = await resolvePlace(input, destination, prev);
  const position = input.day !== prev.day ? { position: await nextPosition(supabase, tripId, input.day) } : {};

  const { data, error } = await supabase
    .from("items")
    .update({ ...toRow(input), ...place, ...position })
    .eq("id", itemId)
    .select("id");
  if (error || !data?.length) return { error: "항목을 고치지 못했습니다.", saved: null };

  revalidatePath(`/trips/${tripId}`);
  return { error: null, saved: input.name };
}

export async function deleteItem(itemId: string, tripId: string): Promise<{ error: string | null }> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("items").delete().eq("id", itemId).select("id");
  if (error || !data?.length) return { error: "항목을 지우지 못했습니다." };

  revalidatePath(`/trips/${tripId}`);
  return { error: null };
}
