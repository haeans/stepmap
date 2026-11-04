import { describe, expect, it } from "vitest";
import { leastBusyDay, MAX_ITEMS, normalizeItems, toDay, toTime, type RawItem, type SuggestContext } from "./normalize";

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

const ctx: SuggestContext = { startDate: "2026-12-01", dayCount: 4, busy: {} };

describe("toDay", () => {
  it("여행 시작일이 있으면 날짜로 일차를 정한다", () => {
    expect(toDay({ date: "2026-12-03", day: null }, "2026-12-01")).toBe(3);
  });
  it("시작일이 없으면 원문의 일차를 쓴다", () => {
    expect(toDay({ date: "2026-12-03", day: 2 }, null)).toBe(2);
  });
  it("원문에서 알 수 없으면 null (DAY 1로 두지 않는다)", () => {
    expect(toDay({ date: null, day: null }, "2026-12-01")).toBeNull();
  });
  it("범위를 벗어나면 1~60으로 맞춘다", () => {
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

describe("leastBusyDay", () => {
  it("일정이 가장 적은 날, 같으면 앞날", () => {
    expect(leastBusyDay({ 1: 3, 2: 1, 3: 1 }, 3)).toBe(2);
    expect(leastBusyDay({}, 5)).toBe(1);
  });
});

describe("normalizeItems", () => {
  it("이름이 없거나 종류가 틀린 항목은 뺀다", () => {
    const items = normalizeItems([{ ...base, name: "  " }, { ...base, kind: "shopping" }, base], ctx);
    expect(items.map((i) => i.name)).toEqual(["빅토리아 피크"]);
  });

  it("지원하는 통화는 금액 칸에 넣는다", () => {
    const [item] = normalizeItems([{ ...base, cost_amount: 120.456, cost_currency: "hkd" }], ctx);
    expect(item.costAmount).toBe(120.46);
    expect(item.costCurrency).toBe("HKD");
  });

  it("지원하지 않는 통화는 금액을 비우고 메모에 남긴다", () => {
    const [item] = normalizeItems([{ ...base, memo: "케이블카", cost_amount: 50, cost_currency: "MOP" }], ctx);
    expect(item.costAmount).toBeNull();
    expect(item.costCurrency).toBeNull();
    expect(item.memo).toBe("케이블카\n금액: 50 MOP");
  });

  it("http(s)가 아닌 링크는 비운다", () => {
    const [item] = normalizeItems([{ ...base, link: "javascript:alert(1)" }], ctx);
    expect(item.link).toBe("");
  });

  it(`최대 ${MAX_ITEMS}개까지만 받는다`, () => {
    expect(normalizeItems(Array.from({ length: 40 }, () => base), ctx)).toHaveLength(MAX_ITEMS);
  });

  it("원문에 일차·시각이 있으면 추천이 아니다", () => {
    const [item] = normalizeItems([{ ...base, date: "2026-12-02", time: "10:00", suggested_day: 4, suggested_time: "15:00" }], ctx);
    expect(item.day).toBe(2);
    expect(item.time).toBe("10:00");
    expect(item.suggest).toBeNull();
  });

  it("원문에 없으면 AI 추천값을 쓰고 추천으로 표시한다", () => {
    const [item] = normalizeItems([{ ...base, suggested_day: 3, suggested_time: "9:30", reason: "피크트램은 아침이 덜 붐빔" }], ctx);
    expect(item.day).toBe(3);
    expect(item.time).toBe("09:30");
    expect(item.suggest).toEqual({ day: true, time: true, reason: "피크트램은 아침이 덜 붐빔" });
  });

  it("시각만 추천하면 일차는 원문 그대로", () => {
    const [item] = normalizeItems([{ ...base, day: 2, suggested_time: "12:00" }], ctx);
    expect(item.day).toBe(2);
    expect(item.suggest).toEqual({ day: false, time: true, reason: "" });
  });

  it("추천 일차는 여행 기간 안으로 맞춘다", () => {
    const [item] = normalizeItems([{ ...base, suggested_day: 9 }], ctx);
    expect(item.day).toBe(4);
  });

  it("AI 추천도 없으면 일정이 가장 적은 날을 추천하고, 이번에 넣는 항목도 센다", () => {
    const items = normalizeItems([base, base], { ...ctx, busy: { 1: 2, 2: 0, 3: 1, 4: 1 } });
    expect(items.map((i) => i.day)).toEqual([2, 2]);
    expect(items[0].suggest?.reason).toBe("일정이 가장 적은 날이라 추천했습니다.");
  });

  it("메모는 추천으로 띄우지 않고 시각도 추천하지 않는다", () => {
    const [item] = normalizeItems([{ ...base, kind: "memo", suggested_day: 2, suggested_time: "08:00" }], ctx);
    expect(item.day).toBe(2);
    expect(item.time).toBeNull();
    expect(item.suggest).toBeNull();
  });
});

describe("자리표시 되돌리기 (F20)", () => {
  const vault = { links: ["https://hotel.example.com/r?token=abc", "https://peak.example.com"], bookings: ["K7Q2XM"] };

  it("숙소: 예약번호·링크는 예약 칸으로, 공개 링크와 메모에는 넣지 않는다", () => {
    const [item] = normalizeItems(
      [{ ...base, kind: "lodging", name: "호텔", date: "2026-12-01", time: "15:00", link: "[링크1]", booking_ref: "[예약번호1]", memo: "조식 포함 [예약번호1]" }],
      { ...ctx, vault },
    );
    expect(item.link).toBe("");
    expect(item.memo).toBe("조식 포함");
    expect(item.booking).toEqual({ no: "K7Q2XM", link: "https://hotel.example.com/r?token=abc", level: "auto" });
  });

  it("관광지 링크는 공개 칸으로", () => {
    const [item] = normalizeItems([{ ...base, date: "2026-12-01", time: "10:00", link: "[링크2]" }], { ...ctx, vault });
    expect(item.link).toBe("https://peak.example.com");
  });

  it("AI가 지어낸 주소나 없는 번호는 버린다", () => {
    const [item] = normalizeItems([{ ...base, date: "2026-12-01", time: "10:00", link: "https://evil.example", booking_ref: "[예약번호9]" }], { ...ctx, vault });
    expect(item.link).toBe("");
    expect(item.booking?.no).toBe("");
  });

  it("메모에만 자리표시가 있으면 예약번호 칸으로 옮긴다", () => {
    const [item] = normalizeItems([{ ...base, kind: "food", date: "2026-12-01", time: "19:00", memo: "예약번호 [예약번호1]" }], { ...ctx, vault });
    expect(item.memo).toBe("");
    expect(item.booking?.no).toBe("K7Q2XM");
  });
});