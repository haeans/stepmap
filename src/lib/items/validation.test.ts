import { describe, expect, it } from "vitest";
import { parseItemForm, toSecretRow } from "./validation";

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

describe("예약 칸 (F20)", () => {
  const lodging = (values: Record<string, string>) => form({ kind: "lodging", name: "호텔", booking: "1", ...values });

  it("booking=1이 없으면 예약 정보를 건드리지 않는다(쓴 돈 수정 등)", () => {
    const parsed = parseItemForm(form({ kind: "lodging", link: "https://a.com/x" }));
    expect(parsed.ok && parsed.value.booking).toBeUndefined();
    expect(parsed.ok && toSecretRow(parsed.value)).toBeUndefined();
    expect(parsed.ok && parsed.value.link).toBe("https://a.com/x");
  });

  it("예약번호·예약 링크는 소유자만 보는 곳으로, 공개 링크는 비운다", () => {
    const parsed = parseItemForm(lodging({ bookingNo: "K7Q2XM", bookingLink: "https://www.agoda.com/account/bookings", linkLevel: "auto" }));
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.value.link).toBe("");
    expect(toSecretRow(parsed.value)).toEqual({ booking_no: "K7Q2XM", booking_link: "https://www.agoda.com/account/bookings", level: "owner" });
  });

  it("토큰이 든 링크는 자동으로 비밀", () => {
    const parsed = parseItemForm(lodging({ bookingLink: "https://x.com/m?token=abc", linkLevel: "auto" }));
    expect(parsed.ok && toSecretRow(parsed.value)).toEqual({ booking_no: "", booking_link: "https://x.com/m?token=abc", level: "secret" });
  });

  it("'공유한 사람도 보기'는 공개 링크로 두고, 예약번호만 남긴다", () => {
    const parsed = parseItemForm(lodging({ bookingNo: "A1", bookingLink: "https://x.com/r", linkLevel: "public" }));
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.value.link).toBe("https://x.com/r");
    expect(toSecretRow(parsed.value)).toEqual({ booking_no: "A1", booking_link: "", level: "owner" });
  });

  it("예약 칸이 비면 지운다(null)", () => {
    const parsed = parseItemForm(lodging({}));
    expect(parsed.ok && toSecretRow(parsed.value)).toBeNull();
  });

  it("저장 금지 정보가 있으면 저장하지 않는다", () => {
    expect(parseItemForm(lodging({ memo: "카드 4111 1111 1111 1111" }))).toEqual({
      ok: false,
      error: "카드번호 같은 정보는 저장할 수 없습니다. 지우고 다시 저장해 주세요.",
    });
    expect(parseItemForm(lodging({ bookingNo: "M12345678" })).ok).toBe(false);
  });
});