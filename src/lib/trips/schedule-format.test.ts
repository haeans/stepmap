import { describe, expect, it } from "vitest";
import { resolveFormat } from "./schedule-format";

describe("resolveFormat", () => {
  it("고른 형식이 없으면 PC는 A안, 모바일은 B안", () => {
    expect(resolveFormat(null, true)).toBe("a");
    expect(resolveFormat(null, false)).toBe("b");
  });

  it("고른 형식이 있으면 화면 크기와 상관없이 그 형식", () => {
    expect(resolveFormat("b", true)).toBe("b");
    expect(resolveFormat("a", false)).toBe("a");
  });

  it("저장값이 이상하면 기본값", () => {
    expect(resolveFormat("x", true)).toBe("a");
  });
});
