// AI 추출 결과를 항목 입력값(ItemInput) 모양으로 다듬는다. (B15, B16)
// 저장할 때는 미리보기에서 고친 값으로 validation.ts 검사를 다시 거친다.
// F18: 원문에 일차·시각이 없으면 AI 추천값을 쓰고 "추천"으로 표시한다. 추천도 없으면 일정이 가장 적은 날을 추천한다.
// (B16의 "모르면 DAY 1"은 없앤다. [hyunw0000-f18-ai-suggest] 결정 1)

import { MAX_DAYS } from "@/lib/trips/days";
import { CURRENCIES, ITEM_KINDS, type ItemKind } from "@/lib/items/types";
import type { ItemInput } from "@/lib/items/validation";

export const MAX_TEXT_LENGTH = 5000;
export const MAX_ITEMS = 30;

export type RawItem = {
  kind: string;
  date: string | null; // "YYYY-MM-DD"
  day: number | null;
  time: string | null;
  name: string;
  address: string;
  memo: string;
  link: string;
  cost_amount: number | null;
  cost_currency: string | null;
  // F18: 원문에 일차·시각이 없을 때 AI가 추천한 값과 짧은 이유
  suggested_day?: number | null;
  suggested_time?: string | null;
  reason?: string;
};

// 추천이 들어간 항목. day·time 중 어느 것이 추천값인지와 이유를 함께 갖는다.
export type Suggestion = { day: boolean; time: boolean; reason: string };
export type ExtractedItem = ItemInput & { suggest: Suggestion | null };

// 추천을 고를 때 쓰는 여행 정보. dayCount: 고를 수 있는 일차 수, busy: 일차별 이미 있는 일정 수
export type SuggestContext = { startDate: string | null; dayCount: number; busy: Record<number, number> };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)/;
const FALLBACK_REASON = "일정이 가장 적은 날이라 추천했습니다.";

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function clampDay(day: number, max = MAX_DAYS): number {
  return Math.min(Math.max(Math.trunc(day), 1), max);
}

// 원문에서 알 수 있는 일차. 날짜가 있고 여행 시작일을 알면 날짜로, 아니면 원문의 "N일차". 모르면 null.
export function toDay(raw: Pick<RawItem, "date" | "day">, startDate: string | null): number | null {
  if (raw.date && DATE_RE.test(raw.date) && startDate) return clampDay(daysBetween(startDate, raw.date) + 1);
  if (raw.day !== null && Number.isFinite(raw.day)) return clampDay(raw.day);
  return null;
}

export function toTime(raw: string | null | undefined): string | null {
  const m = raw?.trim().match(TIME_RE);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
}

// 일정이 가장 적은 날(같으면 앞날)
export function leastBusyDay(busy: Record<number, number>, dayCount: number): number {
  let best = 1;
  for (let d = 2; d <= dayCount; d++) if ((busy[d] ?? 0) < (busy[best] ?? 0)) best = d;
  return best;
}

function clip(value: string, max: number): string {
  return value.trim().slice(0, max);
}

// 지원하는 통화만 금액 칸에 넣는다. 그 밖의 통화는 메모에 원래 금액을 남긴다. (B16)
function toCost(amount: number | null, currency: string | null) {
  if (amount === null || !Number.isFinite(amount) || amount < 0) return { costAmount: null, costCurrency: null, note: "" };
  const rounded = Math.round(amount * 100) / 100;
  const code = currency?.trim().toUpperCase() ?? "";
  if ((CURRENCIES as readonly string[]).includes(code)) return { costAmount: rounded, costCurrency: code, note: "" };
  return { costAmount: null, costCurrency: null, note: `금액: ${rounded}${code ? ` ${code}` : ""}` };
}

export function normalizeItems(raw: RawItem[], ctx: SuggestContext): ExtractedItem[] {
  const dayCount = clampDay(ctx.dayCount || 1);
  // 이번에 넣는 항목도 세어 같은 날에 몰리지 않게 한다.
  const busy = { ...ctx.busy };
  const items: ExtractedItem[] = [];
  for (const r of raw) {
    const name = clip(r.name ?? "", 200);
    if (!name || !(ITEM_KINDS as readonly string[]).includes(r.kind)) continue;
    const kind = r.kind as ItemKind;
    const cost = toCost(r.cost_amount, r.cost_currency);
    const link = clip(r.link ?? "", 2000);

    const textDay = toDay(r, ctx.startDate);
    const aiDay = typeof r.suggested_day === "number" && Number.isFinite(r.suggested_day) ? clampDay(r.suggested_day, dayCount) : null;
    const day = textDay ?? aiDay ?? leastBusyDay(busy, dayCount);
    const textTime = toTime(r.time);
    // 메모는 장소가 아니라 시각을 추천하지 않는다.
    const aiTime = textTime === null && kind !== "memo" ? toTime(r.suggested_time) : null;
    busy[day] = (busy[day] ?? 0) + 1;

    const dayGuessed = textDay === null;
    const timeGuessed = aiTime !== null;
    // 메모는 일차별로 보이지 않으므로(쪽지) 추천으로 띄우지 않고 바로 넣는다.
    const reason = clip(r.reason ?? "", 200) || (dayGuessed && aiDay === null ? FALLBACK_REASON : "");
    const suggest = kind !== "memo" && (dayGuessed || timeGuessed) ? { day: dayGuessed, time: timeGuessed, reason } : null;

    items.push({
      kind,
      day,
      time: textTime ?? aiTime,
      name,
      address: clip(r.address ?? "", 300),
      memo: clip([r.memo?.trim(), cost.note].filter(Boolean).join("\n"), 2000),
      link: /^https?:\/\//i.test(link) ? link : "",
      costAmount: cost.costAmount,
      costCurrency: cost.costCurrency,
      suggest,
    });
    if (items.length === MAX_ITEMS) break;
  }
  return items;
}
