// AI 추출 결과를 항목 입력값(ItemInput) 모양으로 다듬는다. (B15, B16)
// 저장할 때는 미리보기에서 고친 값으로 validation.ts 검사를 다시 거친다.

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
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)/;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

// 날짜가 있고 여행 시작일을 알면 날짜로, 아니면 AI가 준 일차로 정한다. 모르면 DAY 1. (B16)
export function toDay(raw: Pick<RawItem, "date" | "day">, startDate: string | null): number {
  let day = 1;
  if (raw.date && DATE_RE.test(raw.date) && startDate) day = daysBetween(startDate, raw.date) + 1;
  else if (raw.day !== null && Number.isFinite(raw.day)) day = Math.trunc(raw.day);
  return Math.min(Math.max(day, 1), MAX_DAYS);
}

export function toTime(raw: string | null): string | null {
  const m = raw?.trim().match(TIME_RE);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
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

export function normalizeItems(raw: RawItem[], startDate: string | null): ItemInput[] {
  const items: ItemInput[] = [];
  for (const r of raw) {
    const name = clip(r.name ?? "", 200);
    if (!name || !(ITEM_KINDS as readonly string[]).includes(r.kind)) continue;
    const cost = toCost(r.cost_amount, r.cost_currency);
    const link = clip(r.link ?? "", 2000);
    items.push({
      kind: r.kind as ItemKind,
      day: toDay(r, startDate),
      time: toTime(r.time),
      name,
      address: clip(r.address ?? "", 300),
      memo: clip([r.memo?.trim(), cost.note].filter(Boolean).join("\n"), 2000),
      link: /^https?:\/\//i.test(link) ? link : "",
      costAmount: cost.costAmount,
      costCurrency: cost.costCurrency,
    });
    if (items.length === MAX_ITEMS) break;
  }
  return items;
}
