// 여행 목록 카드 미리보기: DAY마다 첫 일정 하나. (C9 F24, B55·B59 고침)
// 시간순 맨 앞은 대개 공항·숙소라서 첫 관광지를 보여 주고, 관광지가 없는 DAY는 그날 첫 일정을 보여 준다.
// 메모는 일정이 아니므로 넣지 않는다. 그날 일정이 더 있으면 화면에서 "…"를 붙인다.

import type { Item } from "@/lib/items/types";

export const PREVIEW_EMPTY_TEXT = "일정이 아직 없어요";

// 목록 화면은 이 컬럼만 읽는다.
export type PreviewItem = Pick<Item, "day" | "time" | "position" | "kind" | "name">;
export type PreviewDay = { day: number; name: string; more: boolean };

// 상세 화면과 같은 순서: 시각(없으면 뒤) → 같은 날 순서 (items/group.ts compareItems)
function compareInDay(a: PreviewItem, b: PreviewItem): number {
  if (a.time !== b.time) {
    if (a.time === null) return 1;
    if (b.time === null) return -1;
    return a.time < b.time ? -1 : 1;
  }
  return a.position - b.position;
}

// 일정이 없는 DAY(메모만 있는 날)는 빠진다. 결과가 비면 화면은 PREVIEW_EMPTY_TEXT를 보여 준다.
export function pickPreviewDays(items: PreviewItem[]): PreviewDay[] {
  const byDay = new Map<number, PreviewItem[]>();
  for (const item of items) {
    if (item.kind === "memo") continue;
    byDay.set(item.day, [...(byDay.get(item.day) ?? []), item]);
  }

  return [...byDay.keys()]
    .sort((a, b) => a - b)
    .map((day) => {
      const dayItems = (byDay.get(day) ?? []).sort(compareInDay);
      const first = dayItems.find((i) => i.kind === "sight") ?? dayItems[0];
      return { day, name: first.name, more: dayItems.length > 1 };
    });
}
