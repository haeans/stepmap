// 1화면 영역별로 항목을 나눈다. A안·B안이 같이 쓴다. (02-FRONTEND.md 3-1, 3-2)
// GO(교통·숙소), DAY별 장소(관광지·식당), 쪽지(메모), 쓴 돈(비용이 있는 모든 항목)

import type { TripDay } from "@/lib/trips/days";
import type { Item } from "./types";

export type GroupedItems = {
  transport: Item[];
  lodging: Item[];
  days: { day: TripDay; places: Item[] }[];
  memos: Item[];
  costs: Item[];
};

// 정렬 기준: 일차 → 시각(없으면 뒤) → 같은 날 순서 (04-DB.md 4절)
export function compareItems(a: Item, b: Item): number {
  if (a.day !== b.day) return a.day - b.day;
  if (a.time !== b.time) {
    if (a.time === null) return 1;
    if (b.time === null) return -1;
    return a.time < b.time ? -1 : 1;
  }
  return a.position - b.position;
}

export function groupItems(items: Item[], tripDays: TripDay[]): GroupedItems {
  const sorted = [...items].sort(compareItems);

  // 여행 기간이 줄어도 그 뒤 일차의 항목이 사라지지 않게 일차를 늘린다.
  const days = [...tripDays];
  const maxDay = Math.max(0, ...sorted.map((i) => i.day));
  for (let d = days.length + 1; d <= maxDay; d++) days.push({ day: d, date: null });

  return {
    transport: sorted.filter((i) => i.kind === "transport"),
    lodging: sorted.filter((i) => i.kind === "lodging"),
    days: days.map((day) => ({
      day,
      places: sorted.filter((i) => i.day === day.day && (i.kind === "sight" || i.kind === "food")),
    })),
    memos: sorted.filter((i) => i.kind === "memo"),
    costs: sorted.filter((i) => i.cost_amount !== null && i.cost_currency),
  };
}
