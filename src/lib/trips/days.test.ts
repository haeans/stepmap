import { describe, expect, it } from "vitest";
import { MAX_DAYS, tripDays } from "./days";

describe("tripDays", () => {
  it("시작일부터 종료일까지 일차를 만든다", () => {
    expect(tripDays("2026-12-30", "2027-01-02")).toEqual([
      { day: 1, date: "2026-12-30" },
      { day: 2, date: "2026-12-31" },
      { day: 3, date: "2027-01-01" },
      { day: 4, date: "2027-01-02" },
    ]);
  });

  it("날짜가 없으면 1일차 하나", () => {
    expect(tripDays(null, null)).toEqual([{ day: 1, date: null }]);
    expect(tripDays(null, "2026-12-01")).toEqual([{ day: 1, date: null }]);
  });

  it("종료일이 없으면 시작일 하루", () => {
    expect(tripDays("2026-12-01", null)).toEqual([{ day: 1, date: "2026-12-01" }]);
  });

  it("너무 긴 기간은 최대 일수에서 자른다", () => {
    expect(tripDays("2026-01-01", "2026-12-31")).toHaveLength(MAX_DAYS);
  });
});
