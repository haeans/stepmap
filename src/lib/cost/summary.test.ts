import { describe, expect, it } from "vitest";
import { formatAmount, summarizeCosts } from "./summary";

const cost = (amount: number | string | null, currency: string | null) => ({ cost_amount: amount, cost_currency: currency });

describe("summarizeCosts", () => {
  it("통화별로 따로 합계를 내고 동행 인원으로 나눈다", () => {
    const result = summarizeCosts([cost(389000, "KRW"), cost("3600.00", "HKD"), cost(88, "HKD"), cost(null, null)], 2);
    expect(result).toEqual([
      { currency: "KRW", count: 1, total: 389000, perPerson: 194500 },
      { currency: "HKD", count: 2, total: 3688, perPerson: 1844 },
    ]);
  });

  it("소수 금액도 오차 없이 더한다", () => {
    const [hkd] = summarizeCosts([cost(0.1, "HKD"), cost(0.2, "HKD")], 1);
    expect(hkd.total).toBe(0.3);
  });

  it("1인당 금액은 통화의 소수 자릿수에 맞춰 반올림한다", () => {
    const [krw, usd] = summarizeCosts([cost(100000, "KRW"), cost(100, "USD")], 3);
    expect(krw.perPerson).toBe(33333);
    expect(usd.perPerson).toBe(33.33);
  });

  it("비용이 없으면 빈 목록", () => {
    expect(summarizeCosts([cost(null, null)], 2)).toEqual([]);
  });
});

describe("formatAmount", () => {
  it("천 단위 쉼표와 통화 자릿수로 쓴다", () => {
    expect(formatAmount(194500, "KRW")).toBe("194,500");
    expect(formatAmount(33.333, "USD")).toBe("33.33");
    expect(formatAmount(10.5, "USD")).toBe("10.50");
    expect(formatAmount(3688, "HKD")).toBe("3,688");
  });
});
