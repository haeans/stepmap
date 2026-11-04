"use client";

// 준비물 체크리스트 저장 (F10 B76, F16 B100). 서버·DB에 두지 않고 이 브라우저에만 둔다(localStorage, 여행별).
// C9 F27: 매거진 BACK의 Checklist(ticket-strip.tsx)와 입력창 붙여넣기(paste-extract.tsx)가 같이 쓰도록 여기로 꺼냈다.

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { mergePacking, type Check } from "@/lib/trips/packing";

const CHANGE = "stepmap:checklist-change";

function checklistKey(tripId: string) {
  return `stepmap:checklist:${tripId}`;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readRaw(tripId: string): string | null {
  try {
    return window.localStorage.getItem(checklistKey(tripId));
  } catch {
    return null;
  }
}

function parse(raw: string | null): Check[] {
  try {
    const parsed = raw ? (JSON.parse(raw) as Check[]) : null;
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // 깨진 값이면 빈 목록
  }
  return []; // 넣은 준비물이 없으면 비어 있다(F16). 하나 더할 때마다 한 줄씩 생긴다.
}

function write(tripId: string, next: Check[]) {
  try {
    window.localStorage.setItem(checklistKey(tripId), JSON.stringify(next));
  } catch {
    // 저장소를 못 쓰면 바뀌지 않는다
  }
  window.dispatchEvent(new Event(CHANGE));
}

export function useChecklist(tripId: string) {
  const raw = useSyncExternalStore(subscribe, () => readRaw(tripId), () => null);
  const checks = useMemo(() => parse(raw), [raw]);
  const save = useCallback((next: Check[]) => write(tripId, next), [tripId]);
  return [checks, save] as const;
}

// 붙여넣은 준비물을 지금 목록 뒤에 더한다. 이미 있는 이름은 건너뛴다. 새로 더한 개수를 돌려준다.
export function addToChecklist(tripId: string, labels: string[]): number {
  const stamp = Date.now();
  const { next, added } = mergePacking(parse(readRaw(tripId)), labels, (i) => `p${stamp}-${i}`);
  if (added) write(tripId, next);
  return added;
}
