import "server-only";
import { geocodePlace, geocodeQuery, geocodeTarget, needsGeocode } from "./geocode";
import { SECRET_COLUMNS, type Item, type ItemSecret } from "./types";
import type { ItemInput, SecretRow } from "./validation";
import type { createClient } from "@/lib/supabase/server";

// 항목 저장에 쓰는 공통 부분. 직접 입력(R-05)과 자동 추출 저장(R-04)이 같이 쓴다.

export type Supabase = Awaited<ReturnType<typeof createClient>>;

export type PrevPlace = { kind: ItemInput["kind"]; name: string; address: string; lat: number | null; lng: number | null };

export async function nextPosition(supabase: Supabase, tripId: string, day: number): Promise<number> {
  const { data } = await supabase
    .from("items")
    .select("position")
    .eq("trip_id", tripId)
    .eq("day", day)
    .order("position", { ascending: false })
    .limit(1);
  return (data?.[0]?.position ?? -1) + 1;
}

export function toRow(input: ItemInput) {
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

// 예약 정보 저장 (C8 F20). 소유자 확인은 item_secrets의 RLS가 한다. null이면 지운다.
export async function saveSecret(supabase: Supabase, itemId: string, tripId: string, row: SecretRow): Promise<boolean> {
  if (row === null) {
    const { error } = await supabase.from("item_secrets").delete().eq("item_id", itemId);
    return !error;
  }
  const { error } = await supabase.from("item_secrets").upsert({ item_id: itemId, trip_id: tripId, ...row }, { onConflict: "item_id" });
  return !error;
}

// 여행 화면: 소유자일 때만 예약 정보를 붙인다. 공유받은 사람은 부르지 않는다(불러도 RLS가 빈 값을 준다).
// 표가 아직 없을 때(마이그레이션 반영 전)는 예약 정보 없이 보여 준다.
export async function attachSecrets(supabase: Supabase, tripId: string, items: Item[]): Promise<Item[]> {
  const { data, error } = await supabase.from("item_secrets").select(SECRET_COLUMNS).eq("trip_id", tripId);
  if (error || !data) return items;
  const byItem = new Map(data.map((s) => [s.item_id as string, { booking_no: s.booking_no, booking_link: s.booking_link, level: s.level } as ItemSecret]));
  return items.map((i) => ({ ...i, secret: byItem.get(i.id) ?? null }));
}

type PlaceColumns = { place_id: string | null; photo_url: null; photo_credit: null; photo_page: null };

function placeColumns(placeId: string | null): PlaceColumns {
  return { place_id: placeId, photo_url: null, photo_credit: null, photo_page: null };
}

// 좌표를 찾는다. 이름으로 찾았으면 찾은 주소로 채운다(화면에서 맞는 장소인지 확인할 수 있게).
// 이름으로 찾다가 못 찾으면 지난번 주소는 옛 이름의 것이므로 비운다.
// 장소 ID와 장소 사진(C8 F22)은 좌표와 함께 바뀐다. 다시 찾으면 사진 칸을 비워(null) 다음에 볼 때 새로 찾게 하고,
// 다시 찾지 않으면 이 칸들을 보내지 않아 그대로 둔다.
export async function resolvePlace(
  input: ItemInput,
  destination: string,
  prev: PrevPlace | null,
): Promise<{ address: string; lat: number | null; lng: number | null } & Partial<PlaceColumns>> {
  if (!needsGeocode(prev, input)) {
    const keep = prev && input.kind === prev.kind;
    if (keep) return { address: input.address, lat: prev.lat, lng: prev.lng };
    return { address: input.address, lat: null, lng: null, ...placeColumns(null) };
  }
  const target = geocodeTarget(prev, input);
  const found = await geocodePlace(geocodeQuery(target.text, destination));
  if (target.by === "address") {
    return { address: input.address, lat: found?.lat ?? null, lng: found?.lng ?? null, ...placeColumns(found?.placeId ?? null) };
  }
  if (!found) return { address: "", lat: null, lng: null, ...placeColumns(null) };
  return { address: found.address, lat: found.lat, lng: found.lng, ...placeColumns(found.placeId) };
}
