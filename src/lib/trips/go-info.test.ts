import { describe, expect, it } from "vitest";
import type { Item } from "@/lib/items/types";
import { isFlight, isMoveTransport, isPass, isTicket, parseFlight, parseRide, passLines, stayRange, transportKind } from "./go-info";

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

  // regression C8-1: 한글 공항 이름·편명으로 들어온 비행기가 승차권으로 나오던 문제 (C9 F26 결정 3)
  it("편명 + 한글 공항 이름도 비행기", () => {
    expect(parseFlight(item({ name: "KE723 인천 → 간사이" }))).toEqual({ from: "ICN", to: "KIX", fromName: "인천", toName: "간사이", flightNo: "KE723" });
    expect(parseFlight(item({ name: "KE081 인천 → JFK" }))).toMatchObject({ from: "ICN", to: "JFK", flightNo: "KE081" });
    expect(parseFlight(item({ name: "KE1101 김포 → 김해" }))).toMatchObject({ from: "GMP", to: "PUS", flightNo: "KE1101" });
    expect(parseFlight(item({ name: "7C1301 인천→오사카" }))).toMatchObject({ from: "ICN", to: "오사카", toName: "오사카" });
    expect(parseFlight(item({ name: "대한항공 인천 → 오사카" }))).toMatchObject({ from: "ICN", to: "오사카" });
  });
  it("편명이 없어도 양쪽이 아는 공항이면 비행기", () => {
    expect(parseFlight(item({ name: "인천 → 간사이" }))).toMatchObject({ from: "ICN", to: "KIX" });
    expect(parseFlight(item({ name: "김포공항 → 제주공항" }))).toMatchObject({ from: "GMP", to: "CJU" });
  });
  it("기차·버스·공항철도는 비행기가 아니다", () => {
    expect(parseFlight(item({ name: "KTX 101 서울→부산" }))).toBeNull();
    expect(parseFlight(item({ name: "공항철도 서울역 -> 인천공항 T1" }))).toBeNull();
    expect(parseFlight(item({ name: "G1234 상하이 → 베이징 열차" }))).toBeNull();
    expect(parseFlight(item({ name: "인천공항 → 서울역 공항버스" }))).toBeNull();
    expect(parseFlight(item({ name: "서울 → 부산" }))).toBeNull();
  });
});

describe("isFlight", () => {
  it("교통 항목만 비행기가 될 수 있다", () => {
    expect(isFlight(item({ name: "KE723 인천 → 간사이" }))).toBe(true);
    expect(isFlight(item({ kind: "lodging", name: "ICN → KIX" }))).toBe(false);
    expect(isTicket(item({ name: "KE723 인천 → 간사이" }))).toBe(false);
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

describe("교통 나누기 (C10 F30)", () => {
  const kind = (name: string) => transportKind(item({ name }));
  it("기간권·1일 승차권은 패스 (도쿄 테스트)", () => {
    expect(kind("도쿄 서브웨이 티켓 72시간권")).toBe("pass");
    expect(kind("Tokyo Subway Ticket 72-hour")).toBe("pass");
    expect(kind("교토 버스 1일 승차권")).toBe("pass");
    expect(kind("지하철 1일권")).toBe("pass");
    expect(kind("간사이 레일패스 2일권")).toBe("pass");
    expect(kind("JR 패스 7일권")).toBe("pass");
  });
  it("이름에 기간이 없으면 메모의 기간권 낱말을 본다", () => {
    expect(transportKind(item({ name: "도쿄 서브웨이 티켓", memo: "72시간권, 메트로와 도에이선 이용 가능" }))).toBe("pass");
    expect(transportKind(item({ name: "신칸센 노조미 23호", memo: "JR 패스로 탑승" }))).toBe("ticket");
    expect(transportKind(item({ name: "KTX 101 서울→부산", memo: "자유이용 아님" }))).toBe("ticket");
  });
  it("교통카드는 패스도 승차권도 아니다", () => {
    expect(kind("ICOCA")).toBe("card");
    expect(kind("ICOCA 충전")).toBe("card");
    expect(kind("스이카 충전")).toBe("card");
    expect(kind("티머니 교통카드")).toBe("card");
  });
  it("화살표가 있으면 패스 낱말이 있어도 이동", () => {
    expect(kind("JR 패스 도쿄→교토")).toBe("ticket");
    expect(kind("프리미엄 고속버스 서울→부산")).toBe("ticket");
  });
  it("택시·렌터카·리무진·지하철 1회는 개인 교통", () => {
    expect(kind("택시")).toBe("personal");
    expect(kind("택시 호텔→하네다공항")).toBe("personal");
    expect(kind("렌터카")).toBe("personal");
    expect(kind("공항 리무진버스")).toBe("personal");
    expect(kind("지하철 신주쿠→시부야")).toBe("personal");
  });
  it("화살표 없는 열차 이름도 승차권, 비행기는 항공권", () => {
    expect(kind("신칸센 노조미 23호")).toBe("ticket");
    expect(kind("나리타 익스프레스 나리타공항→도쿄")).toBe("ticket");
    expect(kind("KE723 ICN→NRT")).toBe("flight");
    expect(transportKind(item({ kind: "lodging", name: "호텔" }))).toBeNull();
  });
  it("하루 일정의 이동: 항공권·승차권·개인 교통만", () => {
    expect(isMoveTransport(item({ name: "택시 호텔→하네다공항" }))).toBe(true);
    expect(isMoveTransport(item({ name: "KTX 101 서울→부산" }))).toBe(true);
    expect(isMoveTransport(item({ name: "도쿄 서브웨이 티켓 72시간권" }))).toBe(false);
    expect(isMoveTransport(item({ name: "ICOCA 충전" }))).toBe(false);
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

describe("비행기: 출발지 없는 편명·화살표 없는 공항 (C10 F33)", () => {
  it("편명이 출발지 자리에 있으면 도착 공항만 있는 비행기", () => {
    expect(parseFlight(item({ name: "MM702 →KIX" }))).toMatchObject({ from: "", to: "KIX", toName: "간사이", flightNo: "MM702" });
  });
  it("화살표 없이 공항 + 출발·도착 말", () => {
    expect(parseFlight(item({ name: "KIX 간사이공항 출발" }))).toMatchObject({ from: "KIX", to: "" });
    expect(parseFlight(item({ name: "간사이공항 도착" }))).toMatchObject({ from: "", to: "KIX" });
    expect(parseFlight(item({ name: "간사이공항 공항철도 출발" }))).toBeNull();
    expect(parseFlight(item({ name: "간사이공항 출발 도착" }))).toBeNull();
  });
  it("공항 목록에 없는 공항도 알아본다(코드·○○공항·Airport)", () => {
    expect(parseFlight(item({ name: "TP1234 →LIS" }))).toMatchObject({ from: "", to: "LIS", toName: "LIS", flightNo: "TP1234" });
    expect(parseFlight(item({ name: "LIS 리스본공항 출발" }))).toMatchObject({ from: "LIS", fromName: "리스본" });
    expect(parseFlight(item({ name: "치앙라이 국제공항 도착" }))).toMatchObject({ from: "", to: "치앙라이", toName: "치앙라이" });
    expect(parseFlight(item({ name: "Lisbon Airport departure" }))).toMatchObject({ from: "Lisbon", fromName: "Lisbon" });
    expect(parseFlight(item({ name: "KTX 부산역 출발" }))).toBeNull();
  });
});
