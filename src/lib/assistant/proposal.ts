// F19: 대화 도우미가 낸 일정 제안을 코드로 검증한다. ([hyunw0000-f19-ai-planner] 결정 2·4)
// 모델은 범위·중복·시간 계산을 자주 틀리므로 여기서 맞추고, 바꾼 내용은 notes로 화면에 알린다.
// Places 실재 확인은 서버 액션(assistant.ts)이 이 다음에 한다.

import { clampDay, toTime } from "@/lib/extract/normalize";
import { ITEM_KINDS, type ItemKind } from "@/lib/items/types";
import type { ItemInput } from "@/lib/items/validation";

export const MAX_PROPOSAL = 12;

// 모델이 돌려주는 제안 항목(gemini.ts 대화 스키마와 같은 모양)
export type RawProposalItem = {
  kind: string;
  day: number | null;
  time: string | null;
  name: string;
  address: string;
  area: string;
  duration_min: number | null;
  memo: string;
  reason: string;
};

// 화면에 보내는 제안 항목. found: Places에서 찾았는지(교통은 찾지 않아 null)
export type ProposalItem = ItemInput & { reason: string; found: boolean | null };

export type ExistingSlot = { kind: string; day: number; time: string | null; name: string };

export type ProposalContext = { dayCount: number; existing: ExistingSlot[] };

// 종류별 기본 머무는 시간(분). 모델이 주지 않으면 쓴다.
const DEFAULT_MINUTES: Record<ItemKind, number> = { sight: 90, food: 60, transport: 60, lodging: 0, memo: 0 };
const LAST_START = 23 * 60 + 30;

// 같은 장소인지 볼 때 쓰는 이름: 공백·문장부호·괄호 속 설명을 뺀 소문자
export function placeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, "")
    .replace(/[\s·・.,'"`’\-_/]/g, "");
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function clip(value: string | null | undefined, max: number): string {
  return (value ?? "").trim().slice(0, max);
}

type Slot = { start: number; end: number };

// 그날 이미 찬 시간. 숙소는 시간을 차지하지 않는다.
function busySlots(existing: ExistingSlot[], day: number): Slot[] {
  return existing
    .filter((e) => e.day === day && e.time && e.kind !== "lodging" && e.kind !== "memo")
    .map((e) => {
      const start = toMinutes(e.time!.slice(0, 5));
      return { start, end: start + (DEFAULT_MINUTES[e.kind as ItemKind] ?? 60) };
    });
}

// 겹치면 겹친 일정이 끝난 뒤(10분 단위로 올림)로 미룬다. 자리가 없으면 null.
function placeTime(start: number, minutes: number, taken: Slot[]): number | null {
  let t = start;
  for (let guard = 0; guard < 50; guard++) {
    const hit = taken.find((s) => t < s.end && s.start < t + Math.max(minutes, 1));
    if (!hit) return t <= LAST_START ? t : null;
    t = Math.ceil(hit.end / 10) * 10;
  }
  return null;
}

export type NormalizedProposal = { items: ProposalItem[]; notes: string[] };

export function normalizeProposal(raw: RawProposalItem[], ctx: ProposalContext): NormalizedProposal {
  const dayCount = clampDay(ctx.dayCount || 1);
  const known = new Set(ctx.existing.map((e) => placeKey(e.name)));
  const seen = new Set<string>();
  const taken = new Map<number, Slot[]>();
  const duplicates: string[] = [];
  let moved = 0;
  let dropped = 0;

  // 같은 날은 시각 순으로 자리를 잡는다(시각 없는 항목은 뒤로).
  const ordered = raw
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (a.r.day ?? 0) - (b.r.day ?? 0) || (toTime(a.r.time) ?? "99").localeCompare(toTime(b.r.time) ?? "99") || a.i - b.i);

  const placed: { i: number; item: ProposalItem }[] = [];
  for (const { r, i } of ordered) {
    const name = clip(r.name, 200);
    // 메모는 제안하지 않는다(결정 4).
    if (!name || !(ITEM_KINDS as readonly string[]).includes(r.kind) || r.kind === "memo") continue;
    const kind = r.kind as ItemKind;

    const key = placeKey(name);
    if (known.has(key)) {
      duplicates.push(name);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);

    const day = typeof r.day === "number" && Number.isFinite(r.day) ? clampDay(r.day, dayCount) : 1;
    let time = toTime(r.time);
    if (time && kind !== "lodging") {
      const minutes = r.duration_min && r.duration_min > 0 ? Math.min(Math.round(r.duration_min), 600) : DEFAULT_MINUTES[kind];
      const slots = taken.get(day) ?? busySlots(ctx.existing, day);
      const start = placeTime(toMinutes(time), minutes, slots);
      if (start === null) {
        time = null;
        dropped++;
      } else {
        if (start !== toMinutes(time)) moved++;
        time = fromMinutes(start);
        slots.push({ start, end: start + minutes });
      }
      taken.set(day, slots);
    }

    const memo = [clip(r.memo, 500), clip(r.area, 50) && `지역: ${clip(r.area, 50)}`].filter(Boolean).join("\n");
    placed.push({
      i,
      item: {
        kind,
        day,
        time,
        name,
        address: clip(r.address, 300),
        memo,
        link: "",
        costAmount: null,
        costCurrency: null,
        reason: clip(r.reason, 200),
        found: null,
      },
    });
  }

  // 화면에는 모델이 낸 순서가 아니라 일차·시각 순으로 보인다.
  placed.sort((a, b) => a.item.day - b.item.day || (a.item.time ?? "99").localeCompare(b.item.time ?? "99") || a.i - b.i);
  const items = placed.slice(0, MAX_PROPOSAL).map((p) => p.item);

  const notes: string[] = [];
  if (duplicates.length) notes.push(`이미 있는 일정이라 뺐습니다: ${duplicates.slice(0, 3).join(", ")}${duplicates.length > 3 ? " 외" : ""}`);
  if (moved) notes.push(`${moved}곳은 다른 일정과 시간이 겹쳐 뒤로 미뤘습니다.`);
  if (dropped) notes.push(`${dropped}곳은 그날 넣을 시간이 없어 시각을 비웠습니다.`);
  if (placed.length > MAX_PROPOSAL) notes.push(`한 번에 ${MAX_PROPOSAL}곳까지만 보여 줍니다.`);
  return { items, notes };
}
