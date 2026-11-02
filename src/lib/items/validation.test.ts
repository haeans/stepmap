import { describe, expect, it } from "vitest";
import { parseItemForm } from "./validation";

function form(values: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries({ kind: "sight", day: "1", name: "빅토리아 피크", ...values })) f.set(k, v);
  return f;
}

describe("parseItemForm", () => {
  it("필수 칸만 있으면 나머지는 빈 값", () => {
    expect(parseItemForm(form({}))).toEqual({
      ok: true,
      value: {
        kind: "sight",
        day: 1,
        time: null,
        name: "빅토리아 피크",
        address: "",
        memo: "",
        link: "",
        costAmount: null,
        costCurrency: null,
      },
    });
  });

  it("5종 모두 받는다", () => {
    for (const kind of ["transport", "lodging", "sight", "food", "memo"]) {
      expect(parseItemForm(form({ kind })).ok).toBe(true);
    }
    expect(parseItemForm(form({ kind: "shopping" })).ok).toBe(false);
  });

  it("시각은 HH:MM, 초가 붙어도 앞 5자리만 쓴다", () => {
    const r = parseItemForm(form({ time: "09:30:00" }));
    expect(r.ok && r.value.time).toBe("09:30");
    expect(parseItemForm(form({ time: "24:00" })).ok).toBe(false);
  });

  it("일차와 이름 범위", () => {
    expect(parseItemForm(form({ day: "0" })).ok).toBe(false);
    expect(parseItemForm(form({ day: "61" })).ok).toBe(false);
    expect(parseItemForm(form({ name: "  " })).ok).toBe(false);
  });

  it("금액과 통화는 함께, 쉼표는 지운다", () => {
    const r = parseItemForm(form({ costAmount: "1,250.5", costCurrency: "hkd" }));
    expect(r.ok && [r.value.costAmount, r.value.costCurrency]).toEqual([1250.5, "HKD"]);
    expect(parseItemForm(form({ costAmount: "100" })).ok).toBe(false);
    expect(parseItemForm(form({ costAmount: "-1", costCurrency: "KRW" })).ok).toBe(false);
    expect(parseItemForm(form({ costAmount: "1.234", costCurrency: "KRW" })).ok).toBe(false);
    const noAmount = parseItemForm(form({ costCurrency: "KRW" }));
    expect(noAmount.ok && noAmount.value.costCurrency).toBeNull();
  });

  it("링크는 http(s)만", () => {
    expect(parseItemForm(form({ link: "https://example.com" })).ok).toBe(true);
    expect(parseItemForm(form({ link: "javascript:alert(1)" })).ok).toBe(false);
  });
});
