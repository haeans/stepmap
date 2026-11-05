// C10 F33: 붙여넣은 원문의 여행 기간이 여행과 다르면 맞추자고 묻는다. ([hyunw0000-f33-claude-api] 결정 7)
// 원문이 여행 일부만 담고 있을 수 있어서, 줄이거나 시작일을 옮기는 것은 원문에 "3박 4일"처럼 길이가 적혀 있을 때만 한다.
// 길이가 없으면 원문 날짜·일차가 여행 기간 밖으로 나갈 때 늘리기만 한다. 자동으로 바꾸지 않고 화면에서 묻는다.

import { MAX_DAYS } from "@/lib/trips/days";

export type Period = { startDate: string; endDate: string };

// AI가 원문에서 옮긴 날짜·일차(지시문 규칙상 원문에 있는 값만 들어온다)
export type TextMark = { date: string | null; day: number | null };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NIGHTS_DAYS = /(\d{1,2})\s*박\s*(\d{1,2})\s*일/;
// 원문 날짜가 여행에서 이만큼 넘게 떨어져 있으면 늘리지 않고 옮긴다
const FAR_DAYS = 7;

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function periodLength(p: Period): number {
  return daysBetween(p.startDate, p.endDate) + 1;
}

// "3박 4일" → 4. 박과 일이 맞지 않으면(3박 3일 등) 일을 믿는다.
export function lengthFromText(text: string): number | null {
  const m = text.match(NIGHTS_DAYS);
  if (!m) return null;
  const days = Number(m[2]);
  return days >= 1 && days <= MAX_DAYS ? days : null;
}

function validDate(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) === iso ? iso : null;
}

// 원문에 적힌 날짜를 코드로 읽는다. AI는 여행 기간 밖 날짜를 버릴 때가 있어서(2월 여행에 "11/20" → null) 따로 읽는다.
// "2026년 11월 21일", "2026-11-20", "2026.11.20", "11/20", "11월 21일".
// 연도가 없으면: 여행 기간 앞뒤 일주일 안에 들어가는 해가 있으면 그 해, 아니면 오늘 기준 다가오는 날짜(한 달 전까지는 지난 날짜도 그 해).
export function datesFromText(text: string, trip: { startDate: string | null; endDate: string | null }, today: string): string[] {
  const found: string[] = [];
  const tripStart = trip.startDate;
  const tripEnd = trip.endDate && tripStart && trip.endDate >= tripStart ? trip.endDate : tripStart;
  const refYear = Number((tripStart ?? today).slice(0, 4));
  const since = addDays(today, -30);
  const rest = text.replace(/(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})\s*일?/g, (_, y, m, d) => {
    const iso = validDate(Number(y), Number(m), Number(d));
    if (iso) found.push(iso);
    return " ";
  });
  for (const match of rest.matchAll(/(?<![\d,.])(\d{1,2})\s*(?:\/|월\s*)(\d{1,2})(?!\s*[\d:])/g)) {
    const [m, d] = [Number(match[1]), Number(match[2])];
    const options = [refYear - 1, refYear, refYear + 1, refYear + 2].map((y) => validDate(y, m, d)).filter((x): x is string => !!x);
    const nearTrip =
      tripStart && tripEnd ? options.find((x) => x >= addDays(tripStart, -FAR_DAYS) && x <= addDays(tripEnd, FAR_DAYS)) : undefined;
    const upcoming = [today.slice(0, 4), String(Number(today.slice(0, 4)) + 1)]
      .map((y) => validDate(Number(y), m, d))
      .find((x): x is string => !!x && x >= since);
    const pick = nearTrip ?? upcoming;
    if (pick) found.push(pick);
  }
  return [...new Set(found)].sort();
}

export function detectPeriod(
  text: string,
  trip: { startDate: string | null; endDate: string | null },
  marks: TextMark[],
  today: string = new Date().toISOString().slice(0, 10),
): Period | null {
  const length = lengthFromText(text);
  const aiDates = marks.map((m) => m.date).filter((d): d is string => !!d && DATE_RE.test(d));
  const dates = [...new Set([...aiDates, ...datesFromText(text, trip, today)])].sort();
  // 날짜와 일차가 함께 있는 항목이 있으면 그걸로 원문 1일차 날짜를 안다(예: "2일차 11/21" → 11/20).
  const anchored = marks.find((m) => m.date && DATE_RE.test(m.date) && m.day && m.day >= 1);
  const maxDay = Math.max(0, ...marks.map((m) => (m.day && Number.isFinite(m.day) ? m.day : 0)));
  const tripStart = trip.startDate;
  const tripEnd = trip.endDate && tripStart && trip.endDate >= tripStart ? trip.endDate : tripStart;

  let start: string | null;
  let end: string | null;
  if (length) {
    // 길이가 적혀 있으면 원문 기준으로 시작일·종료일을 정한다.
    start = anchored ? addDays(anchored.date!, -(anchored.day! - 1)) : (dates[0] ?? tripStart);
    if (!start) return null;
    end = addDays(start, length - 1);
    if (dates.length && dates.at(-1)! > end) end = dates.at(-1)!; // 길이보다 뒤 날짜가 있으면 날짜를 믿는다
  } else if (tripStart && tripEnd && dates.length && (daysBetween(dates.at(-1)!, tripStart) > FAR_DAYS || daysBetween(tripEnd, dates[0]) > FAR_DAYS)) {
    // 원문 날짜가 여행과 일주일 넘게 떨어져 있으면(2월 여행에 11월 원문) 길이를 지키며 원문 날짜로 옮긴다. 가까우면 아래처럼 늘린다.
    start = dates[0];
    const keep = addDays(start, daysBetween(tripStart, tripEnd));
    end = dates.at(-1)! > keep ? dates.at(-1)! : keep;
  } else {
    // 길이가 없고 겹치면 늘리기만 한다(원문이 여행 일부일 수 있음).
    start = [tripStart, dates[0]].filter((d): d is string => !!d).sort()[0] ?? null;
    if (!start) return null;
    const candidates = [tripEnd, dates.at(-1), maxDay ? addDays(tripStart ?? start, maxDay - 1) : null].filter((d): d is string => !!d);
    end = candidates.sort().at(-1) ?? start;
  }

  if (daysBetween(start, end) + 1 > MAX_DAYS) return null;
  if (start === tripStart && end === tripEnd) return null;
  return { startDate: start, endDate: end };
}

// 사용자가 고를 수 있는 바꾸기: 날짜·기간 모두 / 날짜만(길이 유지) / 기간만(시작일 유지).
// 지금 여행과 같거나 앞 선택지와 같은 것은 뺀다. 날짜가 없던 여행은 "모두"만 있다.
export type PeriodChoice = { key: "both" | "date" | "length"; period: Period };

export function periodChoices(to: Period, current: { startDate: string | null; endDate: string | null }): PeriodChoice[] {
  const choices: PeriodChoice[] = [{ key: "both", period: to }];
  const start = current.startDate;
  if (start) {
    const end = current.endDate && current.endDate >= start ? current.endDate : start;
    const curLen = periodLength({ startDate: start, endDate: end });
    const toLen = periodLength(to);
    choices.push({ key: "date", period: { startDate: to.startDate, endDate: addDays(to.startDate, curLen - 1) } });
    choices.push({ key: "length", period: { startDate: start, endDate: addDays(start, toLen - 1) } });
  }
  const seen = new Set<string>([`${current.startDate}~${current.endDate && start && current.endDate >= start ? current.endDate : start}`]);
  return choices.filter((c) => {
    const id = `${c.period.startDate}~${c.period.endDate}`;
    if (seen.has(id) || periodLength(c.period) > MAX_DAYS) return false;
    seen.add(id);
    return true;
  });
}

// 기간을 바꿀 때 저장된 일정을 옮길 일차 수.
// 원래 기간과 새 기간이 겹치면 날짜를 지킨다(11/21 일정은 기간이 바뀌어도 11/21).
// 겹치지 않으면(2월 여행을 11월로 옮김) 날짜를 지킬 수 없으니 DAY 번호를 지킨다(1일차는 계속 1일차). 날짜가 없던 여행도 그대로.
export function shiftForPeriod(oldPeriod: { startDate: string | null; endDate: string | null }, next: Period): number {
  const oldStart = oldPeriod.startDate;
  if (!oldStart) return 0;
  const oldEnd = oldPeriod.endDate && oldPeriod.endDate >= oldStart ? oldPeriod.endDate : oldStart;
  const overlaps = next.startDate <= oldEnd && next.endDate >= oldStart;
  return overlaps ? daysBetween(next.startDate, oldStart) : 0;
}
