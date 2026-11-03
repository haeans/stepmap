import { describe, expect, it } from "vitest";
import { chatMessage, lodgingFor, type ChatTrip } from "./prompt";

const trip: ChatTrip = {
  destination: "오사카",
  startDate: "2026-12-03",
  endDate: "2026-12-05",
  days: [
    { day: 1, date: "2026-12-03" },
    { day: 2, date: "2026-12-04" },
    { day: 3, date: "2026-12-05" },
  ],
  dayCount: 3,
};

const existing = [
  { kind: "transport", day: 1, time: "09:10:00", name: "KE723 인천→간사이", address: "" },
  { kind: "lodging", day: 1, time: "15:00:00", name: "난바 호텔", address: "" },
  { kind: "lodging", day: 3, time: null, name: "우메다 호텔", address: "" },
];

describe("lodgingFor", () => {
  it("그날까지 체크인한 숙소 중 가장 늦은 곳", () => {
    expect(lodgingFor(1, existing)).toBe("난바 호텔");
    expect(lodgingFor(2, existing)).toBe("난바 호텔");
    expect(lodgingFor(3, existing)).toBe("우메다 호텔");
  });
  it("숙소가 없으면 null", () => {
    expect(lodgingFor(1, [])).toBeNull();
  });
});

describe("chatMessage", () => {
  const text = chatMessage(trip, existing, [{ kind: "sight", day: 2, time: "10:00", name: "오사카성" }], [{ role: "user", text: "안녕" }], "둘째 날 짜 줘");

  it("일차별 날짜·요일·숙소를 코드가 적어 준다", () => {
    expect(text).toContain("DAY 1 · 12-03(목) · 숙소: 난바 호텔");
    expect(text).toContain("DAY 2 · 12-04(금) · 숙소: 난바 호텔");
  });
  it("기존 일정, 직전 제안, 대화 기록, 이번 말을 태그로 나눈다", () => {
    expect(text).toContain("<existing>\n- DAY 1 09:10 [transport] KE723 인천→간사이");
    expect(text).toContain("<current_plan>\n- DAY 2 10:00 [sight] 오사카성\n</current_plan>");
    expect(text).toContain("<history>\n사용자: 안녕\n</history>");
    expect(text.endsWith("<message>\n둘째 날 짜 줘\n</message>")).toBe(true);
  });
  it("비어 있으면 (없음)", () => {
    const empty = chatMessage({ ...trip, startDate: null, endDate: null, days: [{ day: 1, date: null }], dayCount: 10 }, [], [], [], "짜 줘");
    expect(empty).toContain("<current_plan>\n(없음)\n</current_plan>");
    expect(empty).toContain("1~10일차 중에서 고른다");
    expect(empty).toContain("DAY 10\n</days>");
  });
});
