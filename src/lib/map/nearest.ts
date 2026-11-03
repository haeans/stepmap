// 지도 탭에 들어올 때 고를 핀: 현재 시각에 가장 가까운 일정 (F14 결정 3)
// 날짜+시각은 기기 시각대로 만든다(여행지 시간대는 무시). 그래서 화면이 뜬 뒤 브라우저에서 부른다.

import type { MapPlace } from "./places";

type Trip = { startDate: string | null; endDate: string | null };

// "2026-11-03"의 day일차 hh:mm (기기 시각대)
function at(startDate: string, day: number, time = "00:00"): Date {
  const [y, m, d] = startDate.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d + day - 1, hh, mm);
}

// 고를 핀의 id. 고르지 않으면(모든 핀을 보여 줌) null.
export function nearestPlaceId(places: MapPlace[], trip: Trip, now: Date): string | null {
  if (!trip.startDate || places.length === 0) return null;
  const start = at(trip.startDate, 1);

  // 여행 전: 가장 앞 일차의 첫 핀 (places는 일차 → 시각 → 순서로 줄 서 있다)
  if (now < start) return places[0].id;

  // 여행이 끝남: 종료일(없으면 마지막 일차)의 다음 날 0시부터
  const endDays = trip.endDate && trip.endDate >= trip.startDate ? (at(trip.endDate, 1).getTime() - start.getTime()) / 86_400_000 + 1 : 0;
  const lastDay = Math.max(Math.round(endDays), ...places.map((p) => p.day));
  if (now >= at(trip.startDate, lastDay + 1)) return null;

  // 여행 중: 시각이 있는 장소 중 가장 가까운 것 (같으면 앞 일정)
  let best: { id: string; gap: number } | null = null;
  for (const p of places) {
    if (!p.time) continue;
    const gap = Math.abs(at(trip.startDate, p.day, p.time).getTime() - now.getTime());
    if (!best || gap < best.gap) best = { id: p.id, gap };
  }
  return best?.id ?? null;
}
