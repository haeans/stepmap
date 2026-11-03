"use client";

// F18: 아직 저장하지 않은 AI 추천 일정. 입력창(미리보기)에서 넣고, 매거진 DAY에 "추천" 카드로 보인다.
// 사용자가 카드에서 "넣기"를 눌러야 DB에 저장된다. DB 변경 없이 이 브라우저에만 둔다(localStorage, 여행별).
// 입력창과 매거진은 서로 다른 곳에 그려지므로 Provider 대신 작은 저장소(useSyncExternalStore)로 나눠 쓴다.
// F19(대화로 일정 짜기)의 추천도 같은 저장소에 넣는다.

import { useSyncExternalStore } from "react";
import type { Suggestion } from "@/lib/extract/normalize";
import type { ItemInput } from "@/lib/items/validation";

export type PendingSuggestion = { id: string; item: ItemInput; suggest: Suggestion };

const EMPTY: PendingSuggestion[] = [];
const cache = new Map<string, PendingSuggestion[]>();
const listeners = new Set<() => void>();

function key(tripId: string) {
  return `stepmap:suggestions:${tripId}`;
}

function read(tripId: string): PendingSuggestion[] {
  const cached = cache.get(tripId);
  if (cached) return cached;
  let list = EMPTY;
  try {
    const raw = window.localStorage.getItem(key(tripId));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) list = parsed as PendingSuggestion[];
  } catch {
    // 저장소를 못 쓰면(사생활 보호 창 등) 이번 화면에서만 기억한다.
  }
  cache.set(tripId, list);
  return list;
}

function write(tripId: string, list: PendingSuggestion[]) {
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

export function addSuggestions(tripId: string, items: { item: ItemInput; suggest: Suggestion }[]) {
  if (!items.length) return;
  write(tripId, [...read(tripId), ...items.map((s) => ({ ...s, id: crypto.randomUUID() }))]);
}

export function removeSuggestion(tripId: string, id: string) {
  write(
    tripId,
    read(tripId).filter((s) => s.id !== id),
  );
}

// 추천 카드에서 고친 값으로 바꾼다(아직 저장 전).
export function updateSuggestion(tripId: string, id: string, item: ItemInput) {
  write(
    tripId,
    read(tripId).map((s) => (s.id === id ? { ...s, item } : s)),
  );
}

export function useSuggestions(tripId: string): PendingSuggestion[] {
  return useSyncExternalStore(
    subscribe,
    () => read(tripId),
    () => EMPTY,
  );
}
