"use client";

// 준비물 체크리스트 저장 (C10 F31). DB(trip_checks)에 두고, 서버 액션은 src/app/actions/checklist.ts.
// 매거진 BACK의 Checklist(ticket-strip.tsx)와 입력창 붙여넣기(paste-extract.tsx)가 같은 목록을 보도록 여행별로 여기에 들고 있다.
// - 처음에는 서버가 읽어 넘긴 목록(initial)을 보여 주고, 바꾸면 화면부터 바꾼 뒤 서버가 돌려준 목록으로 맞춘다.
// - 저장에 실패하면 서버가 돌려준 목록(없으면 바꾸기 전 목록)으로 되돌리고 이유를 돌려준다.
// - C9까지 이 브라우저(localStorage)에 남아 있던 준비물은 처음 열 때 한 번 DB로 옮기고 지운다(DB가 비어 있을 때만).

import { useSyncExternalStore } from "react";
import { addChecks, importChecks, removeCheck, setCheckDone, type ChecklistResult } from "@/app/actions/checklist";
import type { Check } from "@/lib/trips/packing";

const lists = new Map<string, Check[]>();
const latest = new Map<string, number>(); // 여행별 마지막 요청 번호. 늦게 온 앞 요청의 결과로 덮지 않는다.
const listeners = new Set<() => void>();
const moved = new Set<string>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function set(tripId: string, next: Check[]) {
  lists.set(tripId, next);
  for (const l of listeners) l();
}

export function useChecklist(tripId: string, initial: Check[]): Check[] {
  return useSyncExternalStore(subscribe, () => lists.get(tripId) ?? initial, () => initial);
}

// 화면을 먼저 optimistic으로 바꾸고 서버 결과로 맞춘다. 실패하면 오류 문구를 돌려준다.
async function run(tripId: string, before: Check[], optimistic: Check[] | null, call: () => Promise<ChecklistResult>): Promise<ChecklistResult> {
  const seq = (latest.get(tripId) ?? 0) + 1;
  latest.set(tripId, seq);
  if (optimistic) set(tripId, optimistic);
  let result: ChecklistResult;
  try {
    result = await call();
  } catch {
    result = { ok: false, error: "준비물을 저장하지 못했습니다. 잠시 뒤 다시 해 주세요.", checks: null };
  }
  // 화면을 미리 바꾸지 않은 요청(붙여넣기·옮기기)이 목록 없이 실패하면 그대로 둔다
  const next = result.checks ?? (optimistic ? before : null);
  if (next && latest.get(tripId) === seq) set(tripId, next);
  return result;
}

export function addCheck(tripId: string, current: Check[], label: string) {
  return run(tripId, current, [...current, { id: `tmp-${Date.now()}`, label, done: false }], () => addChecks(tripId, [label]));
}

export function toggleCheck(tripId: string, current: Check[], check: Check) {
  const next = current.map((c) => (c.id === check.id ? { ...c, done: !c.done } : c));
  return run(tripId, current, next, () => setCheckDone(tripId, check.id, !check.done));
}

export function deleteCheck(tripId: string, current: Check[], check: Check) {
  return run(tripId, current, current.filter((c) => c.id !== check.id), () => removeCheck(tripId, check.id));
}

// 붙여넣은 준비물을 지금 목록 뒤에 더한다. 이미 있는 이름은 서버가 건너뛴다.
export async function addToChecklist(tripId: string, labels: string[]): Promise<ChecklistResult> {
  return run(tripId, [], null, () => addChecks(tripId, labels));
}

// ───────── C9까지의 브라우저 저장 옮기기 ─────────

function legacyKey(tripId: string) {
  return `stepmap:checklist:${tripId}`;
}

function readLegacy(tripId: string): { label: string; done: boolean }[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(legacyKey(tripId)) ?? "null") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c): c is { label: string; done?: unknown } => typeof c?.label === "string")
      .map((c) => ({ label: c.label, done: c.done === true }));
  } catch {
    return [];
  }
}

// 소유자의 Checklist가 처음 열릴 때 한 번 부른다. 옮기기에 실패하면 브라우저 값은 그대로 두고 다음에 다시 한다.
export async function moveBrowserChecklist(tripId: string) {
  if (moved.has(tripId)) return;
  moved.add(tripId);
  const legacy = readLegacy(tripId);
  if (!legacy.length) return;
  const result = await run(tripId, [], null, () => importChecks(tripId, legacy));
  if (!result.ok) return;
  try {
    window.localStorage.removeItem(legacyKey(tripId));
  } catch {
    // 지우지 못해도 다음에는 DB 목록이 있어 다시 넣지 않는다
  }
}
