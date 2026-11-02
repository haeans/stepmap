import { describe, expect, it } from "vitest";
import { isPublicPath, safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("사이트 안의 경로는 그대로 돌려준다", () => {
    expect(safeNextPath("/trips/1?tab=map")).toBe("/trips/1?tab=map");
  });

  it("비었거나 외부 주소면 첫 화면으로 보낸다", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
  });
});

describe("isPublicPath", () => {
  it("로그인 화면과 콜백만 공개 경로다", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/loginx")).toBe(false);
    expect(isPublicPath("/trips/1")).toBe(false);
  });
});
