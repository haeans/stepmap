import { describe, expect, it } from "vitest";
import { formatShortDate, formatShortPeriod } from "./short-date";

describe("formatShortDate", () => {
  it("월.일 (요일)로 바꾼다", () => {
    expect(formatShortDate("2026-11-20")).toBe("11.20 (금)");
    expect(formatShortDate("2026-11-23")).toBe("11.23 (월)");
  });

  it("날짜가 아니면 빈 문자열", () => {
    expect(formatShortDate(null)).toBe("");
    expect(formatShortDate("")).toBe("");
    expect(formatShortDate("2026/11/20")).toBe("");
    expect(formatShortDate("2026-13-40")).toBe("");
  });
});

describe("formatShortPeriod", () => {
  it("시작과 끝을 잇는다", () => {
    expect(formatShortPeriod("2026-11-20", "2026-11-23")).toBe("11.20 (금) – 11.23 (월)");
  });

  it("하루짜리나 한쪽만 있으면 그 날짜, 없으면 날짜 미정", () => {
    expect(formatShortPeriod("2026-11-20", "2026-11-20")).toBe("11.20 (금)");
    expect(formatShortPeriod(null, "2026-11-23")).toBe("11.23 (월)");
    expect(formatShortPeriod(null, null)).toBe("날짜 미정");
  });
});
