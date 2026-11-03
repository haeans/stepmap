// 리스트 탭(F11)의 짧은 날짜: "2026-11-20" → "11.20 (금)". 날짜가 아니면 빈 문자열.

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function formatShortDate(isoDate: string | null): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "";
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return `${isoDate.slice(5, 7)}.${isoDate.slice(8, 10)} (${WEEKDAYS[date.getUTCDay()]})`;
}

// 여행 기간: "11.20 (금) – 11.23 (월)". 날짜가 없으면 "날짜 미정".
export function formatShortPeriod(start: string | null, end: string | null): string {
  const s = formatShortDate(start);
  const e = formatShortDate(end);
  if (s && e && s !== e) return `${s} – ${e}`;
  return s || e || "날짜 미정";
}
