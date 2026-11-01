// 장소 이름이나 주소를 좌표로 바꾼다. 같은 이름의 다른 장소를 피하려고 여행 목적지를 함께 넘긴다. (03-BACKEND.md 4-1)
// 실패해도 항목 저장은 막지 않는다. 좌표 없이 저장하고 화면에 "위치 없음"으로 보인다.

import { GEOCODED_KINDS, type ItemKind } from "./types";

export type GeocodeResult = { lat: number; lng: number; address: string };

type PlaceFields = Pick<ItemFieldsForGeocode, "kind" | "name" | "address">;
export type ItemFieldsForGeocode = {
  kind: ItemKind;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

// 이름·주소·종류가 그대로이고 좌표가 이미 있으면 다시 찾지 않는다(호출 수 줄이기).
export function needsGeocode(prev: ItemFieldsForGeocode | null, next: PlaceFields): boolean {
  if (!GEOCODED_KINDS.includes(next.kind)) return false;
  if (!prev || prev.lat === null) return true;
  return prev.kind !== next.kind || prev.name !== next.name || prev.address !== next.address;
}

// 무엇으로 찾을지 정한다.
// 주소는 사용자가 새로 넣었거나 고쳤을 때(또는 그 주소로 아직 못 찾았을 때)만 쓴다.
// 그 밖의 주소는 지난번에 자동으로 채운 것일 수 있으므로 이름으로 다시 찾고 주소를 새로 채운다.
export function geocodeTarget(
  prev: ItemFieldsForGeocode | null,
  next: PlaceFields,
): { by: "address" | "name"; text: string } {
  const userAddress = next.address !== "" && (!prev || prev.address !== next.address || prev.lat === null);
  return userAddress ? { by: "address", text: next.address } : { by: "name", text: next.name };
}

export function geocodeQuery(text: string, destination: string): string {
  return [text, destination].filter(Boolean).join(" ");
}

// 나라·도시·동네 같은 지역 결과는 장소를 찾은 것이 아니다. 엉뚱한 핀이 찍히지 않게 버린다.
export function isAreaResult(types: string[] | undefined): boolean {
  return types?.includes("political") ?? false;
}

export async function geocodePlace(query: string): Promise<GeocodeResult | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key || !query) return null;

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.formattedAddress,places.location,places.types",
      },
      body: JSON.stringify({ textQuery: query, languageCode: "ko", pageSize: 1 }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("geocode failed", res.status);
      return null;
    }
    const data = (await res.json()) as {
      places?: { formattedAddress?: string; location?: { latitude: number; longitude: number }; types?: string[] }[];
    };
    const place = data.places?.[0];
    if (!place?.location || isAreaResult(place.types)) return null;
    return { lat: place.location.latitude, lng: place.location.longitude, address: place.formattedAddress ?? "" };
  } catch (error) {
    console.error("geocode error", error instanceof Error ? error.message : error);
    return null;
  }
}
