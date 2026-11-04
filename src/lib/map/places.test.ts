import { describe, expect, it } from "vitest";
import type { Item } from "@/lib/items/types";
import { dayColor, formatDistance, hubLabel, mapPlaces, scheduleHubItems, schedulePins, straightMeters } from "./places";
import type { TransportHubs } from "./route-plan";

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

  it("메모는 넘기고 링크·비용·예약 정보는 넘기지 않는다", () => {
    const { places } = mapPlaces([item({ memo: "야경", link: "https://a.b", cost_amount: "1200", cost_currency: "JPY" })]);
    expect(places[0]).toMatchObject({ memo: "야경" });
    expect(places[0]).not.toHaveProperty("link");
    expect(places[0]).not.toHaveProperty("cost");
    expect(places[0]).not.toHaveProperty("secret");
  });
});

// 오사카 3일: 1일차 비행기 도착(하루카는 중간 교통), 2일차 장소만, 3일차 귀국. 숙소는 하나.
const trip = [
  item({ id: "in", day: 1, time: "09:00:00", kind: "transport", name: "KE723 인천 → 간사이", lat: null, lng: null }),
  item({ id: "haruka", day: 1, time: "12:00:00", kind: "transport", name: "JR 하루카 간사이공항 → 신오사카", lat: null, lng: null }),
  item({ id: "castle", day: 1, time: "14:00:00", name: "오사카성", address: "오사카" }),
  item({ id: "hotel", day: 1, time: "15:00:00", kind: "lodging", name: "오사카 호텔" }),
  item({ id: "usj", day: 2, time: "10:00:00", name: "USJ" }),
  item({ id: "nowhere", day: 2, time: "15:00:00", kind: "food", name: "좌표 없는 식당", lat: null, lng: null }),
  item({ id: "fushimi", day: 3, time: "09:00:00", name: "후시미 이나리" }),
  item({ id: "out", day: 3, time: "18:00:00", kind: "transport", name: "KE724 간사이 → 인천", lat: null, lng: null }),
];
const kix = { lat: 34.43, lng: 135.24, name: "간사이 공항" };
const hubs = new Map<string, TransportHubs>([
  ["in", { mode: "flight", kind: "airport", from: null, to: kix }],
  ["out", { mode: "flight", kind: "airport", from: kix, to: null }],
]);
const pins = (h = hubs) => schedulePins([1, 2, 3], trip, h);

describe("schedulePins", () => {
  it("하루 일정 규칙대로: 첫날 도착 공항이 1번, 가운데 날은 장소만, 마지막 날 출발 공항이 마지막 번호", () => {
    expect(pins().places.map((p) => `${p.day}.${p.order}:${p.name}`)).toEqual([
      "1.1:간사이 공항",
      "1.2:오사카성",
      "1.3:오사카 호텔",
      "2.1:USJ",
      "3.1:오사카 호텔",
      "3.2:후시미 이나리",
      "3.3:간사이 공항",
    ]);
  });

  it("같은 숙소가 첫날 끝과 마지막 날 시작에 나오면 핀을 둘 다 그리고 id는 다르다", () => {
    const hotel = pins().places.filter((p) => p.itemId === "hotel");
    expect(hotel.map((p) => p.id)).toEqual(["1:hotel", "3:hotel"]);
    // 마지막 날 아침 숙소는 전날 체크인 시각을 숨긴다
    expect(hotel.map((p) => p.time)).toEqual(["15:00:00", null]);
  });

  it("거점 핀: 종류와 쪽을 넘기고, 도착은 시각 없이 출발은 출발 시각", () => {
    const [arrive, depart] = pins().places.filter((p) => p.hub);
    expect(arrive).toMatchObject({ hub: { kind: "airport", side: "to" }, time: null, kind: "transport", lat: kix.lat });
    expect(depart).toMatchObject({ hub: { kind: "airport", side: "from" }, time: "18:00:00" });
    expect(hubLabel(arrive.hub!)).toBe("공항 · 도착");
    expect(hubLabel({ kind: "station", side: "from" })).toBe("역 · 출발");
  });

  it("좌표가 없는 장소와 못 찾은 거점은 빼고 수를 센다. 번호는 비지 않는다", () => {
    const { places, missing } = pins(new Map());
    expect(places.filter((p) => p.day === 1).map((p) => `${p.order}:${p.name}`)).toEqual(["1:오사카성", "2:오사카 호텔"]);
    expect(missing).toBe(3); // 도착 공항, 출발 공항, 좌표 없는 식당
  });

  it("거점 좌표는 하루 일정의 시작·끝 교통만 찾는다 (중간 교통 하루카는 빼고)", () => {
    expect(scheduleHubItems([1, 2, 3], trip).map((i) => i.id)).toEqual(["in", "out"]);
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
