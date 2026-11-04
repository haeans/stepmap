import { describe, expect, it } from "vitest";
import { destinationProblem, parseTitle, parseTripForm } from "./validation";

function form(values: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}

const FULL = { title: "홍콩", destination: "홍콩", startDate: "2026-12-01", endDate: "2026-12-04" };

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

describe("destinationProblem", () => {
  it("글자가 있는 목적지는 통과 (한글·영문·일본어, 숫자가 섞여도)", () => {
    for (const destination of ["홍콩", "일본 교토 오사카", "Kyoto", "東京", "제주 2026"]) {
      expect(destinationProblem(destination)).toBeNull();
    }
  });
});

describe("parseTripForm", () => {
  it("이름·목적지·기간을 읽는다 (동행 인원은 받지 않는다)", () => {
    expect(parseTripForm(form({ ...FULL, companions: "3" }))).toEqual({ ok: true, value: FULL });
  });

  it("목적지가 비면 실패", () => {
    expect(parseTripForm(form({ ...FULL, destination: "  " })).ok).toBe(false);
  });

  it("목적지가 숫자·기호·자음/모음뿐이면 실패", () => {
    for (const destination of ["123", "!!", "ㅁㄴㅇㄹ", "ㅏㅏ 12"]) {
      expect(parseTripForm(form({ ...FULL, destination })).ok).toBe(false);
    }
  });

  it("시작일이나 종료일이 비면 실패", () => {
    expect(parseTripForm(form({ ...FULL, startDate: "" })).ok).toBe(false);
    expect(parseTripForm(form({ ...FULL, endDate: "" })).ok).toBe(false);
    expect(parseTripForm(form({ title: "제주" })).ok).toBe(false);
  });

  it("날짜 형식이 틀리면 실패", () => {
    expect(parseTripForm(form({ ...FULL, startDate: "2026/12/01" })).ok).toBe(false);
  });

  it("끝나는 날이 시작하는 날보다 앞서면 실패, 같은 날은 된다", () => {
    expect(parseTripForm(form({ ...FULL, startDate: "2026-12-04", endDate: "2026-12-01" })).ok).toBe(false);
    expect(parseTripForm(form({ ...FULL, endDate: "2026-12-01" })).ok).toBe(true);
  });
});
