import { describe, expect, it } from "vitest";
import { parseTitle, parseTripForm } from "./validation";

function form(values: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}

describe("parseTitle", () => {
  it("앞뒤 공백을 지운다", () => {
    expect(parseTitle("  홍콩 3박 4일 ")).toEqual({ ok: true, value: "홍콩 3박 4일" });
  });

  it("비었거나 100자를 넘으면 실패", () => {
    expect(parseTitle("   ").ok).toBe(false);
    expect(parseTitle("가".repeat(101)).ok).toBe(false);
    expect(parseTitle("가".repeat(100)).ok).toBe(true);
  });
});

describe("parseTripForm", () => {
  it("이름만 있으면 나머지는 기본값", () => {
    expect(parseTripForm(form({ title: "제주" }))).toEqual({
      ok: true,
      value: { title: "제주", destination: "", startDate: null, endDate: null, companions: 1 },
    });
  });

  it("모든 칸을 읽는다", () => {
    const result = parseTripForm(
      form({ title: "홍콩", destination: "홍콩", startDate: "2026-12-01", endDate: "2026-12-04", companions: "3" }),
    );
    expect(result).toEqual({
      ok: true,
      value: { title: "홍콩", destination: "홍콩", startDate: "2026-12-01", endDate: "2026-12-04", companions: 3 },
    });
  });

  it("끝나는 날이 시작하는 날보다 앞서면 실패", () => {
    expect(parseTripForm(form({ title: "a", startDate: "2026-12-04", endDate: "2026-12-01" })).ok).toBe(false);
  });

  it("동행 인원은 1~99의 정수", () => {
    expect(parseTripForm(form({ title: "a", companions: "0" })).ok).toBe(false);
    expect(parseTripForm(form({ title: "a", companions: "1.5" })).ok).toBe(false);
    expect(parseTripForm(form({ title: "a", companions: "100" })).ok).toBe(false);
    expect(parseTripForm(form({ title: "a", companions: "99" })).ok).toBe(true);
  });
});
