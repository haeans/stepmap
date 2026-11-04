"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/user";
import { nextPosition, resolvePlace, saveSecret, toRow } from "@/lib/items/store";
import { parseItemForm, toSecretRow } from "@/lib/items/validation";
import { createClient } from "@/lib/supabase/server";

export type ItemActionState = { error: string | null; saved: string | null };

// 소유자 확인은 RLS가 한다. 바뀐 행이 없으면 실패로 본다. (03-BACKEND.md 1절)
// 예약 정보는 item_secrets에 따로 저장한다(C8 F20). 항목을 먼저 저장하고, 예약 정보 저장이 실패하면 그렇게 알린다.

const SECRET_FAILED = "항목은 저장했지만 예약 정보를 저장하지 못했습니다. 다시 고쳐 주세요.";

export async function createItem(tripId: string, _prev: ItemActionState, form: FormData): Promise<ItemActionState> {
  await requireUser();
  const parsed = parseItemForm(form);
  if (!parsed.ok) return { error: parsed.error, saved: null };
  const input = parsed.value;

  const supabase = await createClient();
  const { data: trip } = await supabase.from("trips").select("destination").eq("id", tripId).maybeSingle();
  if (!trip) return { error: "여행을 찾을 수 없습니다.", saved: null };

  const place = await resolvePlace(input, trip.destination, null);
  const { data, error } = await supabase
    .from("items")
    .insert({
      ...toRow(input),
      ...place,
      trip_id: tripId,
      position: await nextPosition(supabase, tripId, input.day),
      source: "manual",
    })
    .select("id")
    .single();
  if (error || !data) return { error: "항목을 저장하지 못했습니다.", saved: null };

  const secret = toSecretRow(input);
  revalidatePath(`/trips/${tripId}`);
  // 항목은 이미 저장했으므로 saved도 돌려준다(다시 누르면 같은 항목이 하나 더 생기지 않게 폼을 비운다).
  if (secret && !(await saveSecret(supabase, data.id, tripId, secret))) return { error: SECRET_FAILED, saved: input.name };
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

  const secret = toSecretRow(input);
  revalidatePath(`/trips/${tripId}`);
  if (secret !== undefined && !(await saveSecret(supabase, itemId, tripId, secret))) return { error: SECRET_FAILED, saved: null };
  return { error: null, saved: input.name };
}

export async function deleteItem(itemId: string, tripId: string): Promise<{ error: string | null }> {
  await requireUser();
  const supabase = await createClient();
  // 예약 정보(item_secrets)는 항목을 지우면 같이 지워진다(on delete cascade).
  const { data, error } = await supabase.from("items").delete().eq("id", itemId).select("id");
  if (error || !data?.length) return { error: "항목을 지우지 못했습니다." };

  revalidatePath(`/trips/${tripId}`);
  return { error: null };
}
