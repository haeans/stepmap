// 지도(2화면)에 올릴 장소를 고르고 일차별 번호를 매긴다. (B22)

import { compareItems } from "@/lib/items/group";
import { formatCost, GEOCODED_KINDS, type Item, type ItemKind } from "@/lib/items/types";

export type LatLng = { lat: number; lng: number };

export type MapPlace = LatLng & {
  id: string;
  day: number;
  order: number; // 그 일차 안의 번호(1부터)
  kind: ItemKind;
  name: string;
  address: string;
  time: string | null;
  // 핀 세부(F14)에 보이는 칸
  memo: string;
  link: string;
  cost: string; // "12,000 JPY", 없으면 ""
};

// 좌표가 있는 숙소·관광지·식당만 일차 → 시각 → 순서로 줄 세운다.
// missing은 좌표를 못 찾아 지도에 올리지 못한 장소 수다.
export function mapPlaces(items: Item[]): { places: MapPlace[]; missing: number } {
  const targets = items.filter((i) => GEOCODED_KINDS.includes(i.kind)).sort(compareItems);
  const places: MapPlace[] = [];
  const count = new Map<number, number>();
  let missing = 0;
  for (const item of targets) {
    if (item.lat === null || item.lng === null) {
      missing++;
      continue;
    }
    const order = (count.get(item.day) ?? 0) + 1;
    count.set(item.day, order);
    places.push({
      id: item.id,
      day: item.day,
      order,
      kind: item.kind,
      name: item.name,
      address: item.address,
      time: item.time,
      memo: item.memo,
      link: item.link,
      cost: formatCost(item.cost_amount, item.cost_currency),
      lat: Number(item.lat),
      lng: Number(item.lng),
    });
  }
  return { places, missing };
}

// 일차별 색. 10일이 넘으면 처음부터 다시 쓴다.
const DAY_COLORS = ["#e11d48", "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#0891b2", "#db2777", "#65a30d", "#ea580c", "#4f46e5"];

export function dayColor(day: number): string {
  return DAY_COLORS[(day - 1) % DAY_COLORS.length];
}

// 두 지점 사이 직선거리(m)
export function straightMeters(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6_371_000 * Math.asin(Math.sqrt(h)));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)}km`;
}
