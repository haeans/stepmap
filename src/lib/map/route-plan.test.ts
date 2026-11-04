import { describe, expect, it } from "vitest";
import type { Item } from "@/lib/items/types";
import { mapPlaces } from "./places";
import { legsByPlace, planDay, type TransportHubs } from "./route-plan";

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
    lat: 34.99,
    lng: 135.75,
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

const ICN = { lat: 37.46, lng: 126.44, name: "ICN 공항" };
const KIX = { lat: 34.43, lng: 135.23, name: "KIX 공항" };
const KYOTO = { lat: 34.98, lng: 135.76, name: "교토 역" };
const OSAKA = { lat: 34.73, lng: 135.5, name: "신오사카 역" };

const items = [
  item({ id: "in", day: 1, time: "09:00:00", kind: "transport", name: "KE1 ICN → KIX", lat: null, lng: null }),
  item({ id: "temple", day: 1, time: "14:00:00" }),
  item({ id: "hotel", day: 1, time: "15:00:00", kind: "lodging" }),
  item({ id: "dinner", day: 1, time: "19:00:00", kind: "food" }),
  item({ id: "shrine", day: 2, time: "10:00:00" }),
  item({ id: "train", day: 2, time: "13:00:00", kind: "transport", name: "신칸센 교토 → 신오사카", lat: null, lng: null }),
  item({ id: "castle", day: 2, time: "15:00:00", lat: 34.69, lng: 135.53 }),
  item({ id: "market", day: 3, time: "10:00:00" }),
  item({ id: "out", day: 3, time: "18:00:00", kind: "transport", name: "KE2 KIX → ICN", lat: null, lng: null }),
];
const { places } = mapPlaces(items);
const hubs = new Map<string, TransportHubs>([
  ["in", { mode: "flight", kind: "airport", from: ICN, to: KIX }],
  ["train", { mode: "transport", kind: "station", from: KYOTO, to: OSAKA }],
  ["out", { mode: "flight", kind: "airport", from: KIX, to: ICN }],
]);

const names = (day: number, h = hubs) => planDay(day, items, places, h).stops.map((s) => s.placeId ?? `${s.mark}:${s.name}`);

describe("planDay", () => {
  it("도착하는 날: 도착 거점에서 시작, 숙소를 거쳐 다시 숙소로 끝난다", () => {
    const plan = planDay(1, items, places, hubs);
    expect(names(1)).toEqual(["airport:ICN 공항", "airport:KIX 공항", "temple", "hotel", "dinner", "hotel"]);
    expect(plan.travel).toEqual(["flight", null, null, null, null]);
  });
  it("중간 날: 전날 숙소에서 시작, 교통 구간을 사이에 두고 그날 밤 숙소로 끝난다", () => {
    const plan = planDay(2, items, places, hubs);
    expect(names(2)).toEqual(["lodging:장소", "shrine", "station:교토 역", "station:신오사카 역", "castle", "lodging:장소"]);
    expect(plan.travel).toEqual([null, null, "transport", null, null]);
  });
  it("떠나는 날: 전날 숙소에서 시작해 출발 거점을 지나 비행기로 끝난다", () => {
    const plan = planDay(3, items, places, hubs);
    expect(names(3)).toEqual(["lodging:장소", "market", "airport:KIX 공항", "airport:ICN 공항"]);
    expect(plan.travel).toEqual([null, null, "flight"]);
  });
  it("멀리 떨어진 반대편 공항(비행기 구간에만 닿음)은 지도 범위에서 뺀다", () => {
    const frame = (day: number) => planDay(day, items, places, hubs).stops.map((s) => s.frame);
    expect(frame(1)).toEqual([false, true, true, true, true, true]);
    expect(frame(3)).toEqual([true, true, true, false]);
  });
  it("거점을 못 찾은 교통은 없는 것처럼, 한쪽만 찾으면 그쪽과 교통 구간만 넣는다", () => {
    expect(names(1, new Map())).toEqual(["temple", "hotel", "dinner", "hotel"]);
    const half = new Map(hubs).set("train", { mode: "transport", kind: "station", from: null, to: OSAKA });
    expect(names(2, half)).toEqual(["lodging:장소", "shrine", "station:신오사카 역", "castle", "lodging:장소"]);
    expect(planDay(2, items, places, half).travel).toEqual([null, "transport", null, null]);
  });
  it("그날 점이 없으면 빈 동선", () => {
    expect(planDay(9, items, places, hubs)).toEqual({ stops: [], travel: [] });
  });
});

describe("legsByPlace", () => {
  it("장소 줄 앞 구간과 마지막 장소 뒤 구간으로 나눈다. 같은 장소가 두 번이면 첫 줄에 붙인다", () => {
    const { stops } = planDay(1, items, places, hubs);
    const { before, after } = legsByPlace(stops, ["flight", "a", "b", "c", "d"]);
    expect(before.get("temple")).toEqual(["flight", "a"]);
    expect(before.get("hotel")).toEqual(["b"]);
    expect(before.get("dinner")).toEqual(["c"]);
    expect(after).toEqual(["d"]);
  });
});
