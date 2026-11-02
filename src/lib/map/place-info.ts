import "server-only";
import { unstable_cache } from "next/cache";
import { parsePlaceInfo, type PlaceInfo, type PlaceSearchResponse } from "./place-info-parse";

// 매거진 장소 카드(F10)의 사진·영업시간·구글 지도 링크. Places API(New)로 이름+좌표 근처를 찾는다.
// 지오코딩(geocode.ts)과 같은 서버 키를 쓴다. 하루 동안 캐시해서 같은 장소를 다시 부르지 않는다.
// 사진 주소(photoUri)는 오래 두면 안 되므로 캐시를 하루로 둔다.

export type { PlaceInfo } from "./place-info-parse";

const SEARCH = "https://places.googleapis.com/v1/places:searchText";
const CACHE_SECONDS = 60 * 60 * 24;
const FIELDS = "places.photos,places.regularOpeningHours.weekdayDescriptions,places.googleMapsUri,places.rating";

// 실패하면 예외를 던진다(캐시하지 않게). 찾은 곳이 없으면 null.
async function fetchPlaceInfo(name: string, lat: number, lng: number): Promise<PlaceInfo | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) throw new Error("no key");
  const res = await fetch(SEARCH, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS },
    body: JSON.stringify({
      textQuery: name,
      languageCode: "ko",
      pageSize: 1,
      locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 500 } },
    }),
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`places ${res.status}`);
  const info = parsePlaceInfo((await res.json()) as PlaceSearchResponse);
  if (!info || !info.photoName) return info;

  // 사진 이름 → 실제 사진 주소. 키가 주소에 남지 않게 skipHttpRedirect로 주소만 받는다.
  const media = await fetch(
    `https://places.googleapis.com/v1/${info.photoName}/media?maxWidthPx=900&skipHttpRedirect=true&key=${encodeURIComponent(key)}`,
    { signal: AbortSignal.timeout(5000), cache: "no-store" },
  );
  if (!media.ok) throw new Error(`photo ${media.status}`);
  const { photoUri } = (await media.json()) as { photoUri?: string };
  return { ...info, photoUrl: photoUri ?? null };
}

const cached = unstable_cache(fetchPlaceInfo, ["place-info-v1"], { revalidate: CACHE_SECONDS });

export async function placeInfo(name: string, lat: number, lng: number): Promise<PlaceInfo | null> {
  try {
    return await cached(name, Number(lat.toFixed(5)), Number(lng.toFixed(5)));
  } catch (error) {
    console.error("place info error", error instanceof Error ? error.message : error);
    return null;
  }
}

// 좌표가 있는 장소 항목들의 정보를 한꺼번에 구한다. { 항목 id: 정보 }
export async function placeInfos(items: { id: string; name: string; lat: number | null; lng: number | null }[]): Promise<Record<string, PlaceInfo>> {
  const pairs = await Promise.all(
    items.filter((i) => i.lat !== null && i.lng !== null).map(async (i) => [i.id, await placeInfo(i.name, i.lat!, i.lng!)] as const),
  );
  return Object.fromEntries(pairs.filter((p): p is readonly [string, PlaceInfo] => p[1] !== null));
}
