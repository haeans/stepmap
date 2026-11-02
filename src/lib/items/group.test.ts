import { describe, expect, it } from "vitest";
import { compareItems, groupItems } from "./group";
import type { Item } from "./types";

let n = 0;
function item(values: Partial<Item>): Item {
  n += 1;
  return {
    id: `i${n}`,
    trip_id: "t",
    day: 1,
    time: null,
    position: 0,
    kind: "sight",
    name: `항목${n}`,
    address: "",
    lat: null,
    lng: null,
    memo: "",
    link: "",
    cost_amount: null,
    cost_currency: null,
    source: "manual",
    created_at: "",
    updated_at: "",
    ...values,
  };
}

describe("compareItems", () => {
  it("일차 → 시각(없으면 뒤) → 순서", () => {
    const a = item({ day: 1, time: "10:00:00", position: 2 });
    const b = item({ day: 1, time: "09:00:00", position: 5 });
    const c = item({ day: 1, time: null, position: 0 });
    const d = item({ day: 2, time: "08:00:00" });
    const e = item({ day: 1, time: "09:00:00", position: 1 });
    expect([a, b, c, d, e].sort(compareItems).map((i) => i.id)).toEqual([e.id, b.id, a.id, c.id, d.id]);
  });
});

describe("groupItems", () => {
  const days = [
    { day: 1, date: "2026-12-01" },
    { day: 2, date: "2026-12-02" },
  ];

  it("종류별 영역으로 나눈다", () => {
    const flight = item({ kind: "transport" });
    const hotel = item({ kind: "lodging", cost_amount: "1200.00", cost_currency: "HKD" });
    const peak = item({ kind: "sight", day: 1 });
    const lunch = item({ kind: "food", day: 2, cost_amount: 80, cost_currency: "HKD" });
    const note = item({ kind: "memo", day: 2 });
    const g = groupItems([flight, hotel, peak, lunch, note], days);
    expect(g.transport).toEqual([flight]);
    expect(g.lodging).toEqual([hotel]);
    expect(g.days.map((d) => d.places.map((p) => p.id))).toEqual([[peak.id], [lunch.id]]);
    expect(g.memos).toEqual([note]);
    expect(g.costs.map((c) => c.id)).toEqual([hotel.id, lunch.id]);
  });

  it("여행 기간 밖 일차의 항목이 있으면 일차를 늘린다", () => {
    const late = item({ day: 4 });
    const g = groupItems([late], days);
    expect(g.days.map((d) => d.day)).toEqual([
      { day: 1, date: "2026-12-01" },
      { day: 2, date: "2026-12-02" },
      { day: 3, date: null },
      { day: 4, date: null },
    ]);
    expect(g.days[3].places).toEqual([late]);
  });
});
