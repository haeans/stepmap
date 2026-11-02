// 여행 목록 카드 아래 글. 있는 것만 보여 준다. (작업 파일 leedaekeon578-f09-trip-cards 결정 3)
// 목록 밖에서 쓰는 formatTripPeriod와는 모양이 달라 따로 둔다.

import type { Trip } from "./types";

// "2026-11-03" → "2026.11.03"
function dotted(isoDate: string): string {
  return isoDate.split("-").join(".");
}

// 같은 해: "2026.11.03 – 11.06", 다른 해: "2026.12.30 – 2027.01.02", 하나만 있거나 같은 날: "2026.11.03"
export function formatCardPeriod(trip: Pick<Trip, "start_date" | "end_date">): string {
  const { start_date: start, end_date: end } = trip;
  if (start && end && start !== end) {
    const sameYear = start.slice(0, 4) === end.slice(0, 4);
    return `${dotted(start)} – ${dotted(sameYear ? end.slice(5) : end)}`;
  }
  const one = start ?? end;
  return one ? dotted(one) : "";
}

// "기간 · 목적지". 둘 다 없으면 빈 문자열이고, 화면은 그 줄을 그리지 않는다.
export function cardSubtitle(trip: Pick<Trip, "start_date" | "end_date" | "destination">): string {
  return [formatCardPeriod(trip), trip.destination].filter(Boolean).join(" · ");
}
