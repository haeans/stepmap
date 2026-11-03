import { describe, expect, it } from "vitest";
import type { Item } from "@/lib/items/types";
import { isPass, isTicket, parseFlight, parseRide, passLines, returnFlight, stayRange } from "./go-info";

function item(over: Partial<Item>): Item {
  return {
    id: "x", trip_id: "t", day: 1, time: null, position: 0, kind: "transport", name: "", address: "", lat: null, lng: null,
    memo: "", link: "", cost_amount: null, cost_currency: null, source: "manual", created_at: "", updated_at: "", ...over,
  };
}

const days = [1, 2, 3, 4].map((d) => ({ day: d, date: `2026-12-0${d + 2}` }));

describe("parseFlight", () => {
  it("이름의 공항 코드와 편명을 뽑는다", () => {
    expect(parseFlight(item({ name: "ICN → KIX", address: "KE723" }))).toEqual({ from: "ICN", to: "KIX", fromName: "인천", toName: "간사이", flightNo: "KE723" });
    expect(parseFlight(item({ name: "KE 724 KIX-ICN" }))?.flightNo).toBe("KE724");
    expect(parseFlight(item({ name: "인천 ICN -> 홍콩 HKG", memo: "CX411" }))).toMatchObject({ from: "ICN", to: "HKG", toName: "홍콩", flightNo: "CX411" });
  });

  it("비행기가 아니면 null", () => {
    expect(parseFlight(item({ name: "간사이 레일패스 2일권" }))).toBeNull();
  });
});

describe("returnFlight", () => {
  it("출발·도착이 뒤집힌 편을 찾는다", () => {
    const go = item({ id: "a", name: "ICN → KIX" });
    const back = item({ id: "b", name: "KIX → ICN", day: 4 });
    expect(returnFlight(go, [go, back])?.item.id).toBe("b");
    expect(returnFlight(go, [go])).toBeNull();
  });
});

describe("stayRange", () => {
  it("체크아웃은 다음 숙소의 일차, 없으면 여행 마지막 날", () => {
    const a = item({ id: "a", kind: "lodging", day: 1 });
    const b = item({ id: "b", kind: "lodging", day: 3 });
    expect(stayRange(a, [a, b], days)).toEqual({ checkIn: "2026-12-03", checkOut: "2026-12-05", nights: 2, next: b });
    expect(stayRange(b, [a, b], days)).toEqual({ checkIn: "2026-12-05", checkOut: "2026-12-06", nights: 1, next: null });
  });
});

describe("교통 패스", () => {
  it("이름에 패스·1일권 같은 말이 있는 교통 항목이 패스, 메모를 노선 목록으로", () => {
    expect(isPass(item({ name: "간사이 레일패스" }))).toBe(true);
    expect(isPass(item({ name: "부산 도시철도 1일권" }))).toBe(true);
    expect(isPass(item({ name: "KTX 101 서울→부산" }))).toBe(false);
    expect(isPass(item({ name: "ICN → KIX" }))).toBe(false);
    expect(isPass(item({ kind: "lodging", name: "호텔" }))).toBe(false);
    expect(passLines("JR 교토선, 한큐 교토선\n오사카 메트로")).toEqual(["JR 교토선", "한큐 교토선", "오사카 메트로"]);
  });
});

describe("승차권", () => {
  it("패스도 비행기도 아닌 교통 항목", () => {
    expect(isTicket(item({ name: "KTX 101 서울→부산" }))).toBe(true);
    expect(isTicket(item({ name: "간사이 레일패스" }))).toBe(false);
    expect(isTicket(item({ name: "ICN → KIX" }))).toBe(false);
    expect(isTicket(item({ kind: "lodging", name: "호텔" }))).toBe(false);
  });
  it("이름에서 출발·도착과 열차·버스 이름을 뽑는다", () => {
    expect(parseRide("KTX 101 서울→부산")).toEqual({ carrier: "KTX 101", from: "서울", to: "부산", bus: false });
    expect(parseRide("동서울 -> 속초 고속버스")).toEqual({ carrier: "고속버스", from: "동서울", to: "속초", bus: true });
    expect(parseRide("KTX-산천 부산")).toBeNull();
  });
});
