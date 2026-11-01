"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/user";
import { geocodePlace, geocodeQuery, geocodeTarget, needsGeocode } from "@/lib/items/geocode";
import { parseItemForm, type ItemInput } from "@/lib/items/validation";
import { createClient } from "@/lib/supabase/server";

export type ItemActionState = { error: string | null; saved: string | null };

// 소유자 확인은 RLS가 한다. 바뀐 행이 없으면 실패로 본다. (03-BACKEND.md 1절)

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function nextPosition(supabase: Supabase, tripId: string, day: number): Promise<number> {
  const { data } = await supabase
    .from("items")
    .select("position")
    .eq("trip_id", tripId)
    .eq("day", day)
    .order("position", { ascending: false })
    .limit(1);
  return (data?.[0]?.position ?? -1) + 1;
}

function toRow(input: ItemInput) {
  return {
    kind: input.kind,
    day: input.day,
    time: input.time,
    name: input.name,
    address: input.address,
    memo: input.memo,
    link: input.link,
    cost_amount: input.costAmount,
    cost_currency: input.costCurrency,
  };
}

// 좌표를 찾는다. 이름으로 찾았으면 찾은 주소로 채운다(화면에서 맞는 장소인지 확인할 수 있게).
// 이름으로 찾다가 못 찾으면 지난번 주소는 옛 이름의 것이므로 비운다.
async function resolvePlace(
  input: ItemInput,
  destination: string,
  prev: { kind: ItemInput["kind"]; name: string; address: string; lat: number | null; lng: number | null } | null,
) {
  if (!needsGeocode(prev, input)) {
    const keep = prev && input.kind === prev.kind;
    return { address: input.address, lat: keep ? prev.lat : null, lng: keep ? prev.lng : null };
  }
  const target = geocodeTarget(prev, input);
  const found = await geocodePlace(geocodeQuery(target.text, destination));
  if (target.by === "address") {
    return { address: input.address, lat: found?.lat ?? null, lng: found?.lng ?? null };
  }
  if (!found) return { address: "", lat: null, lng: null };
  return { address: found.address, lat: found.lat, lng: found.lng };
}

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
