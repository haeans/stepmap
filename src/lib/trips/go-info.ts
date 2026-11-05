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
  // "MM702 →KIX"처럼 출발지 없이 편명만 있으면 편명은 출발지가 아니다(C10 F33).
  const from = words.length && !FLIGHT_NO.test(words.at(-1)!) ? (words.pop() ?? "") : "";
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

// 화살표가 없고, 아는 공항(코드나 "○○공항") 하나와 출발·도착 말이 있으면 그쪽 공항만 있는 비행기로 본다.
// 기차·버스 말이 있으면(공항철도·공항버스) 보지 않는다.
const DEPART_WORDS = /출발|departure|depart/i;
const ARRIVE_WORDS = /도착|arrival|arrive/i;

// 공항 목록(AIRPORTS)에 없는 공항도 글 모양으로 알아본다: 3글자 대문자 코드, "○○공항"·"○○ 국제공항"·"○○ Airport".
// 목록은 한국어 이름으로 바꿔 보이는 데만 쓰고, 없으면 원문의 이름·코드를 그대로 쓴다.
const NAMED_AIRPORT = /([^\s()[\]·,]+?)\s*(?:국제\s*)?공항|([A-Za-z][A-Za-z .'-]*?)\s+(?:International\s+)?Airport\b/i;

function singleAirport(name: string): Omit<Flight, "flightNo"> | null {
  if (ARROW.test(name) || GROUND_WORDS.test(name)) return null;
  const depart = DEPART_WORDS.test(name);
  const arrive = ARRIVE_WORDS.test(name);
  if (depart === arrive) return null;
  const code = name.match(/\b[A-Z]{3}\b/)?.[0];
  const named = name.match(NAMED_AIRPORT);
  const label = named ? (named[1] ?? named[2]).trim() : null;
  if (!code && !label) return null;
  // 코드가 있으면 코드(목록에 있으면 한국어 이름), 없으면 적힌 이름(목록에 있으면 그 코드)
  const side = code
    ? { code, name: AIRPORTS[code] ?? label ?? code }
    : { code: airportCode(label!) ?? label!, name: AIRPORTS[airportCode(label!) ?? ""] ?? label! };
  const none = { code: "", name: "" };
  const [a, b] = depart ? [side, none] : [none, side];
  return { from: a.code, to: b.code, fromName: a.name, toName: b.name };
}

export function parseFlight(item: Pick<Item, "name" | "address" | "memo">): Flight | null {
  const no = `${item.address} ${item.name} ${item.memo}`.match(/\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{2,4})\b/);
  const flightNo = no ? `${no[1]}${no[2]}` : null;

  const coded = item.name.match(CODE_ROUTE);
  if (coded) {
    const [, from, to] = coded;
    return { from, to, fromName: AIRPORTS[from] ?? from, toName: AIRPORTS[to] ?? to, flightNo };
  }

  // ④ 화살표 없이 공항 하나와 출발·도착 말: "KIX 간사이공항 출발", "간사이공항 도착" (C10 F33)
  const single = singleAirport(item.name);
  if (single) return { ...single, flightNo };

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

// 교통 항목 나누기 (F16, C10 F30). GO 줄에는 예약·구매한(할) 표만 들어간다: 항공권·승차권·교통 패스.
// 이름으로 아래 순서대로 본다.
// ① 항공권: isFlight (B153)
// ② 교통카드(card): ICOCA·Suica·티머니 같은 충전식 카드. 표가 아니라 결제 수단이라 GO에 없고 이동도 아니다.
// ③ 교통 패스(pass): 정해진 구간 없이 기간·횟수 안에 타는 표(패스·N일권·N시간권·1일 승차권·자유이용·무제한·정기권).
//    이름에 없으면 메모의 기간권 낱말(72시간권 등)도 본다.
//    화살표(출발→도착)가 있으면 그 패스로 탄 하루 이동이라 패스가 아니다("JR 패스 도쿄→교토"는 승차권).
//    "프리" 한 낱말은 보지 않는다("프리미엄 고속버스"). 프리패스는 "패스"로 잡힌다.
// ④ 개인 교통(personal): 택시·렌터카·리무진·우버·픽업, 지하철·시내버스 1회 탑승. 예약하는 표가 아니라 GO에 없다. 일정에서는 이동이다.
// ⑤ 승차권(ticket): 그 밖의 교통. 정해진 구간·시각이 있는 기차·버스·배 표(화살표가 없어도 승차권, "신칸센 노조미 23호").
// 교통 패스는 메모의 쉼표·줄바꿈 목록을 탈 수 있는 노선으로 본다.
const CARD_WORDS =
  /교통\s?카드|IC\s?카드|티머니|T-?money|캐시비|cashbee|ICOCA|이코카|Suica|스이카|PASMO|파스모|Kitaca|manaca|TOICA|SUGOCA|nimoca|Octopus|옥토퍼스|EZ-?Link|이지링크|Oyster|오이스터|EasyCard|이지카드|悠遊卡/i;
const PASS_WORDS =
  /패스|pass|\d+\s*(?:일|시간)\s*(?:권|승차권|이용권)|일일\s?(?:권|승차권)|\d+\s*-?\s*(?:day|hour)s?\b|\b\d+\s?h\b|자유\s?이용|무제한|unlimited|정기권/i;
// 이름에 기간이 없고 메모에만 있을 때("도쿄 서브웨이 티켓" + 메모 "72시간권, …") 보는 기간권 낱말.
// "패스"는 메모에서 보지 않는다("JR 패스로 탑승"처럼 패스로 탄 승차권 메모가 있어서).
const PERIOD_WORDS =
  /\d+\s*(?:일|시간)\s*(?:권|승차권|이용권)|일일\s?(?:권|승차권)|\d+\s*-?\s*(?:day|hour)s?\s*(?:pass|ticket)|자유\s?이용|무제한|unlimited/i;
const PERSONAL_WORDS =
  /택시|taxi|렌터카|렌트카|rent-?a-?car|car\s?rental|rental\s?car|리무진|limousine|우버|uber|그랩|grab|픽업|pick-?up|샌딩|지하철|subway|metro|메트로|시내\s?버스|city\s?bus|도보|걸어서/i;

export type TransportKind = "flight" | "card" | "pass" | "personal" | "ticket";

export function transportKind(item: Pick<Item, "kind" | "name" | "address" | "memo">): TransportKind | null {
  if (item.kind !== "transport") return null;
  if (isFlight(item)) return "flight";
  if (CARD_WORDS.test(item.name)) return "card";
  const routed = parseRide(item.name) !== null;
  if (!routed && (PASS_WORDS.test(item.name) || PERIOD_WORDS.test(item.memo))) return "pass";
  if (PERSONAL_WORDS.test(item.name)) return "personal";
  return "ticket";
}

export function isPass(item: Item): boolean {
  return transportKind(item) === "pass";
}

export function isTicket(item: Item): boolean {
  return transportKind(item) === "ticket";
}

// 하루 일정·지도 거점에서 이동으로 치는 교통: 항공권·승차권·개인 교통 (패스·교통카드는 아님)
export function isMoveTransport(item: Item): boolean {
  const kind = transportKind(item);
  return kind === "flight" || kind === "ticket" || kind === "personal";
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
