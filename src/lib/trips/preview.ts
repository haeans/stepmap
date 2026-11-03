// 여행 목록 카드 미리보기: DAY별 대표 장소. (작업 파일 leedaekeon578-f09-trip-cards 결정 5)
// 관광지가 있는 DAY는 관광지만, 없으면 식당·숙소에서 앞 3곳. 교통·메모는 넣지 않는다.

import type { Item } from "@/lib/items/types";

export const PREVIEW_PLACES_PER_DAY = 3;
export const PREVIEW_EMPTY_TEXT = "대표 장소가 아직 없어요";

// 목록 화면은 이 컬럼만 읽는다.
export type PreviewItem = Pick<Item, "day" | "time" | "position" | "kind" | "name">;
export type PreviewDay = { day: number; places: string[] };

// 상세 화면과 같은 순서: 시각(없으면 뒤) → 같은 날 순서 (items/group.ts compareItems)
function compareInDay(a: PreviewItem, b: PreviewItem): number {
  if (a.time !== b.time) {
    if (a.time === null) return 1;
    if (b.time === null) return -1;
    return a.time < b.time ? -1 : 1;
  }
  return a.position - b.position;
}

// 보여 줄 장소가 없는 DAY는 빠진다. 결과가 비면 화면은 PREVIEW_EMPTY_TEXT를 보여 준다.
export function pickPreviewDays(items: PreviewItem[]): PreviewDay[] {
  const byDay = new Map<number, PreviewItem[]>();
  for (const item of items) byDay.set(item.day, [...(byDay.get(item.day) ?? []), item]);

  return [...byDay.keys()]
    .sort((a, b) => a - b)
    .map((day) => {
      const dayItems = byDay.get(day) ?? [];
      const sights = dayItems.filter((i) => i.kind === "sight");
      const pool = sights.length > 0 ? sights : dayItems.filter((i) => i.kind === "food" || i.kind === "lodging");
      return { day, places: pool.sort(compareInDay).slice(0, PREVIEW_PLACES_PER_DAY).map((i) => i.name) };
    })
    .filter((d) => d.places.length > 0);
}
