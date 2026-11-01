// 비용 합계·정산 (R-09). 통화별로 따로 합계를 내고 동행 인원으로 나눈다. 환율 계산은 하지 않는다. (D8, D9)

import { CURRENCIES, type Item } from "@/lib/items/types";

export type CurrencyTotal = {
  currency: string;
  count: number; // 그 통화로 적힌 항목 수
  total: number;
  perPerson: number;
};

// 통화의 소수 자릿수(KRW·JPY·VND는 0, 나머지는 2). 1인당 금액을 여기에 맞춰 반올림한다. (B24)
export function currencyDigits(currency: string): number {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

function round(value: number, digits: number): number {
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}

export function summarizeCosts(items: Pick<Item, "cost_amount" | "cost_currency">[], companions: number): CurrencyTotal[] {
  // 소수 오차를 피하려고 0.01 단위 정수로 더한다.
  const cents = new Map<string, { sum: number; count: number }>();
  for (const item of items) {
    if (item.cost_amount === null || !item.cost_currency) continue;
    const entry = cents.get(item.cost_currency) ?? { sum: 0, count: 0 };
    entry.sum += Math.round(Number(item.cost_amount) * 100);
    entry.count += 1;
    cents.set(item.cost_currency, entry);
  }

  const people = Math.max(1, companions);
  const order = (c: string) => {
    const i = (CURRENCIES as readonly string[]).indexOf(c);
    return i === -1 ? CURRENCIES.length : i;
  };
  return [...cents.entries()]
    .sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
    .map(([currency, { sum, count }]) => {
      const total = sum / 100;
      return { currency, count, total, perPerson: round(total / people, currencyDigits(currency)) };
    });
}

// 소수가 있는 금액은 통화 자릿수를 다 채운다(10.5 → 10.50). 정수 금액은 소수점을 붙이지 않는다.
export function formatAmount(value: number, currency: string): string {
  const digits = currencyDigits(currency);
  const min = Number.isInteger(value) ? 0 : digits;
  return value.toLocaleString("ko-KR", { minimumFractionDigits: min, maximumFractionDigits: digits });
}
