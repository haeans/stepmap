"use client";

// C9 F28: 붙여넣기로 뽑았지만 아직 저장하지 않은 항목. 입력창 대신 매거진 DAY BY DAY에 "미리보기" 카드로 보인다.
// 사용자가 카드의 "넣기"나 미리보기 줄의 "모두 저장"을 눌러야 DB에 저장된다. F18 추천처럼 이 브라우저에만 둔다(localStorage, 여행별).
// 예약 정보(F20)도 저장 전까지 여기에만 있고, 저장하거나 빼면 함께 지워진다. ([hyunw0000-f28-magazine-preview] 결정 1·2)

import { useSyncExternalStore } from "react";
import type { ItemInput } from "@/lib/items/validation";

export type PendingPreview = { id: string; item: ItemInput };

// 입력창의 "매거진에서 보기"가 보내는 신호. 입력창이 닫히고 매거진이 미리보기 줄로 스크롤한다.
export const SHOW_PREVIEWS_EVENT = "stepmap:show-previews";
export const PREVIEWS_ANCHOR = "m-previews";

const EMPTY: PendingPreview[] = [];
const cache = new Map<string, PendingPreview[]>();
const listeners = new Set<() => void>();

function key(tripId: string) {
  return `stepmap:previews:${tripId}`;
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

export function addPreviews(tripId: string, items: ItemInput[]) {
  if (!items.length) return;
  write(tripId, [...read(tripId), ...items.map((item) => ({ id: crypto.randomUUID(), item }))]);
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
    read(tripId).map((p) => (p.id === id ? { ...p, item } : p)),
  );
}

export function usePreviews(tripId: string): PendingPreview[] {
  return useSyncExternalStore(
    subscribe,
    () => read(tripId),
    () => EMPTY,
  );
}

export function showPreviews() {
  window.dispatchEvent(new Event(SHOW_PREVIEWS_EVENT));
}
