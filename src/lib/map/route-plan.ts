// 하루 동선의 점 목록을 만든다: 그날 장소 + 교통 거점 + 시작·끝 숙소. (F15 결정 4)
// 시작: 그날 도착하는 교통의 도착 거점, 없으면 전날 숙소. 중간: 장소와 교통을 시각 순서로.
// 끝: 그날 밤 숙소, 떠나는 날(교통으로 끝남)이면 출발 거점.

import { compareItems } from "@/lib/items/group";
import type { Item } from "@/lib/items/types";
import type { LatLng, MapPlace } from "./places";

export type TravelMode = "flight" | "transport";
export type Hub = LatLng & { name: string };
// 교통 항목 하나의 거점. 못 찾은 쪽은 null이다.
export type TransportHubs = { mode: TravelMode; kind: "airport" | "station" | "terminal"; from: Hub | null; to: Hub | null };

// 번호 핀이 아닌 점의 표시 (결정 5). 그날의 번호 핀이면 null이다.
export type StopMark = "airport" | "station" | "lodging";

export type RouteStop = LatLng & {
  placeId: string | null; // 그날의 번호 핀이면 그 장소 id
  mark: StopMark | null;
  name: string;
  frame: boolean; // 지도 범위를 맞출 때 넣는가 (결정 2)
};

// travel[i]는 stops[i] → stops[i + 1] 구간이다. null이면 땅 위 구간이라 경로를 찾는다.
export type DayPlan = { stops: RouteStop[]; travel: (TravelMode | null)[] };

const placeStop = (p: MapPlace): RouteStop => ({ lat: p.lat, lng: p.lng, placeId: p.id, mark: null, name: p.name, frame: true });

export function planDay(day: number, items: Item[], places: MapPlace[], hubs: Map<string, TransportHubs>): DayPlan {
  const pins = new Map(places.filter((p) => p.day === day).map((p) => [p.id, p]));
  const stops: RouteStop[] = [];
  const travel: (TravelMode | null)[] = [];
  let pending: TravelMode | null = null; // 도착 거점을 못 찾은 교통: 다음 점까지가 교통 구간이다
  let first: "place" | "transport" | null = null;
  let last: "place" | "transport" | null = null;

  const push = (stop: RouteStop, mode: TravelMode | null) => {
    if (stops.length > 0) travel.push(mode ?? pending);
    pending = null;
    stops.push(stop);
  };

  for (const item of items.filter((i) => i.day === day).sort(compareItems)) {
    const pin = pins.get(item.id);
    if (pin) {
      push(placeStop(pin), null);
      last = "place";
    } else if (item.kind === "transport") {
      const h = hubs.get(item.id);
      if (!h || (!h.from && !h.to)) continue;
      const mark = h.kind === "airport" ? "airport" : "station";
      const hubStop = (hub: Hub): RouteStop => ({ ...hub, placeId: null, mark, frame: true });
      if (h.from) push(hubStop(h.from), null);
      if (h.to) push(hubStop(h.to), h.mode);
      else pending = h.mode;
      last = "transport";
    } else continue;
    first ??= last;
  }
  if (stops.length === 0) return { stops, travel };

  const lodgings = places.filter((p) => p.kind === "lodging");
  const lodgingStop = (p: MapPlace): RouteStop =>
    p.day === day ? placeStop(p) : { lat: p.lat, lng: p.lng, placeId: null, mark: "lodging", name: p.name, frame: true };

  // 시작: 교통으로 시작하지 않으면 전날 숙소에서
  const morning = first === "transport" ? undefined : lodgings.findLast((p) => p.day < day);
  if (morning) {
    stops.unshift(lodgingStop(morning));
    travel.unshift(null);
  }
  // 끝: 교통으로 끝나지 않으면 그날 밤 숙소로. 이미 마지막 점이면 다시 붙이지 않는다.
  const night = last === "transport" ? undefined : lodgings.findLast((p) => p.day <= day);
  if (night && stops.at(-1)?.placeId !== night.id) push(lodgingStop(night), null);

  return { stops: frameStops(stops, travel), travel };
}

// 멀리 떨어진 반대편 공항은 지도 범위에서 뺀다: 비행기 구간에만 닿은 공항 (결정 2)
// 예: 인천 → 간사이 비행기로 오는 날의 인천. 그날 점이 모두 그런 공항이면 빼지 않는다.
function frameStops(stops: RouteStop[], travel: (TravelMode | null)[]): RouteStop[] {
  const far = stops.map((s, i) => {
    if (s.mark !== "airport") return false;
    const sides = [i > 0 ? travel[i - 1] : undefined, i < travel.length ? travel[i] : undefined].filter((m) => m !== undefined);
    return sides.length > 0 && sides.every((m) => m === "flight");
  });
  if (far.every(Boolean)) return stops;
  return stops.map((s, i) => (far[i] ? { ...s, frame: false } : s));
}

// 패널 목록에서 장소 줄마다 그 앞에 보일 구간과, 마지막 장소 뒤에 보일 구간을 나눈다.
// 같은 장소가 두 번 나오면(그날 숙소로 돌아와 끝남) 첫 번째 줄에 붙이고 나머지는 뒤에 보인다.
export function legsByPlace<T>(stops: RouteStop[], legs: T[]): { before: Map<string, T[]>; after: T[] } {
  const before = new Map<string, T[]>();
  let buffer: T[] = [];
  stops.forEach((s, i) => {
    if (i > 0 && legs[i - 1] !== undefined) buffer.push(legs[i - 1]);
    if (s.placeId && !before.has(s.placeId)) {
      before.set(s.placeId, buffer);
      buffer = [];
    }
  });
  return { before, after: buffer };
}
