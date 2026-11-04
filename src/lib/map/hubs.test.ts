import { describe, expect, it } from "vitest";
import type { Item } from "@/lib/items/types";
import { hubQueries, hubQuery, hubTargets, MAX_HUB_ITEMS } from "./hubs";

function item(over: Partial<Item>): Item {
  return {
    id: "x",
    trip_id: "t",
    day: 1,
    time: null,
    position: 0,
    kind: "transport",
    name: "",
    address: "",
    lat: null,
    lng: null,
    memo: "",
    link: "",
    cost_amount: null,
    cost_currency: null,
    source: "manual",
    created_at: "",
    updated_at: "",
    ...over,
  };
}

describe("hubQuery", () => {
  it("공항·역·터미널을 붙이고, 이미 붙어 있으면 그대로", () => {
    expect(hubQuery("ICN", "airport")).toBe("ICN 공항");
    expect(hubQuery("인천공항", "airport")).toBe("인천공항");
    expect(hubQuery("서울", "station")).toBe("서울 역");
    expect(hubQuery("서울역", "station")).toBe("서울역");
    expect(hubQuery("동서울", "terminal")).toBe("동서울 터미널");
  });
  it("영문·숫자 2자 이하(T1 등)는 찾지 않고, 한글 2자는 찾는다", () => {
    expect(hubQuery("T1", "station")).toBeNull();
    expect(hubQuery("A", "airport")).toBeNull();
    expect(hubQuery("", "airport")).toBeNull();
    expect(hubQuery("인천", "airport")).toBe("인천 공항");
  });
});

describe("hubQueries", () => {
  it("입력창 형식의 비행기", () => {
    expect(hubQueries(item({ name: "KE123 ICN → KIX" }))).toEqual({ mode: "flight", kind: "airport", from: "ICN 공항", to: "KIX 공항" });
  });
  it("AI 추출 형식의 비행기(한글 도시, 화살표 앞뒤 공백 없음)는 편명으로 비행기로 안다", () => {
    expect(hubQueries(item({ name: "KE123 인천→홍콩" }))).toEqual({ mode: "flight", kind: "airport", from: "인천 공항", to: "홍콩 공항" });
  });
  it("기차는 역", () => {
    expect(hubQueries(item({ name: "KTX 101 서울→부산" }))).toEqual({ mode: "transport", kind: "station", from: "서울 역", to: "부산 역" });
  });
  it("공항철도는 이름에 공항이 있어도 기차이고, 출발지 T1은 거른다", () => {
    expect(hubQueries(item({ name: "공항철도 서울역 -> 인천공항 T1" }))).toEqual({ mode: "transport", kind: "station", from: "서울역", to: "인천공항 T1 역" });
    expect(hubQueries(item({ name: "인천공항 T1 → 서울역" }))).toEqual({ mode: "transport", kind: "station", from: null, to: "서울역" });
  });
  it("도착지 뒤에 교통 이름이 붙으면 splitRoute 결과를 그대로 터미널로 찾는다", () => {
    expect(hubQueries(item({ name: "동서울 -> 속초 고속버스" }))).toEqual({ mode: "transport", kind: "terminal", from: "동서울 터미널", to: "속초 고속버스 터미널" });
  });
  it("교통 패스·화살표 없는 이름·교통이 아닌 항목은 거점이 없다", () => {
    expect(hubQueries(item({ name: "간사이 레일패스" }))).toBeNull();
    expect(hubQueries(item({ name: "JR 교토선" }))).toBeNull();
    expect(hubQueries(item({ kind: "lodging", name: "A → B" }))).toBeNull();
    expect(hubQueries(item({ name: "T1 → T2" }))).toBeNull();
  });
});

describe("hubTargets", () => {
  it("일정 순서로 앞 20개만", () => {
    const items = Array.from({ length: 25 }, (_, i) => item({ id: `t${i}`, day: 25 - i, name: "KTX 서울 → 부산" }));
    const targets = hubTargets(items);
    expect(targets).toHaveLength(MAX_HUB_ITEMS);
    expect(targets[0].item.day).toBe(1);
  });
});
