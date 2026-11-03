import { describe, expect, it } from "vitest";
import type { Item } from "@/lib/items/types";
import { dayColor, formatDistance, mapPlaces, straightMeters } from "./places";

function item(over: Partial<Item>): Item {
  return {
    id: "x",
    trip_id: "t",
    day: 1,
    time: null,
    position: 0,
    kind: "sight",
    name: "장소",
    address: "",
    lat: 22.3,
    lng: 114.17,
    memo: "",
    link: "",
    cost_amount: null,
    cost_currency: null,
    source: "manual",
    created_at: "",
    updated_at: "",
    ...over,
  };
}

describe("mapPlaces", () => {
  it("좌표가 있는 숙소·관광지·식당만 일차 → 시각 → 순서로 올리고 일차마다 번호를 매긴다", () => {
    const { places, missing } = mapPlaces([
      item({ id: "d2-late", day: 2, time: "18:00:00" }),
      item({ id: "d1-b", day: 1, position: 1 }),
      item({ id: "d2-early", day: 2, time: "09:00:00", kind: "food" }),
      item({ id: "d1-a", day: 1, position: 0, kind: "lodging" }),
      item({ id: "flight", kind: "transport" }),
      item({ id: "memo", kind: "memo" }),
    ]);
    expect(places.map((p) => `${p.id}:${p.order}`)).toEqual(["d1-a:1", "d1-b:2", "d2-early:1", "d2-late:2"]);
    expect(missing).toBe(0);
  });

  it("좌표가 없는 장소는 빼고 수를 센다", () => {
    const { places, missing } = mapPlaces([item({ id: "a" }), item({ id: "b", lat: null, lng: null })]);
    expect(places.map((p) => p.id)).toEqual(["a"]);
    expect(missing).toBe(1);
  });

  it("핀 세부에 쓸 메모·링크·비용을 함께 넘긴다", () => {
    const { places } = mapPlaces([item({ memo: "야경", link: "https://a.b", cost_amount: "1200", cost_currency: "JPY" })]);
    expect(places[0]).toMatchObject({ memo: "야경", link: "https://a.b", cost: "1,200 JPY" });
  });
});

describe("거리와 색", () => {
  it("직선거리를 m로 구한다", () => {
    expect(straightMeters({ lat: 22.2799, lng: 114.1729 }, { lat: 22.2968, lng: 114.1722 })).toBeCloseTo(1880, -2);
  });
  it("1km 미만은 m, 이상은 km로 쓴다", () => {
    expect(formatDistance(850)).toBe("850m");
    expect(formatDistance(2345)).toBe("2.3km");
    expect(formatDistance(12_345)).toBe("12km");
  });
  it("일차 색은 10일마다 다시 쓴다", () => {
    expect(dayColor(11)).toBe(dayColor(1));
    expect(dayColor(2)).not.toBe(dayColor(1));
  });
});
