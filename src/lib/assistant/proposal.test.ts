import { describe, expect, it } from "vitest";
import { MAX_PROPOSAL, normalizeProposal, placeKey, type ProposalContext, type RawProposalItem } from "./proposal";

const base: RawProposalItem = {
  kind: "sight",
  day: 2,
  time: "10:00",
  name: "오사카성",
  address: "",
  area: "",
  duration_min: 90,
  memo: "",
  reason: "",
};

const ctx: ProposalContext = { dayCount: 4, existing: [] };

describe("placeKey", () => {
  it("공백·문장부호·괄호 설명을 빼고 비교한다", () => {
    expect(placeKey("오사카 성 (天守閣)")).toBe(placeKey("오사카성"));
    expect(placeKey("Ichiran Ramen")).toBe(placeKey("ichiran-ramen"));
  });
});

describe("normalizeProposal", () => {
  it("메모는 제안하지 않는다", () => {
    const { items } = normalizeProposal([{ ...base, kind: "memo", name: "환전" }], ctx);
    expect(items).toEqual([]);
  });

  it("이미 있는 일정과 같은 장소는 빼고 알린다", () => {
    const { items, notes } = normalizeProposal([base, { ...base, name: "구로몬 시장", time: "13:00" }], {
      dayCount: 4,
      existing: [{ kind: "sight", day: 1, time: null, name: "오사카 성" }],
    });
    expect(items.map((i) => i.name)).toEqual(["구로몬 시장"]);
    expect(notes[0]).toContain("오사카성");
  });

  it("제안 안에서 같은 장소가 두 번 나오면 하나만 둔다", () => {
    const { items } = normalizeProposal([base, { ...base, day: 3 }], ctx);
    expect(items).toHaveLength(1);
  });

  it("일차를 여행 일수 안으로 맞춘다", () => {
    const { items } = normalizeProposal([{ ...base, day: 9 }, { ...base, name: "A", day: 0 }, { ...base, name: "B", day: null }], ctx);
    expect(items.map((i) => i.day).sort()).toEqual([1, 1, 4]);
  });

  it("같은 날 시간이 겹치면 앞 일정이 끝난 뒤로 미룬다", () => {
    const { items, notes } = normalizeProposal(
      [base, { ...base, name: "구로몬 시장", kind: "food", time: "10:30", duration_min: 60 }],
      ctx,
    );
    expect(items.map((i) => [i.name, i.time])).toEqual([
      ["오사카성", "10:00"],
      ["구로몬 시장", "11:30"],
    ]);
    expect(notes.some((n) => n.includes("미뤘습니다"))).toBe(true);
  });

  it("이미 있는 일정의 시간도 피한다", () => {
    const { items } = normalizeProposal([base], {
      dayCount: 4,
      existing: [{ kind: "food", day: 2, time: "09:30:00", name: "아침 식당" }],
    });
    expect(items[0].time).toBe("10:30");
  });

  it("숙소는 시간을 차지하지 않는다", () => {
    const { items } = normalizeProposal([base], {
      dayCount: 4,
      existing: [{ kind: "lodging", day: 2, time: "10:00", name: "호텔" }],
    });
    expect(items[0].time).toBe("10:00");
  });

  it("밤늦게까지 밀리면 시각을 비운다", () => {
    const { items, notes } = normalizeProposal([{ ...base, time: "23:00" }], {
      dayCount: 4,
      existing: [{ kind: "sight", day: 2, time: "22:30", name: "야경" }],
    });
    expect(items[0].time).toBeNull();
    expect(notes.some((n) => n.includes("시각을 비웠습니다"))).toBe(true);
  });

  it("일차·시각 순으로 정렬하고 상한까지만 둔다", () => {
    const many = Array.from({ length: MAX_PROPOSAL + 3 }, (_, i) => ({ ...base, name: `장소${i}`, day: 4 - (i % 4), time: null }));
    const { items, notes } = normalizeProposal(many, ctx);
    expect(items).toHaveLength(MAX_PROPOSAL);
    expect(items[0].day).toBe(1);
    expect(notes.some((n) => n.includes(`${MAX_PROPOSAL}곳까지`))).toBe(true);
  });

  it("지역은 메모에 남기고 비용·링크는 비운다", () => {
    const { items } = normalizeProposal([{ ...base, area: "주오구", memo: "천수각 입장료 있음" }], ctx);
    expect(items[0]).toMatchObject({ memo: "천수각 입장료 있음\n지역: 주오구", link: "", costAmount: null, found: null });
  });

  it("잘못된 시각은 비운다", () => {
    const { items } = normalizeProposal([{ ...base, time: "오후" }], ctx);
    expect(items[0].time).toBeNull();
  });
});
