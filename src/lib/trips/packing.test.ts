import { describe, expect, it } from "vitest";
import { cleanPackingLabels, mergePacking, packingFromMessage } from "./packing";

describe("cleanPackingLabels", () => {
  it("글머리표·번호를 떼고 빈 것·같은 것을 뺀다", () => {
    expect(cleanPackingLabels(["- 여권", "• 충전기", "1. 우산", " ", "여 권", "선크림"])).toEqual(["여권", "충전기", "우산", "선크림"]);
  });

  it("40자에서 자른다", () => {
    expect(cleanPackingLabels(["가".repeat(50)])[0]).toHaveLength(40);
  });
});

describe("packingFromMessage", () => {
  it("준비물: 한 줄을 쉼표로 나눈다", () => {
    expect(packingFromMessage("준비물: 여권, 110V 어댑터, 선크림")).toEqual(["여권", "110V 어댑터", "선크림"]);
  });

  it("제목 아래 줄마다 하나", () => {
    expect(packingFromMessage("챙길 것\n- 여권\n- 우산\n- 상비약")).toEqual(["여권", "우산", "상비약"]);
  });

  it("말로 적은 준비물(하고·랑·음..)은 직접 나누지 않고 AI에 맡긴다", () => {
    expect(packingFromMessage("준비물: 수영복하고 음.. 돼지코랑 여권 필수")).toBe("ai");
    expect(packingFromMessage("준비물 수영복이랑 모자 그리고 선글라스")).toBe("ai");
    expect(packingFromMessage("챙길 것: 여권, 수영복하고 모자")).toBe("ai");
  });

  it("짧은 목록은 직접 나눈다 (세 낱말까지)", () => {
    expect(packingFromMessage("준비물: 선크림 SPF 50, 여권")).toEqual(["선크림 SPF 50", "여권"]);
  });

  it("준비물 제목이 첫 줄이 아니거나 일정이 섞이면 null (AI 추출로 보낸다)", () => {
    expect(packingFromMessage("여권, 우산")).toBeNull();
    expect(packingFromMessage("[다낭 메모]\n준비물: 여권")).toBeNull();
    expect(packingFromMessage("준비물: 여권\n12/10 PR469 08:10 출발")).toBeNull();
    expect(packingFromMessage("준비물: https://example.com/list")).toBeNull();
  });
});

describe("mergePacking", () => {
  it("이미 있는 것은 건너뛰고 새것만 뒤에 더한다", () => {
    const checks = [{ id: "a", label: "여권", done: true }];
    const { next, added } = mergePacking(checks, ["여권", "우산", "우산"], (i) => `n${i}`);
    expect(added).toBe(1);
    expect(next).toEqual([checks[0], { id: "n0", label: "우산", done: false }]);
  });
});
