// 대표 사진을 찾기 전에 목적지가 실제 지역(나라·도시·동네)인지 Google Places로 확인한다. (C9 F24, [haeans-f24-trip-list] 결정 6)
// 지역으로 확인되면 그 영어 이름(예: "교토" → "Kyoto")으로 Unsplash를 검색해 사진도 더 맞게 고른다.
// 지역이 아니거나(`asdf`, 가게 이름) 확인하지 못하면(키 없음·시간 초과·오류) null: 여행은 만들고 사진만 넣지 않는다(기본 카드).
// 장소 검색(items/geocode.ts)과 같은 서버 키·Text Search를 쓴다. 여행을 만들 때만, 많아야 2번(전체 → 첫 낱말) 부른다.

import { isAreaResult } from "@/lib/items/geocode";

type SearchTextResponse = { places?: { displayName?: { text?: string }; types?: string[] }[] };

export function pickAreaName(data: SearchTextResponse): string | null {
  const place = data.places?.[0];
  const name = place?.displayName?.text?.trim();
  return name && isAreaResult(place?.types) ? name : null;
}

// 찾아볼 검색어: 목적지 전체, 여러 낱말이면 첫 낱말도. "일본 교토 오사카"는 전체로는 호텔이 나오고 "일본"은 나라다.
export function areaQueries(destination: string): string[] {
  const full = destination.trim().replace(/\s+/g, " ");
  const first = full.split(" ")[0];
  return first && first !== full ? [full, first] : full ? [full] : [];
}

export async function findDestinationArea(destination: string): Promise<string | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) return null;
  for (const query of areaQueries(destination)) {
    const area = await searchArea(key, query);
    if (area !== null) return area;
  }
  return null;
}

async function searchArea(key: string, query: string): Promise<string | null> {
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.displayName,places.types",
      },
      body: JSON.stringify({ textQuery: query, languageCode: "en", pageSize: 1 }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("destination check failed", res.status);
      return null;
    }
    return pickAreaName((await res.json()) as SearchTextResponse);
  } catch (error) {
    console.error("destination check failed", error instanceof Error ? error.name : "unknown");
    return null;
  }
}
