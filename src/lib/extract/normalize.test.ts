import { describe, expect, it } from "vitest";
import { MAX_ITEMS, normalizeItems, toDay, toTime, type RawItem } from "./normalize";

const base: RawItem = {
  kind: "sight",
  date: null,
  day: null,
  time: null,
  name: "빅토리아 피크",
  address: "",
  memo: "",
  link: "",
  cost_amount: null,
  cost_currency: null,
};

describe("toDay", () => {
  it("여행 시작일이 있으면 날짜로 일차를 정한다", () => {
    expect(toDay({ date: "2026-12-03", day: null }, "2026-12-01")).toBe(3);
  });
  it("시작일이 없으면 AI가 준 일차를 쓴다", () => {
    expect(toDay({ date: "2026-12-03", day: 2 }, null)).toBe(2);
  });
  it("모르면 DAY 1, 범위를 벗어나면 1~60으로 맞춘다", () => {
    expect(toDay({ date: null, day: null }, "2026-12-01")).toBe(1);
    expect(toDay({ date: "2026-11-20", day: null }, "2026-12-01")).toBe(1);
    expect(toDay({ date: null, day: 99 }, null)).toBe(60);
  });
});

describe("toTime", () => {
  it("HH:MM으로 맞춘다", () => {
    expect(toTime("9:05")).toBe("09:05");
    expect(toTime("14:30:00")).toBe("14:30");
  });
  it("알 수 없는 값은 null", () => {
    expect(toTime("오후 두 시")).toBeNull();
    expect(toTime(null)).toBeNull();
  });
});

describe("normalizeItems", () => {
  it("이름이 없거나 종류가 틀린 항목은 뺀다", () => {
    const items = normalizeItems([{ ...base, name: "  " }, { ...base, kind: "shopping" }, base], null);
    expect(items.map((i) => i.name)).toEqual(["빅토리아 피크"]);
  });

  it("지원하는 통화는 금액 칸에 넣는다", () => {
    const [item] = normalizeItems([{ ...base, cost_amount: 120.456, cost_currency: "hkd" }], null);
    expect(item.costAmount).toBe(120.46);
    expect(item.costCurrency).toBe("HKD");
  });

  it("지원하지 않는 통화는 금액을 비우고 메모에 남긴다", () => {
    const [item] = normalizeItems([{ ...base, memo: "케이블카", cost_amount: 50, cost_currency: "MOP" }], null);
    expect(item.costAmount).toBeNull();
    expect(item.costCurrency).toBeNull();
    expect(item.memo).toBe("케이블카\n금액: 50 MOP");
  });

  it("http(s)가 아닌 링크는 비운다", () => {
    const [item] = normalizeItems([{ ...base, link: "javascript:alert(1)" }], null);
    expect(item.link).toBe("");
  });

  it(`최대 ${MAX_ITEMS}개까지만 받는다`, () => {
    expect(normalizeItems(Array.from({ length: 40 }, () => base), null)).toHaveLength(MAX_ITEMS);
  });
});
