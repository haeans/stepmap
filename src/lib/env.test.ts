import { describe, expect, it } from "vitest";
import { requireEnv } from "./env";

describe("requireEnv", () => {
  it("값이 있으면 그대로 돌려준다", () => {
    expect(requireEnv("X", "abc")).toBe("abc");
  });

  it("값이 없으면 변수 이름을 담아 실패한다", () => {
    expect(() => requireEnv("NEXT_PUBLIC_SUPABASE_URL", undefined)).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL",
    );
    expect(() => requireEnv("X", "")).toThrow();
  });
});
