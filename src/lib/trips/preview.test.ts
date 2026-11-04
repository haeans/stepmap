import { describe, expect, it } from "vitest";
import type { ItemKind } from "@/lib/items/types";
import { pickPreviewDays, type PreviewItem } from "./preview";

function item(day: number, kind: ItemKind, name: string, time: string | null = null, position = 0): PreviewItem {
  return { day, kind, name, time, position };
}

describe("pickPreviewDays", () => {
  it("공항·숙소가 앞에 있어도 첫 관광지를 보여 준다", () => {
    const items = [
      item(1, "transport", "KE123 ICN → HKG", "08:00:00"),
      item(1, "lodging", "호텔", "13:00:00"),
      item(1, "sight", "빅토리아 피크", "15:00:00"),
      item(1, "sight", "스타의 거리", "10:00:00"),
    ];
    expect(pickPreviewDays(items)).toEqual([{ day: 1, name: "스타의 거리", more: true }]);
  });

  it("관광지가 없으면 그날 시간순 첫 일정", () => {
    const items = [item(1, "food", "딤섬집", "09:00:00"), item(1, "transport", "공항철도", "07:30:00")];
    expect(pickPreviewDays(items)).toEqual([{ day: 1, name: "공항철도", more: true }]);
  });

  it("일정이 하나뿐이면 more는 false", () => {
    expect(pickPreviewDays([item(1, "sight", "스타의 거리")])).toEqual([{ day: 1, name: "스타의 거리", more: false }]);
  });

  it("메모는 일정으로 보지 않는다 (더 있음에도 세지 않음, 메모만 있는 DAY는 생략)", () => {
    const items = [item(1, "sight", "스타의 거리"), item(1, "memo", "환전하기"), item(2, "memo", "짐 싸기")];
    expect(pickPreviewDays(items)).toEqual([{ day: 1, name: "스타의 거리", more: false }]);
  });

  it("시간 있는 항목이 먼저, 시간이 같거나 없으면 position 순", () => {
    const items = [
      item(1, "sight", "시간 없음", null, 0),
      item(1, "sight", "10시 b", "10:00:00", 1),
      item(1, "sight", "10시 a", "10:00:00", 0),
    ];
    expect(pickPreviewDays(items)[0].name).toBe("10시 a");
  });

  it("DAY는 오름차순", () => {
    const items = [item(2, "sight", "둘째 날"), item(1, "sight", "첫째 날")];
    expect(pickPreviewDays(items).map((d) => d.day)).toEqual([1, 2]);
  });

  it("일정이 하나도 없는 여행은 빈 목록", () => {
    expect(pickPreviewDays([])).toEqual([]);
    expect(pickPreviewDays([item(1, "memo", "환전하기")])).toEqual([]);
  });
});
