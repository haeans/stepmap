import { describe, expect, it } from "vitest";
import { nearestPlaceId } from "./nearest";
import type { MapPlace } from "./places";

function place(id: string, day: number, time: string | null): MapPlace {
  return { id, day, time, order: 1, kind: "sight", name: id, address: "", memo: "", link: "", cost: "", lat: 0, lng: 0 };
}

// 기기 시각대 기준 시각 (nearest.ts와 같은 방식이라 시간대와 상관없이 맞는다)
const local = (y: number, m: number, d: number, hh = 0, mm = 0) => new Date(y, m - 1, d, hh, mm);

const trip = { startDate: "2026-11-10", endDate: "2026-11-12" };
const places = [place("d1-am", 1, "09:00:00"), place("d1-pm", 1, "15:00:00"), place("d2-none", 2, null), place("d2-noon", 2, "12:00:00")];

describe("nearestPlaceId", () => {
  it("여행 중이면 시각이 가장 가까운 장소를 고른다", () => {
    expect(nearestPlaceId(places, trip, local(2026, 11, 10, 11, 0))).toBe("d1-am");
    expect(nearestPlaceId(places, trip, local(2026, 11, 10, 13, 0))).toBe("d1-pm");
    expect(nearestPlaceId(places, trip, local(2026, 11, 11, 8, 0))).toBe("d2-noon");
  });

  it("거리가 같으면 앞 일정을 고른다", () => {
    expect(nearestPlaceId(places, trip, local(2026, 11, 10, 12, 0))).toBe("d1-am");
  });

  it("여행 전이면 가장 앞 일차의 첫 핀을 고른다", () => {
    expect(nearestPlaceId(places, trip, local(2026, 11, 1))).toBe("d1-am");
  });

  it("여행이 끝났으면 고르지 않는다 (종료일 다음 날 0시부터)", () => {
    expect(nearestPlaceId(places, trip, local(2026, 11, 12, 23, 59))).toBe("d2-noon");
    expect(nearestPlaceId(places, trip, local(2026, 11, 13))).toBeNull();
  });

  it("종료일이 없으면 마지막 일차가 지나면 끝난 것으로 본다", () => {
    const open = { startDate: "2026-11-10", endDate: null };
    expect(nearestPlaceId(places, open, local(2026, 11, 11, 20, 0))).toBe("d2-noon");
    expect(nearestPlaceId(places, open, local(2026, 11, 12))).toBeNull();
  });

  it("시작일이 없거나 시각이 있는 장소가 없으면 고르지 않는다", () => {
    expect(nearestPlaceId(places, { startDate: null, endDate: null }, local(2026, 11, 10, 9, 0))).toBeNull();
    expect(nearestPlaceId([place("a", 1, null)], trip, local(2026, 11, 10, 9, 0))).toBeNull();
    expect(nearestPlaceId([], trip, local(2026, 11, 10, 9, 0))).toBeNull();
  });
});
