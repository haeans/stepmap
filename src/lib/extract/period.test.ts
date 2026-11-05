import { describe, expect, it } from "vitest";
import { datesFromText, detectPeriod, lengthFromText, periodChoices, shiftForPeriod } from "./period";

const trip = { startDate: "2026-11-20", endDate: "2026-11-24" }; // 4박 5일

describe("lengthFromText", () => {
  it("N박 M일에서 일 수를 읽는다", () => {
    expect(lengthFromText("[오사카 3박4일 일정]")).toBe(4);
    expect(lengthFromText("2박 3일 코스")).toBe(3);
    expect(lengthFromText("당일 코스")).toBeNull();
  });
});

describe("detectPeriod", () => {
  it("4박 5일 여행에 3박 4일 원문이면 종료일을 줄인다", () => {
    expect(detectPeriod("오사카 3박4일", trip, [{ date: "2026-11-20", day: null }])).toEqual({ startDate: "2026-11-20", endDate: "2026-11-23" });
  });

  it("날짜가 다르면 원문 날짜로 옮긴다", () => {
    expect(detectPeriod("3박 4일", { startDate: "2026-11-18", endDate: "2026-11-22" }, [{ date: "2026-11-20", day: null }])).toEqual({
      startDate: "2026-11-20",
      endDate: "2026-11-23",
    });
  });

  it("일차와 날짜가 같이 있으면 1일차 날짜를 거꾸로 계산한다", () => {
    expect(detectPeriod("2박 3일", trip, [{ date: "2026-11-22", day: 2 }])).toEqual({ startDate: "2026-11-21", endDate: "2026-11-23" });
  });

  it("길이가 없고 기간 안의 날짜만 있으면 묻지 않는다(원문이 여행 일부일 수 있음)", () => {
    expect(detectPeriod("료칸 예약", trip, [{ date: "2026-11-21", day: null }])).toBeNull();
  });

  it("길이가 없어도 원문 날짜·일차가 기간 밖이면 늘린다", () => {
    expect(detectPeriod("", trip, [{ date: "2026-11-26", day: null }])).toEqual({ startDate: "2026-11-20", endDate: "2026-11-26" });
    expect(detectPeriod("", trip, [{ date: null, day: 7 }])).toEqual({ startDate: "2026-11-20", endDate: "2026-11-26" });
    expect(detectPeriod("", trip, [{ date: "2026-11-18", day: null }])).toEqual({ startDate: "2026-11-18", endDate: "2026-11-24" });
  });

  it("이미 같으면 묻지 않는다", () => {
    expect(detectPeriod("4박 5일", trip, [{ date: "2026-11-20", day: null }])).toBeNull();
  });

  it("날짜 없는 여행에 원문 날짜가 있으면 기간을 정한다", () => {
    expect(detectPeriod("3박 4일", { startDate: null, endDate: null }, [{ date: "2026-11-20", day: null }])).toEqual({
      startDate: "2026-11-20",
      endDate: "2026-11-23",
    });
    expect(detectPeriod("3박 4일", { startDate: null, endDate: null }, [])).toBeNull();
  });
});

describe("datesFromText", () => {
  const today = "2026-11-05";

  it("여러 모양의 날짜를 읽고, 여행과 먼 날짜는 오늘 기준 다가오는 해로 정한다", () => {
    const feb = { startDate: "2027-02-21", endDate: "2027-02-25" };
    expect(datesFromText("11/20(목) 도착, 2026년 11월 21일 체크인, 11월 22일 체크아웃", feb, today)).toEqual([
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
    ]);
    // 이미 지난 2월 여행이어도 11/20은 다가오는 2026-11-20
    expect(datesFromText("11/20 도착", { startDate: "2026-02-21", endDate: "2026-02-25" }, today)).toEqual(["2026-11-20"]);
  });

  it("여행 기간 근처 날짜는 여행의 해로 본다(연말연시)", () => {
    expect(datesFromText("1/3 출발", { startDate: "2026-12-28", endDate: "2027-01-03" }, today)).toEqual(["2027-01-03"]);
  });

  it("시각·금액·박일은 날짜로 읽지 않는다", () => {
    expect(datesFromText("10:30 도착, 1,490엔, 3박4일, 2.000엔", { startDate: "2026-11-20", endDate: "2026-11-24" }, today)).toEqual([]);
  });
});

describe("detectPeriod: 여행과 다른 달", () => {
  it("2월 여행에 11월 원문(3박 4일)이면 AI가 날짜를 버려도 11월로 맞춘다", () => {
    const feb = { startDate: "2027-02-21", endDate: "2027-02-25" };
    expect(detectPeriod("[오사카 3박4일]\n11/20(목) 도착", feb, [{ date: null, day: null }], "2026-11-05")).toEqual({
      startDate: "2026-11-20",
      endDate: "2026-11-23",
    });
  });

  it("길이가 없어도 원문 날짜가 여행과 겹치지 않으면 길이를 지키며 옮긴다", () => {
    const feb = { startDate: "2027-02-21", endDate: "2027-02-25" };
    expect(detectPeriod("2026년 11월 21일 체크인 / 11월 22일 체크아웃", feb, [], "2026-11-05")).toEqual({ startDate: "2026-11-21", endDate: "2026-11-25" });
  });
});

describe("periodChoices", () => {
  it("날짜·기간이 둘 다 다르면 모두/날짜만/기간만을 준다", () => {
    const to = { startDate: "2026-11-20", endDate: "2026-11-23" };
    expect(periodChoices(to, { startDate: "2026-11-05", endDate: "2026-11-09" })).toEqual([
      { key: "both", period: to },
      { key: "date", period: { startDate: "2026-11-20", endDate: "2026-11-24" } },
      { key: "length", period: { startDate: "2026-11-05", endDate: "2026-11-08" } },
    ]);
  });

  it("시작일이 같으면 기간만 바뀌므로 하나만 준다", () => {
    const to = { startDate: "2026-11-20", endDate: "2026-11-23" };
    expect(periodChoices(to, { startDate: "2026-11-20", endDate: "2026-11-24" })).toEqual([{ key: "both", period: to }]);
  });

  it("길이가 같으면 날짜만 옮기는 것 하나만 준다", () => {
    const to = { startDate: "2026-11-20", endDate: "2026-11-23" };
    expect(periodChoices(to, { startDate: "2026-11-10", endDate: "2026-11-13" })).toEqual([{ key: "both", period: to }]);
  });

  it("날짜 없는 여행은 원문대로 하나만 준다", () => {
    const to = { startDate: "2026-11-20", endDate: "2026-11-23" };
    expect(periodChoices(to, { startDate: null, endDate: null })).toEqual([{ key: "both", period: to }]);
  });
});

describe("shiftForPeriod", () => {
  it("날짜를 지키도록 일차를 옮긴다", () => {
    // 11/18 시작 → 11/20 시작: 11/21(3일차)은 2일차가 된다
    expect(shiftForPeriod("2026-11-18", "2026-11-20")).toBe(-2);
    expect(shiftForPeriod(null, "2026-11-20")).toBe(0);
  });
});
