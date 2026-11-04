// 지도(2화면)에 올릴 장소를 고르고 일차별 번호를 매긴다. (B22)

import { daySchedule, dayHub } from "@/lib/items/day-plan";
import { compareItems } from "@/lib/items/group";
import { formatCost, GEOCODED_KINDS, type Item, type ItemKind, type ItemSecret } from "@/lib/items/types";
import type { HubKind } from "./hubs";
import type { TransportHubs } from "./route-plan";

export type LatLng = { lat: number; lng: number };

// 교통 거점 핀: 거점 종류와 교통의 어느 쪽인가 (도착 "to" / 출발 "from")
export type MapHub = { kind: HubKind; side: "from" | "to" };

export type MapPlace = LatLng & {
  id: string; // 핀마다 다르다. 같은 숙소가 첫날 끝과 마지막 날 시작에 두 번 나올 수 있다 (F25)
  itemId: string; // 원래 일정 항목 id (?item= 링크)
  hub: MapHub | null; // 교통 거점 핀이면 거점 정보
  day: number;
  order: number; // 그 일차 안의 번호(1부터)
  kind: ItemKind;
  name: string;
  address: string;
  time: string | null;
  // 핀 세부(F14)에 보이는 칸
  memo: string;
  link: string;
  secret?: ItemSecret | null; // 예약 정보(F20). 소유자에게만 있다
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
      itemId: item.id,
      hub: null,
      day: item.day,
      order,
      kind: item.kind,
      name: item.name,
      address: item.address,
      time: item.time,
      memo: item.memo,
      link: item.link,
      secret: item.secret ?? null,
      cost: formatCost(item.cost_amount, item.cost_currency),
      lat: Number(item.lat),
      lng: Number(item.lng),
    });
  }
  return { places, missing };
}

// 거점 핀의 종류 글자. 매거진 거점 카드(hub-card.tsx)와 같은 표현이다: "공항 · 도착"
const HUB_LABEL: Record<HubKind, string> = { airport: "공항", station: "역", terminal: "터미널" };

export function hubLabel(hub: MapHub): string {
  return `${HUB_LABEL[hub.kind]} · ${hub.side === "to" ? "도착" : "출발"}`;
}

// 하루 일정 규칙(daySchedule, C9 F26 결정 1)의 시작·끝 교통 항목. 이것만 거점 좌표를 찾는다 (hub-lookup.ts findHubs)
export function scheduleHubItems(days: number[], items: Item[]): Item[] {
  return days.flatMap((day) => daySchedule(day, items).filter((e) => e.side !== null).map((e) => e.item));
}

// 지도 핀 (F25): 일차마다 하루 일정 규칙 그대로. 첫날은 도착 거점 → 장소 → 숙소, 마지막 날은 전날 숙소 → 장소 → 출발 거점,
// 가운데 날은 장소만. 좌표가 있는 것만 일차 안에서 1부터 번호를 매기고, 좌표가 없는 것(못 찾은 거점 포함)은 missing으로 센다.
// hubs: 교통 항목 id → 거점 좌표 (findHubs 결과)
export function schedulePins(days: number[], items: Item[], hubs: Map<string, TransportHubs>): { places: MapPlace[]; missing: number } {
  const places: MapPlace[] = [];
  let missing = 0;
  for (const day of days) {
    let order = 0;
    for (const { role, item, side } of daySchedule(day, items)) {
      const base = { id: `${day}:${item.id}`, itemId: item.id, day, kind: item.kind, address: "", memo: "", link: "", secret: null, cost: "" };
      if (side) {
        // 교통 거점: 이름은 매거진 거점 카드와 같게. 도착 시각은 저장하지 않아 출발 거점만 시각이 있다.
        const at = hubs.get(item.id)?.[side];
        const hub = dayHub(item, side);
        if (!at || !hub) {
          missing++;
          continue;
        }
        order++;
        places.push({ ...base, order, hub: { kind: hub.kind, side }, name: hub.name, time: side === "from" ? item.time : null, lat: at.lat, lng: at.lng });
        continue;
      }
      if (item.lat === null || item.lng === null) {
        missing++;
        continue;
      }
      order++;
      places.push({
        ...base,
        order,
        hub: null,
        name: item.name,
        address: item.address,
        // 마지막 날 아침의 숙소는 체크인 시각이 전날 것이라 숨긴다 (F26 결정 2)
        time: role === "start" ? null : item.time,
        memo: item.memo,
        link: item.link,
        secret: item.secret ?? null,
        cost: formatCost(item.cost_amount, item.cost_currency),
        lat: Number(item.lat),
        lng: Number(item.lng),
      });
    }
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
