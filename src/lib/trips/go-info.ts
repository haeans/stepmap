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

// 공항 이름 → 코드 ("인천" → "ICN")
const AIRPORT_CODES: Record<string, string> = Object.fromEntries(Object.entries(AIRPORTS).map(([code, name]) => [name, code]));

// from·to는 공항 코드(알면) 또는 이름 그대로, 이름이 없으면 빈 문자열이다. fromName·toName은 한국어 공항 이름(모르면 from·to).
export type Flight = { from: string; to: string; fromName: string; toName: string; flightNo: string | null };

// 항공권·승차권 나누는 기준 (C9 F26 결정 3). 교통 항목은 아래 중 하나면 비행기(항공권)다.
// ① 화살표 양쪽이 공항 코드: "ICN → KIX", "인천 ICN -> 홍콩 HKG"
// ② 편명(KE723, 7C1301)이나 항공·비행 같은 말이 있고, 기차·버스·배 말(역·열차·KTX·버스 …)이 없다: "KE723 인천 → 간사이"
// ③ 화살표 양쪽이 모두 아는 공항(이름 또는 "○○공항"): "인천 → 간사이", "김포공항 → 제주공항"
// "공항" 한 낱말만으로는 비행기로 보지 않는다(공항철도·공항버스). 그 밖의 교통은 패스 말이 있으면 교통 패스, 아니면 승차권이다.
const CODE_ROUTE = /\b([A-Z]{3})\b[^A-Z]*?(?:→|->|-|–|~|>)[^A-Z]*?\b([A-Z]{3})\b/;
const FLIGHT_NO = /^([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?\d{1,4}$/;
const FLIGHT_WORDS = /항공|비행|flight|airlines?|airways/i;
const GROUND_WORDS = /역|station|열차|기차|철도|신칸센|KTX|SRT|ITX|무궁화|새마을|train|rail|express|버스|bus|터미널|terminal|페리|ferry|배편|선박|크루즈|지하철|metro|subway|택시|taxi/i;
const ARROW = /\s*(?:→|->|⇒|~|>)\s*/;

function routeSides(name: string): { carrier: string; from: string; to: string } {
  const m = name.match(ARROW);
  if (!m || m.index === undefined) return { carrier: name.trim(), from: "", to: "" };
  const words = name.slice(0, m.index).trim().split(/\s+/).filter(Boolean);
  const from = words.pop() ?? "";
  // 도착 쪽은 첫 낱말(공항 이름)만. 뒤에 붙은 터미널(T1) 같은 말은 버린다.
  const to = name.slice(m.index + m[0].length).trim().split(/\s+/)[0] ?? "";
  return { carrier: words.join(" "), from, to };
}

// "간사이", "간사이공항", "간사이 국제공항", "KIX" → 아는 공항이면 코드, 모르면 null
function airportCode(place: string): string | null {
  const text = place.trim();
  if (/^[A-Z]{3}$/.test(text)) return text;
  const bare = text.replace(/\s*(국제)?공항$/, "");
  return AIRPORT_CODES[bare] ?? null;
}

function flightSide(place: string): { code: string; name: string } {
  const code = airportCode(place);
  if (code) return { code, name: AIRPORTS[code] ?? code };
  const bare = place.replace(/\s*(국제)?공항$/, "");
  return { code: bare, name: bare };
}

export function parseFlight(item: Pick<Item, "name" | "address" | "memo">): Flight | null {
  const no = `${item.address} ${item.name} ${item.memo}`.match(/\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{2,4})\b/);
  const flightNo = no ? `${no[1]}${no[2]}` : null;

  const coded = item.name.match(CODE_ROUTE);
  if (coded) {
    const [, from, to] = coded;
    return { from, to, fromName: AIRPORTS[from] ?? from, toName: AIRPORTS[to] ?? to, flightNo };
  }

  const { carrier, from, to } = routeSides(item.name);
  const flightWord = !GROUND_WORDS.test(item.name) && (carrier.split(/\s+/).some((w) => FLIGHT_NO.test(w)) || FLIGHT_WORDS.test(item.name));
  const knownAirports = from !== "" && to !== "" && airportCode(from) !== null && airportCode(to) !== null;
  if (!flightWord && !knownAirports) return null;

  const a = from ? flightSide(from) : { code: "", name: "" };
  const b = to ? flightSide(to) : { code: "", name: "" };
  return { from: a.code, to: b.code, fromName: a.name, toName: b.name, flightNo };
}

export function isFlight(item: Pick<Item, "kind" | "name" | "address" | "memo">): boolean {
  return item.kind === "transport" && parseFlight(item) !== null;
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
  return item.kind === "transport" && !isFlight(item) && PASS_WORDS.test(item.name);
}

export function isTicket(item: Item): boolean {
  return item.kind === "transport" && !isFlight(item) && !PASS_WORDS.test(item.name);
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
