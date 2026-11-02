// 항목 입력값 검사. DB의 CHECK 제약(src/db/schema.ts items)과 같은 규칙을 먼저 확인한다.
// 직접 입력(R-05)과 자동 추출 미리보기(R-04)가 같이 쓴다.

import type { ParseResult } from "@/lib/trips/validation";
import { ITEM_KINDS, type ItemKind } from "./types";

export type ItemInput = {
  kind: ItemKind;
  day: number;
  time: string | null; // "HH:MM"
  name: string;
  address: string;
  memo: string;
  link: string;
  costAmount: number | null;
  costCurrency: string | null;
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const AMOUNT_RE = /^\d{1,12}(\.\d{1,2})?$/;
const CURRENCY_RE = /^[A-Z]{3}$/;

// prefix는 한 폼에 항목이 여러 개일 때(자동 추출 미리보기) 칸 이름 앞에 붙인다. 예: "items.0."
export function parseItemForm(form: FormData, prefix = ""): ParseResult<ItemInput> {
  const text = (name: string) => {
    const value = form.get(prefix + name);
    return typeof value === "string" ? value.trim() : "";
  };

  const kind = text("kind");
  if (!(ITEM_KINDS as readonly string[]).includes(kind)) return { ok: false, error: "항목 종류를 골라 주세요." };

  const day = Number(text("day"));
  if (!Number.isInteger(day) || day < 1 || day > 60) return { ok: false, error: "일차는 1일부터 60일까지입니다." };

  const time = text("time").slice(0, 5) || null;
  if (time && !TIME_RE.test(time)) return { ok: false, error: "시각 형식이 올바르지 않습니다." };

  const name = text("name");
  if (!name) return { ok: false, error: "이름을 입력해 주세요." };
  if (name.length > 200) return { ok: false, error: "이름은 200자까지 쓸 수 있습니다." };

  const address = text("address");
  if (address.length > 300) return { ok: false, error: "주소는 300자까지 쓸 수 있습니다." };

  const memo = text("memo");
  if (memo.length > 2000) return { ok: false, error: "메모는 2000자까지 쓸 수 있습니다." };

  const link = text("link");
  if (link.length > 2000) return { ok: false, error: "링크가 너무 깁니다." };
  if (link && !/^https?:\/\//i.test(link)) return { ok: false, error: "링크는 http:// 또는 https://로 시작해야 합니다." };

  const amountRaw = text("costAmount").replaceAll(",", "");
  const currencyRaw = text("costCurrency").toUpperCase();
  let costAmount: number | null = null;
  let costCurrency: string | null = null;
  if (amountRaw) {
    if (!AMOUNT_RE.test(amountRaw)) return { ok: false, error: "금액은 0 이상의 숫자로, 소수점 둘째 자리까지 쓸 수 있습니다." };
    if (!CURRENCY_RE.test(currencyRaw)) return { ok: false, error: "금액을 넣으면 통화도 골라 주세요." };
    costAmount = Number(amountRaw);
    costCurrency = currencyRaw;
  }

  return {
    ok: true,
    value: { kind: kind as ItemKind, day, time, name, address, memo, link, costAmount, costCurrency },
  };
}
