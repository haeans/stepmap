// 항목 입력값 검사. DB의 CHECK 제약(src/db/schema.ts items, item_secrets)과 같은 규칙을 먼저 확인한다.
// 직접 입력(R-05)과 자동 추출 미리보기(R-04)가 같이 쓴다.

import type { ParseResult } from "@/lib/trips/validation";
import { findForbidden, LINK_LEVELS, resolveLinkLevel, type LinkLevel, type SecretLevel } from "./sensitive";
import { BOOKING_LINK_KINDS, BOOKING_NO_KINDS, ITEM_KINDS, type ItemKind } from "./types";

export type ItemInput = {
  kind: ItemKind;
  day: number;
  time: string | null; // "HH:MM"
  name: string;
  address: string;
  memo: string;
  link: string; // 공개 링크(items.link)
  costAmount: number | null;
  costCurrency: string | null;
  // 예약 정보 (C8 F20). 폼에 예약 칸이 있었을 때만 있다(없으면 저장된 예약 정보를 건드리지 않는다).
  booking?: { no: string; link: string; level: LinkLevel };
};

// 저장할 예약 정보. null이면 지운다.
export type SecretRow = { booking_no: string; booking_link: string; level: SecretLevel } | null;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const AMOUNT_RE = /^\d{1,12}(\.\d{1,2})?$/;
const CURRENCY_RE = /^[A-Z]{3}$/;
const URL_RE = /^https?:\/\//i;

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

  let link = text("link");
  if (link.length > 2000) return { ok: false, error: "링크가 너무 깁니다." };
  if (link && !URL_RE.test(link)) return { ok: false, error: "링크는 http:// 또는 https://로 시작해야 합니다." };

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

  // 예약 칸: 폼이 "booking=1"을 보낼 때만 읽는다(쓴 돈 수정처럼 예약 칸이 없는 폼은 예약 정보를 그대로 둔다).
  let booking: ItemInput["booking"];
  if (text("booking") === "1") {
    const no = (BOOKING_NO_KINDS as readonly string[]).includes(kind) ? text("bookingNo") : "";
    if (no.length > 100) return { ok: false, error: "예약번호는 100자까지 쓸 수 있습니다." };
    const bookingLink = (BOOKING_LINK_KINDS as readonly string[]).includes(kind) ? text("bookingLink") : "";
    if (bookingLink.length > 2000) return { ok: false, error: "예약 링크가 너무 깁니다." };
    if (bookingLink && !URL_RE.test(bookingLink)) return { ok: false, error: "예약 링크는 http:// 또는 https://로 시작해야 합니다." };
    const levelRaw = text("linkLevel");
    const level = ((LINK_LEVELS as readonly string[]).includes(levelRaw) ? levelRaw : "auto") as LinkLevel;
    booking = { no, link: bookingLink, level };
    // 교통·숙소·식당의 링크는 예약 링크 칸 하나로 받는다. "공유한 사람도 보기"를 고르면 공개 링크로 둔다.
    if ((BOOKING_LINK_KINDS as readonly string[]).includes(kind)) link = bookingLink && level === "public" ? bookingLink : "";
  }

  // 저장 금지 정보(주민번호·카드번호·CVC·비밀번호·계좌·여권 등)는 어느 칸에도 저장하지 않는다. (C8 F20)
  for (const value of [name, address, memo, link, booking?.no ?? "", booking?.link ?? ""]) {
    const found = findForbidden(value);
    if (found) return { ok: false, error: `${found} 같은 정보는 저장할 수 없습니다. 지우고 다시 저장해 주세요.` };
  }

  return {
    ok: true,
    value: { kind: kind as ItemKind, day, time, name, address, memo, link, costAmount, costCurrency, ...(booking ? { booking } : {}) },
  };
}

// 폼의 예약 칸 → item_secrets에 둘 값. undefined면 건드리지 않고, null이면 지운다.
export function toSecretRow(input: ItemInput): SecretRow | undefined {
  const b = input.booking;
  if (!b) return undefined;
  const level = b.link ? resolveLinkLevel(b.link, b.level) : "owner";
  const privateLink = b.link && level !== "public" ? b.link : "";
  if (!b.no && !privateLink) return null;
  return { booking_no: b.no, booking_link: privateLink, level: level === "public" ? "owner" : level };
}
