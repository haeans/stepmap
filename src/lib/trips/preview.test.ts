import { describe, expect, it } from "vitest";
import type { ItemKind } from "@/lib/items/types";
import { pickPreviewDays, type PreviewItem } from "./preview";

function item(day: number, kind: ItemKind, name: string, time: string | null = null, position = 0): PreviewItem {
  return { day, kind, name, time, position };
}

describe("pickPreviewDays", () => {
  it("관광지만 있는 DAY는 관광지를 시간순으로", () => {
    const items = [item(1, "sight", "빅토리아 피크", "15:00:00"), item(1, "sight", "스타의 거리", "10:00:00")];
    expect(pickPreviewDays(items)).toEqual([{ day: 1, places: ["스타의 거리", "빅토리아 피크"] }]);
  });

  it("관광지가 3곳 넘으면 앞 3곳만", () => {
    const items = ["A", "B", "C", "D"].map((name, i) => item(1, "sight", name, null, i));
    expect(pickPreviewDays(items)).toEqual([{ day: 1, places: ["A", "B", "C"] }]);
  });

  it("관광지가 있으면 식당·숙소는 넣지 않는다", () => {
    const items = [item(1, "food", "딤섬집", "09:00:00"), item(1, "sight", "스타의 거리", "10:00:00")];
    expect(pickPreviewDays(items)).toEqual([{ day: 1, places: ["스타의 거리"] }]);
  });

  it("관광지가 없으면 식당·숙소에서 같은 순서로", () => {
    const items = [item(1, "lodging", "호텔", "20:00:00"), item(1, "food", "딤섬집", "09:00:00"), item(1, "food", "야시장", null, 0)];
    expect(pickPreviewDays(items)).toEqual([{ day: 1, places: ["딤섬집", "호텔", "야시장"] }]);
  });

  it("교통·메모만 있는 DAY는 생략", () => {
    const items = [item(1, "transport", "공항철도"), item(1, "memo", "환전하기"), item(2, "sight", "스타의 거리")];
    expect(pickPreviewDays(items)).toEqual([{ day: 2, places: ["스타의 거리"] }]);
  });

  it("시간 있는 항목이 먼저, 시간이 같거나 없으면 position 순", () => {
    const items = [
      item(1, "sight", "시간 없음 2", null, 2),
      item(1, "sight", "10시 b", "10:00:00", 1),
      item(1, "sight", "시간 없음 1", null, 1),
      item(1, "sight", "10시 a", "10:00:00", 0),
    ];
    expect(pickPreviewDays(items)).toEqual([{ day: 1, places: ["10시 a", "10시 b", "시간 없음 1"] }]);
  });

  it("DAY는 오름차순", () => {
    const items = [item(2, "sight", "둘째 날"), item(1, "sight", "첫째 날")];
    expect(pickPreviewDays(items).map((d) => d.day)).toEqual([1, 2]);
  });

  it("보여 줄 장소가 하나도 없는 여행은 빈 목록", () => {
    expect(pickPreviewDays([])).toEqual([]);
    expect(pickPreviewDays([item(1, "transport", "공항철도"), item(2, "memo", "환전하기")])).toEqual([]);
  });
});
