"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { extractItems, saveExtractedItems, type ExtractState, type SaveExtractedState } from "@/app/actions/extract";
import { MAX_TEXT_LENGTH, type ExtractedItem } from "@/lib/extract/normalize";
import type { TripDay } from "@/lib/trips/days";
import { BUBBLE_IN, FIELD, GHOST, PRIMARY as BUTTON } from "./form-styles";
import { ItemFields } from "./item-fields";
import { addSuggestions } from "./suggestions";

// R-04 붙여넣기 → 자동 추출 → 미리보기 → 저장 (02-FRONTEND.md 5-3절)
// F18: 원문에 일차·시각이 없어 AI가 추천한 항목은 미리보기를 거치지 않고 바로 매거진 DAY에 "추천" 카드로 띄운다.
// 카드에서 "넣기"를 눌러야 저장된다. 원문에 일차·시각이 다 있는 항목만 지금처럼 미리보기에서 확인하고 저장한다.
export function PasteExtract({
  tripId,
  days,
  onSaved,
}: {
  tripId: string;
  days: TripDay[];
  onSaved: (message: string) => void;
}) {
  const [text, setText] = useState("");

  // 추출 결과를 나눈다: 추천 항목 → 추천 카드, 나머지 → 미리보기
  async function extract(prev: ExtractState, form: FormData): Promise<ExtractState> {
    const result = await extractItems(tripId, prev, form);
    if (!result.items) return result;
    const suggested = result.items.filter((i) => i.suggest);
    const rest = result.items.filter((i) => !i.suggest);
    if (suggested.length) {
      addSuggestions(
        tripId,
        suggested.map(({ suggest, ...item }) => ({ item, suggest: suggest! })),
      );
      onSaved(`추천 ${suggested.length}개를 DAY BY DAY에 띄웠습니다. 카드에서 "넣기"를 눌러야 저장됩니다.`);
    }
    if (!rest.length) setText("");
    return { error: null, items: rest.length ? rest : null, unassigned: result.unassigned };
  }

  const [state, extractAction, extracting] = useActionState(extract, { error: null, items: null });
  // 저장하거나 취소한 추출 결과. 같은 결과의 미리보기를 다시 열지 않는다.
  const [closed, setClosed] = useState<ExtractState | null>(null);
  const preview = state.items && closed !== state ? state.items : null;

  if (preview) {
    return (
      <ExtractPreview
        tripId={tripId}
        days={days}
        items={preview}
        unassigned={state.unassigned ?? []}
        onCancel={() => setClosed(state)}
        onDone={(count) => {
          setClosed(state);
          setText("");
          onSaved(`추출한 항목 ${count}개를 저장했습니다.`);
        }}
      />
    );
  }

  return (
    <form action={extractAction} className="flex flex-col gap-2">
      {extracting && (
        <p role="status" className={`${BUBBLE_IN} animate-pulse`}>
          일정을 추출하고 있습니다…
        </p>
      )}
      <textarea
        name="text"
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_TEXT_LENGTH}
        aria-label="붙여넣을 내용"
        placeholder="여기에 붙여넣기"
        className={`${FIELD} resize-none leading-relaxed`}
      />
      <p className="text-xs leading-relaxed opacity-55">
        링크와 “예약번호: …”처럼 적힌 예약번호는 AI에 보내지 않고 나만 보는 곳에 저장합니다. 카드번호·주민번호·여권번호·비밀번호는 가려서 보내고 저장하지 않습니다. 사람 이름은 지우고 붙여넣어 주세요.
      </p>
      {state.error && !extracting && <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">{state.error}</p>}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs opacity-55">
          {text.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}자 · 원문은 저장하지 않습니다.
        </p>
        <button type="submit" disabled={extracting || !text.trim()} className={BUTTON}>
          {extracting ? "추출 중…" : "보내기"}
        </button>
      </div>
    </form>
  );
}

function ExtractPreview({
  tripId,
  days,
  items,
  unassigned,
  onCancel,
  onDone,
}: {
  tripId: string;
  days: TripDay[];
  items: ExtractedItem[];
  unassigned: string[];
  onCancel: () => void;
  onDone: (count: number) => void;
}) {
  const [state, saveAction, saving] = useActionState(saveExtractedItems.bind(null, tripId), { error: null, saved: null });
  const handled = useRef<SaveExtractedState | null>(null);

  useEffect(() => {
    if (state.saved && handled.current !== state) {
      handled.current = state;
      onDone(state.saved);
    }
  }, [state, onDone]);

  // 여행 기간보다 뒤 일차로 뽑힌 항목도 고를 수 있게 일차 목록을 늘린다.
  const lastDay = Math.max(days.length, ...items.map((i) => i.day));
  const choices = [...days];
  for (let d = days.length + 1; d <= lastDay; d++) choices.push({ day: d, date: null });

  return (
    <form action={saveAction} className="flex flex-col gap-3" aria-label="추출 결과 미리보기">
      <p className={BUBBLE_IN}>
        항목 {items.length}개를 찾았습니다. 확인하고 고친 뒤 저장하세요.
      </p>
      {/* F20: AI가 어느 항목에도 붙이지 않은 예약번호. 맞는 항목의 예약번호 칸에 직접 넣는다. */}
      {unassigned.length > 0 && (
        <p className="rounded-xl bg-amber-500/15 px-3 py-2 text-sm">
          어느 항목인지 못 정한 예약번호: <span className="font-mono">{unassigned.join(", ")}</span> · 맞는 항목의 예약번호 칸에 넣어 주세요.
        </p>
      )}
      <input type="hidden" name="count" value={items.length} />
      {items.map((item, i) => (
        <fieldset
          key={i}
          className="flex flex-col gap-4 rounded-2xl border border-line bg-background/40 p-4 transition has-[input[name$='.include']:not(:checked)]:opacity-40"
        >
          <legend className="sr-only">항목 {i + 1}</legend>
          <label className="flex items-center justify-between text-sm font-semibold">
            항목 {i + 1}
            <span className="flex items-center gap-1 font-normal">
              <input type="checkbox" name={`items.${i}.include`} defaultChecked className="size-4" />
              넣기
            </span>
          </label>
          <ItemFields days={choices} values={item} prefix={`items.${i}.`} />
        </fieldset>
      ))}
      {state.error && <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">{state.error}</p>}
      <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 rounded-2xl bg-surface/90 px-1 py-2 backdrop-blur-xl">
        <button type="button" onClick={onCancel} disabled={saving} className={GHOST}>
          취소
        </button>
        <button type="submit" disabled={saving} className={BUTTON}>
          {saving ? "저장 중…" : "고른 항목 저장"}
        </button>
      </div>
    </form>
  );
}
