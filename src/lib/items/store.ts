import "server-only";
import { geocodePlace, geocodeQuery, geocodeTarget, needsGeocode } from "./geocode";
import type { ItemInput } from "./validation";
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

// 좌표를 찾는다. 이름으로 찾았으면 찾은 주소로 채운다(화면에서 맞는 장소인지 확인할 수 있게).
// 이름으로 찾다가 못 찾으면 지난번 주소는 옛 이름의 것이므로 비운다.
export async function resolvePlace(input: ItemInput, destination: string, prev: PrevPlace | null) {
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
