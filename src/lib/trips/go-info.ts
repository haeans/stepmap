// 매거진 GO 패널(F10)에서 쓰는 계산. 항목 칸(이름·주소·일차·시각·메모)만으로 항공권·숙소·교통 패스 정보를 만든다.

import type { Item } from "@/lib/items/types";
import type { TripDay } from "./days";

// 자주 가는 공항의 한국어 이름
const AIRPORTS: Record<string, string> = {
  ICN: "인천", GMP: "김포", PUS: "김해", CJU: "제주", TAE: "대구", CJJ: "청주",
  KIX: "간사이", ITM: "이타미", NRT: "나리타", HND: "하네다", FUK: "후쿠오카", CTS: "신치토세", NGO: "주부", OKA: "나하",
  HKG: "홍콩", MFM: "마카오", TPE: "타오위안", TSA: "쑹산", KHH: "가오슝", PVG: "푸둥", SHA: "훙차오", PEK: "베이징", PKX: "다싱",
  BKK: "수완나품", DMK: "돈므앙", CNX: "치앙마이", HKT: "푸껫", SGN: "떤선녓", HAN: "노이바이", DAD: "다낭", CXR: "깜란",
  SIN: "창이", MNL: "마닐라", CEB: "세부", KUL: "쿠알라룸푸르", DPS: "발리",
  LAX: "로스앤젤레스", SFO: "샌프란시스코", JFK: "뉴욕 JFK", HNL: "호놀룰루", GUM: "괌", SPN: "사이판",
  LHR: "런던 히스로", CDG: "파리 샤를드골", FRA: "프랑크푸르트", FCO: "로마", BCN: "바르셀로나",
};

export type Flight = { from: string; to: string; fromName: string; toName: string; flightNo: string | null };

// "ICN → KIX", "ICN-KIX", "인천 ICN → 간사이 KIX" 같은 이름에서 공항 코드를 뽑는다. 비행기가 아니면 null.
export function parseFlight(item: Pick<Item, "name" | "address" | "memo">): Flight | null {
  const route = item.name.match(/\b([A-Z]{3})\b[^A-Z]*?(?:→|->|-|–|~|>)[^A-Z]*?\b([A-Z]{3})\b/);
  if (!route) return null;
  const [, from, to] = route;
  const no = `${item.address} ${item.name} ${item.memo}`.match(/\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{2,4})\b/);
  return { from, to, fromName: AIRPORTS[from] ?? from, toName: AIRPORTS[to] ?? to, flightNo: no ? `${no[1]}${no[2]}` : null };
}

// 돌아오는 편: 출발·도착이 뒤집힌 다른 비행기
export function returnFlight(item: Item, transports: Item[]): { item: Item; flight: Flight } | null {
  const f = parseFlight(item);
  if (!f) return null;
  for (const other of transports) {
    if (other.id === item.id) continue;
    const g = parseFlight(other);
    if (g && g.from === f.to && g.to === f.from) return { item: other, flight: g };
  }
  return null;
}

export type Stay = { checkIn: string | null; checkOut: string | null; nights: number | null; next: Item | null };

// 숙소의 체크인은 그 항목의 일차, 체크아웃은 다음 숙소의 일차(없으면 여행 마지막 날)로 본다.
export function stayRange(item: Item, lodgings: Item[], days: TripDay[]): Stay {
  const later = lodgings.filter((l) => l.id !== item.id && l.day > item.day).sort((a, b) => a.day - b.day);
  const next = later[0] ?? null;
  const lastDay = days.length ? days[days.length - 1].day : item.day;
  const outDay = next ? next.day : lastDay;
  const dateOf = (d: number) => days.find((x) => x.day === d)?.date ?? null;
  return { checkIn: dateOf(item.day), checkOut: dateOf(outDay), nights: outDay > item.day ? outDay - item.day : null, next };
}

// 비행기가 아닌 교통은 둘로 나눈다(F16).
// - 교통 패스: 기간 안에 자유롭게 타는 표. 이름에 패스·1일권·프리 같은 말이 있다. 메모의 쉼표·줄바꿈 목록을 탈 수 있는 노선으로 본다.
// - 승차권: 그 밖의 교통. 정해진 구간·시각이 있는 기차·버스·배 표.
const PASS_WORDS = /패스|pass|\d+\s*일권|일일권|자유이용|프리|free|무제한|정기권|티머니|T-?money|교통카드|IC\s?카드/i;

export function isPass(item: Item): boolean {
  return item.kind === "transport" && parseFlight(item) === null && PASS_WORDS.test(item.name);
}

export function isTicket(item: Item): boolean {
  return item.kind === "transport" && parseFlight(item) === null && !PASS_WORDS.test(item.name);
}

export type Ride = { carrier: string; from: string; to: string; bus: boolean };

// "KTX 101 서울→부산", "서울 -> 부산 고속버스" 같은 이름에서 출발·도착을 뽑는다. 화살표가 없으면 null.
// (- 는 "KTX-산천" 같은 이름에 쓰여서 구간 표시로 보지 않는다)
export function parseRide(name: string): Ride | null {
  const m = name.match(/^(.*?)\s*(?:→|->|⇒|~|>)\s*(.+)$/);
  if (!m) return null;
  const left = m[1].trim().split(/\s+/);
  const right = m[2].trim().split(/\s+/);
  const from = left.pop() ?? "";
  const to = right.shift() ?? "";
  if (!from || !to) return null;
  return { carrier: [...left, ...right].join(" "), from, to, bus: /버스|bus/i.test(name) };
}

export function passLines(memo: string): string[] {
  return memo
    .split(/[,，、\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 20);
}
