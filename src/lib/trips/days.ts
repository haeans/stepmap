// 여행 기간으로 일차 목록을 만든다. 날짜가 없으면 1일차 하나만 둔다.

export type TripDay = { day: number; date: string | null };

export const MAX_DAYS = 60;

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function tripDays(startDate: string | null, endDate: string | null): TripDay[] {
  if (!startDate) return [{ day: 1, date: null }];
  const end = endDate && endDate >= startDate ? endDate : startDate;

  const days: TripDay[] = [];
  for (let i = 0; i < MAX_DAYS; i++) {
    const date = addDays(startDate, i);
    if (date > end) break;
    days.push({ day: i + 1, date });
  }
  return days;
}
