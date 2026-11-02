import { describe, expect, it } from "vitest";
import { averageColor, hueFromText, placeholderCover, toneBackground } from "./tone";

describe("averageColor", () => {
  it("불투명 픽셀의 평균을 낸다", () => {
    expect(averageColor([255, 0, 0, 255, 0, 0, 255, 255])).toEqual({ r: 128, g: 0, b: 128 });
  });

  it("투명 픽셀은 빼고, 다 투명하면 null", () => {
    expect(averageColor([255, 255, 255, 0, 10, 20, 30, 255])).toEqual({ r: 10, g: 20, b: 30 });
    expect(averageColor([1, 2, 3, 0])).toBeNull();
    expect(averageColor([])).toBeNull();
  });
});

describe("toneBackground", () => {
  it("사진 색을 어둡게 누른다", () => {
    expect(toneBackground({ r: 255, g: 255, b: 255 })).toBe("rgb(97, 97, 97)");
    expect(toneBackground({ r: 0, g: 0, b: 0 })).toBe("rgb(8, 8, 8)");
  });
});

describe("hueFromText", () => {
  it("같은 글자는 같은 색상, 범위는 0~359", () => {
    expect(hueFromText("홍콩")).toBe(hueFromText("홍콩"));
    for (const t of ["", "오사카", "Tokyo", "パリ"]) {
      const h = hueFromText(t);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(360);
    }
  });
});

describe("placeholderCover", () => {
  it("SVG data URL을 만든다", () => {
    expect(placeholderCover(200)).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
  });
});
