"use client";

// C9 F28: 붙여넣기로 뽑았지만 아직 저장하지 않은 항목. 입력창 대신 매거진 DAY BY DAY에 "미리보기" 카드로 보인다.
// 사용자가 카드의 "넣기"나 미리보기 줄의 "모두 저장"을 눌러야 DB에 저장된다. F18 추천처럼 이 브라우저에만 둔다(localStorage, 여행별).
// 예약 정보(F20)도 저장 전까지 여기에만 있고, 저장하거나 빼면 함께 지워진다. ([hyunw0000-f28-magazine-preview] 결정 1·2)

import { useSyncExternalStore } from "react";
import type { Suggestion } from "@/lib/extract/normalize";
import type { Item } from "@/lib/items/types";
import type { ItemInput } from "@/lib/items/validation";

// suggest: 원문에 없어 AI가 채운 일차·시각과 그 이유(F18). 원문에서 가져온 항목이라 추천 카드가 아니라 미리보기로 보이고,
// 카드 서랍에 "(추천)" 표시와 이유만 남긴다. 사용자가 고치면 값을 확인한 것이라 지운다. ([hyunw0000-f33-claude-api] 결정 5)
export type PendingPreview = { id: string; item: ItemInput; suggest?: Suggestion | null };

// 입력창의 "매거진에서 보기"가 보내는 신호. 입력창이 닫히고 매거진이 미리보기 줄로 스크롤한다.
export const SHOW_PREVIEWS_EVENT = "stepmap:show-previews";
export const PREVIEWS_ANCHOR = "m-previews";

const EMPTY: PendingPreview[] = [];
const cache = new Map<string, PendingPreview[]>();
const listeners = new Set<() => void>();

function key(tripId: string) {
  return `stepmap:previews:${tripId}`;
}

export function readPreviews(tripId: string): PendingPreview[] {
  return read(tripId);
}

function read(tripId: string): PendingPreview[] {
  const cached = cache.get(tripId);
  if (cached) return cached;
  let list = EMPTY;
  try {
    const raw = window.localStorage.getItem(key(tripId));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) list = parsed as PendingPreview[];
  } catch {
    // 저장소를 못 쓰면(사생활 보호 창 등) 이번 화면에서만 기억한다.
  }
  cache.set(tripId, list);
  return list;
}

function write(tripId: string, list: PendingPreview[]) {
  cache.set(tripId, list);
  try {
    if (list.length) window.localStorage.setItem(key(tripId), JSON.stringify(list));
    else window.localStorage.removeItem(key(tripId));
  } catch {
    // 위와 같음
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// 새로 띄운 미리보기의 id를 돌려준다(대화 제안을 다음 제안으로 바꿀 때 쓴다, C10 F33).
export function addPreviews(tripId: string, items: { item: ItemInput; suggest: Suggestion | null }[]): string[] {
  if (!items.length) return [];
  const added = items.map(({ item, suggest }) => ({ id: crypto.randomUUID(), item, suggest }));
  write(tripId, [...read(tripId), ...added]);
  return added.map((p) => p.id);
}

export function removePreviews(tripId: string, ids: string[]) {
  const drop = new Set(ids);
  write(
    tripId,
    read(tripId).filter((p) => !drop.has(p.id)),
  );
}

// 카드에서 고친 값으로 바꾼다(아직 저장 전).
export function updatePreview(tripId: string, id: string, item: ItemInput) {
  write(
    tripId,
    read(tripId).map((p) => (p.id === id ? { ...p, item, suggest: null } : p)),
  );
}

// 여행 시작일이 옮겨졌을 때 저장 전 미리보기도 같은 날짜에 남도록 일차를 옮긴다(C10 F33). 1일차보다 앞으로는 가지 않는다.
export function shiftPreviews(tripId: string, by: number) {
  if (!by) return;
  write(
    tripId,
    read(tripId).map((p) => ({ ...p, item: { ...p.item, day: Math.max(1, p.item.day + by) } })),
  );
}

export function usePreviews(tripId: string): PendingPreview[] {
  return useSyncExternalStore(
    subscribe,
    () => read(tripId),
    () => EMPTY,
  );
}

// 하루 일정 규칙(F26 daySchedule)에 미리보기도 넣어 보려고 저장된 일정 모양으로 바꾼다. id는 미리보기 id다(저장 전). (C10 F33)
export function previewAsItem(p: PendingPreview, tripId: string): Item {
  const { item } = p;
  return {
    id: p.id,
    trip_id: tripId,
    day: item.day,
    time: item.time ? `${item.time}:00` : null,
    position: Number.MAX_SAFE_INTEGER,
    kind: item.kind,
    name: item.name,
    address: item.address,
    lat: null,
    lng: null,
    memo: item.memo,
    link: item.link,
    cost_amount: item.costAmount,
    cost_currency: item.costCurrency,
    source: "ai",
    created_at: "",
    updated_at: "",
  };
}

export function showPreviews() {
  window.dispatchEvent(new Event(SHOW_PREVIEWS_EVENT));
}
