// 일정 항목 (items 테이블, 컬럼 이름 그대로)

export const ITEM_KINDS = ["transport", "lodging", "sight", "food", "memo"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  transport: "교통",
  lodging: "숙소",
  sight: "관광지",
  food: "식당",
  memo: "메모",
};

// 좌표를 찾는 종류. 교통은 출발·도착 두 곳이라 한 좌표로 정할 수 없고, 메모는 장소가 아니다.
export const GEOCODED_KINDS: readonly ItemKind[] = ["lodging", "sight", "food"];

export const CURRENCIES = ["KRW", "USD", "JPY", "CNY", "HKD", "TWD", "EUR", "GBP", "THB", "VND", "SGD", "PHP"] as const;

export type Item = {
  id: string;
  trip_id: string;
  day: number;
  time: string | null; // "HH:MM:SS"
  position: number;
  kind: ItemKind;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  memo: string;
  link: string;
  cost_amount: number | string | null; // numeric은 문자열로 올 수 있다
  cost_currency: string | null;
  source: "manual" | "ai";
  created_at: string;
  updated_at: string;
};

export const ITEM_COLUMNS =
  "id, trip_id, day, time, position, kind, name, address, lat, lng, memo, link, cost_amount, cost_currency, source, created_at, updated_at";

export function formatTime(time: string | null): string {
  return time ? time.slice(0, 5) : "";
}

export function formatCost(amount: Item["cost_amount"], currency: string | null): string {
  if (amount === null || !currency) return "";
  const value = Number(amount);
  return `${value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })} ${currency}`;
}
