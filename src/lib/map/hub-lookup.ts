import "server-only";
import { unstable_cache } from "next/cache";
import { searchPlace } from "@/lib/items/geocode";
import type { Item } from "@/lib/items/types";
import { hubTargets } from "./hubs";
import type { Hub, TransportHubs } from "./route-plan";

// 교통 거점 좌표를 지도를 그릴 때 찾는다. DB에는 저장하지 않는다. (F15 결정 1)
// 검색어마다 Places Text Search를 최대 1번, 여행 하나에 최대 40번. 못 찾음(null)은 캐시하고, 실패는 캐시하지 않는다.

const CACHE_SECONDS = 60 * 60 * 24 * 30;

// 키에 여행 id가 없어 여러 여행이 함께 쓴다. 예외를 던지면 unstable_cache가 저장하지 않는다.
const cachedHub = unstable_cache(
  async (query: string): Promise<Hub | null> => {
    const found = await searchPlace(query);
    return found ? { lat: found.lat, lng: found.lng, name: query } : null;
  },
  ["hub-geocode-v1"],
  { revalidate: CACHE_SECONDS },
);

// 교통 항목 id → 출발·도착 거점. 거점을 하나도 못 찾은 항목은 넣지 않는다.
export async function findHubs(items: Item[]): Promise<Map<string, TransportHubs>> {
  const targets = hubTargets(items);
  // 같은 검색어는 한 번만 부른다 (가는 편·오는 편의 같은 공항)
  const queries = [...new Set(targets.flatMap((t) => [t.queries.from, t.queries.to]).filter((q): q is string => q !== null))];
  const found = new Map(
    await Promise.all(
      queries.map(async (q) => {
        try {
          return [q, await cachedHub(q)] as const;
        } catch (error) {
          console.error("hub lookup failed", error instanceof Error ? error.message : error);
          return [q, null] as const;
        }
      }),
    ),
  );

  const hubs = new Map<string, TransportHubs>();
  for (const { item, queries } of targets) {
    const from = queries.from ? (found.get(queries.from) ?? null) : null;
    const to = queries.to ? (found.get(queries.to) ?? null) : null;
    if (from || to) hubs.set(item.id, { mode: queries.mode, kind: queries.kind, from, to });
  }
  return hubs;
}
