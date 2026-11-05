"use client";

// F19: 붙여넣기 탭 대화창의 대화 기억. 서버·DB에 두지 않고 이 브라우저에만 둔다(localStorage, 여행별). ([hyunw0000-f19-ai-planner] 결정 7)
// 붙여넣은 원문은 남기지 않고 "붙여넣은 내용 · N자"로만 적는다(B15). 다른 쪽으로 다시 보낼 원문은 화면 메모리에만 둔다.

import { useSyncExternalStore } from "react";
import type { ProposalChange, ProposalItem } from "@/lib/assistant/proposal";
import type { ExtractedItem } from "@/lib/extract/normalize";
import type { Period } from "@/lib/extract/period";

const MAX_ENTRIES = 40;

// 미리보기 상태: open(고치는 중) → saved(저장함) / closed(취소함) / replaced(다음 제안으로 바뀜)
export type PreviewStatus = "open" | "saved" | "closed" | "replaced";

// 고치기·지우기 카드 상태: open(대기) → done(반영함) / closed(취소함)
export type ChangeCard = ProposalChange & { status: "open" | "done" | "closed"; error?: string };

export type ChatEntry =
  | { id: string; role: "user"; text: string; pasted: boolean }
  | {
      id: string;
      role: "assistant";
      text: string;
      error?: boolean;
      quickReplies?: string[];
      notes?: string[];
      // 대화 제안(F19)
      // previewIds: C10 F33부터 제안은 대화창 폼이 아니라 매거진 미리보기 카드로 띄운다. 그 카드들의 id. 없으면 예전 방식(대화창 폼)
      proposal?: { items: ProposalItem[]; status: PreviewStatus; saved?: number; previewIds?: string[] };
      // 붙여넣기 추출 결과 중 미리보기로 확인할 항목(F18 추천 항목은 매거진 추천 카드로 간다)
      // unassigned: 어느 항목에도 붙지 않은 예약번호(F20). 이 브라우저에만 남는다(원래 화면에 보이던 값).
      extract?: { items: ExtractedItem[]; status: PreviewStatus; saved?: number; unassigned?: string[] };
      // C9 F28: 매거진 DAY BY DAY에 미리보기로 띄운 개수. 있으면 "매거진에서 보기" 버튼을 둔다(위 extract는 F28 전 대화 기록용).
      previews?: number;
      // 저장된 일정 고치기·지우기 제안. 카드마다 "반영"·"삭제"를 눌러야 반영된다.
      changes?: ChangeCard[];
      // C10 F33: 원문 기간이 여행과 달라 맞출지 묻는 카드. previewIds는 이번 추출로 띄운 미리보기(다시 뽑을 때 내린다).
      period?: {
        to: Period;
        current: { startDate: string | null; endDate: string | null };
        status: "open" | "done" | "kept";
        chosen?: Period; // 사용자가 고른 기간(모두·날짜만·기간만)
        previewIds: string[];
        error?: string;
      };
      // 판단이 틀렸을 때 다른 쪽으로 다시 보내는 버튼(원문은 화면 메모리에서 id로 찾는다)
      switchTo?: "extract" | "chat";
    };

export type AssistantEntry = Extract<ChatEntry, { role: "assistant" }>;

const EMPTY: ChatEntry[] = [];
const cache = new Map<string, ChatEntry[]>();
const listeners = new Set<() => void>();

function key(tripId: string) {
  return `stepmap:chat:${tripId}`;
}

function read(tripId: string): ChatEntry[] {
  const cached = cache.get(tripId);
  if (cached) return cached;
  let list = EMPTY;
  try {
    const raw = window.localStorage.getItem(key(tripId));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) list = parsed as ChatEntry[];
  } catch {
    // 저장소를 못 쓰면(사생활 보호 창 등) 이번 화면에서만 기억한다.
  }
  cache.set(tripId, list);
  return list;
}

function write(tripId: string, list: ChatEntry[]) {
  const trimmed = list.slice(-MAX_ENTRIES);
  cache.set(tripId, trimmed);
  try {
    if (trimmed.length) window.localStorage.setItem(key(tripId), JSON.stringify(trimmed));
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

export function newId(): string {
  return crypto.randomUUID();
}

export function appendEntry(tripId: string, entry: ChatEntry) {
  write(tripId, [...read(tripId), entry]);
}

export function updateEntry(tripId: string, id: string, update: (entry: AssistantEntry) => AssistantEntry) {
  write(
    tripId,
    read(tripId).map((e) => (e.id === id && e.role === "assistant" ? update(e) : e)),
  );
}

// 새 고치기·지우기 제안이 오면 아직 누르지 않은 앞 카드는 닫는다(같은 일정을 두 번 고치지 않게).
export function closeOpenChanges(tripId: string) {
  write(
    tripId,
    read(tripId).map((e) =>
      e.role === "assistant" && e.changes?.some((c) => c.status === "open")
        ? { ...e, changes: e.changes.map((c) => (c.status === "open" ? { ...c, status: "closed" as const } : c)) }
        : e,
    ),
  );
}

// 새 제안이 오면 아직 열려 있던 앞 제안은 "바뀜"으로 접는다.
export function replaceOpenProposals(tripId: string) {
  write(
    tripId,
    read(tripId).map((e) =>
      e.role === "assistant" && e.proposal?.status === "open" ? { ...e, proposal: { ...e.proposal, status: "replaced" } } : e,
    ),
  );
}

export function clearChat(tripId: string) {
  write(tripId, EMPTY);
}

export function readChat(tripId: string): ChatEntry[] {
  return read(tripId);
}

export function useChat(tripId: string): ChatEntry[] {
  return useSyncExternalStore(
    subscribe,
    () => read(tripId),
    () => EMPTY,
  );
}
