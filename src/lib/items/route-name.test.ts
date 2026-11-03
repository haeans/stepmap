import { describe, expect, it } from "vitest";
import { parseFlight } from "@/lib/trips/go-info";
import { joinRoute, splitRoute } from "./route-name";

describe("joinRoute", () => {
  it("편명과 출발·도착을 합친다", () => {
    expect(joinRoute({ carrier: "KE123", from: "ICN", to: "KIX" })).toBe("KE123 ICN → KIX");
  });
  it("편명만 있으면 편명만", () => {
    expect(joinRoute({ carrier: " JR 패스 ", from: "", to: "" })).toBe("JR 패스");
  });
  it("출발·도착만 있어도 된다", () => {
    expect(joinRoute({ carrier: "", from: "서울역", to: "인천공항" })).toBe("서울역 → 인천공항");
    expect(joinRoute({ carrier: "", from: "", to: "KIX" })).toBe("→ KIX");
  });
  it("모두 비면 빈 문자열", () => {
    expect(joinRoute({ carrier: " ", from: "", to: "" })).toBe("");
  });
  it("합친 이름을 GO 패널이 항공편으로 읽는다", () => {
    const name = joinRoute({ carrier: "KE123", from: "ICN", to: "KIX" });
    expect(parseFlight({ name, address: "", memo: "" })).toMatchObject({ from: "ICN", to: "KIX", flightNo: "KE123" });
  });
});

describe("splitRoute", () => {
  it("합친 이름을 다시 나눈다", () => {
    expect(splitRoute("KE123 ICN → KIX")).toEqual({ carrier: "KE123", from: "ICN", to: "KIX" });
    expect(splitRoute("공항철도 서울역 -> 인천공항 T1")).toEqual({ carrier: "공항철도", from: "서울역", to: "인천공항 T1" });
  });
  it("화살표가 없으면 전부 편명", () => {
    expect(splitRoute("JR 패스")).toEqual({ carrier: "JR 패스", from: "", to: "" });
  });
  it("편명 없이 출발·도착만", () => {
    expect(splitRoute("ICN → KIX")).toEqual({ carrier: "", from: "ICN", to: "KIX" });
  });
});
