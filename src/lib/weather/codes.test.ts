import { describe, expect, it } from "vitest";
import { clothingTip, isRainy, weatherKind, weatherLabel } from "./codes";

describe("weather codes", () => {
  it("WMO 코드를 종류로", () => {
    expect(weatherKind(0)).toBe("sun");
    expect(weatherKind(2)).toBe("partly");
    expect(weatherKind(3)).toBe("cloud");
    expect(weatherKind(61)).toBe("rain");
    expect(weatherKind(81)).toBe("rain");
    expect(weatherKind(73)).toBe("snow");
    expect(weatherKind(95)).toBe("storm");
    expect(weatherLabel(0)).toBe("맑음");
  });

  it("비 판단은 코드나 강수 확률 60% 이상", () => {
    expect(isRainy({ date: "", code: 61, max: 0, min: 0, rainChance: null })).toBe(true);
    expect(isRainy({ date: "", code: 3, max: 0, min: 0, rainChance: 70 })).toBe(true);
    expect(isRainy({ date: "", code: 3, max: 0, min: 0, rainChance: 20 })).toBe(false);
  });

  it("최저 기온으로 겉옷 안내", () => {
    expect(clothingTip(4)).toBe("두꺼운 겉옷 필요");
    expect(clothingTip(10)).toBe("겉옷 필요");
    expect(clothingTip(22)).toBe("가볍게");
  });
});
