import { describe, expect, it } from "vitest";
import { cardSubtitle, formatCardPeriod } from "./card-text";

function trip(start_date: string | null, end_date: string | null, destination = "") {
  return { start_date, end_date, destination };
}

describe("formatCardPeriod", () => {
  it("같은 해면 종료일은 월.일만", () => {
    expect(formatCardPeriod(trip("2026-11-03", "2026-11-06"))).toBe("2026.11.03 – 11.06");
  });

  it("다른 해면 종료일에도 연도", () => {
    expect(formatCardPeriod(trip("2026-12-30", "2027-01-02"))).toBe("2026.12.30 – 2027.01.02");
  });

  it("시작일만 있으면 그 날짜만 연도까지", () => {
    expect(formatCardPeriod(trip("2026-11-03", null))).toBe("2026.11.03");
  });

  it("종료일만 있으면 그 날짜만 연도까지", () => {
    expect(formatCardPeriod(trip(null, "2026-11-06"))).toBe("2026.11.06");
  });

  it("시작일과 종료일이 같으면 하루만", () => {
    expect(formatCardPeriod(trip("2026-11-03", "2026-11-03"))).toBe("2026.11.03");
  });

  it("날짜가 없으면 빈 문자열", () => {
    expect(formatCardPeriod(trip(null, null))).toBe("");
  });
});

describe("cardSubtitle", () => {
  it("날짜와 목적지가 다 있으면 기간 · 목적지", () => {
    expect(cardSubtitle(trip("2026-11-03", "2026-11-06", "홍콩"))).toBe("2026.11.03 – 11.06 · 홍콩");
  });

  it("날짜만 있으면 날짜만", () => {
    expect(cardSubtitle(trip("2026-11-03", "2026-11-06"))).toBe("2026.11.03 – 11.06");
  });

  it("목적지만 있으면 목적지만", () => {
    expect(cardSubtitle(trip(null, null, "홍콩"))).toBe("홍콩");
  });

  it("둘 다 없으면 빈 문자열", () => {
    expect(cardSubtitle(trip(null, null))).toBe("");
  });

  it("날짜가 하나만 있어도 줄표 없이 목적지와 잇는다", () => {
    expect(cardSubtitle(trip(null, "2026-11-06", "홍콩"))).toBe("2026.11.06 · 홍콩");
  });
});
