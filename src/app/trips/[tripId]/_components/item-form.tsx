"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ItemActionState } from "@/app/actions/items";
import type { TripDay } from "@/lib/trips/days";
import { CURRENCIES, formatTime, ITEM_KIND_LABELS, ITEM_KINDS, type Item } from "@/lib/items/types";

const INPUT = "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const LABEL = "flex flex-col gap-1 text-sm";

type Props = {
  action: (prev: ItemActionState, form: FormData) => Promise<ItemActionState>;
  days: TripDay[];
  item?: Item;
  submitLabel: string;
  onSaved?: (name: string) => void;
};

// 항목 직접 입력·수정 폼 (R-05). 입력창(새 항목)과 수정 창이 같이 쓴다.
export function ItemForm({ action, days, item, submitLabel, onSaved }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: null, saved: null });
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<ItemActionState | null>(null);

  useEffect(() => {
    if (state.saved && handled.current !== state) {
      handled.current = state;
      if (!item) formRef.current?.reset();
      onSaved?.(state.saved);
    }
  }, [state, item, onSaved]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      {/* 종류는 고른 것이 늘 보이도록 버튼 모양 라디오로 둔다. */}
      <fieldset className="flex flex-col gap-1 text-sm">
        <legend className="mb-1">종류</legend>
        <div className="flex flex-wrap gap-1">
          {ITEM_KINDS.map((k) => (
            <label
              key={k}
              className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-zinc-400 dark:border-zinc-700 dark:has-[:checked]:border-zinc-100 dark:has-[:checked]:bg-zinc-100 dark:has-[:checked]:text-zinc-900"
            >
              <input type="radio" name="kind" value={k} defaultChecked={(item?.kind ?? "sight") === k} className="sr-only" />
              {ITEM_KIND_LABELS[k]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-2">
        <label className={LABEL}>
          일차
          <select name="day" defaultValue={item?.day ?? 1} className={INPUT}>
            {days.map((d) => (
              <option key={d.day} value={d.day}>
                DAY {d.day}
                {d.date ? ` (${d.date.slice(5)})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          시각
          <input type="time" name="time" defaultValue={formatTime(item?.time ?? null)} className={INPUT} />
        </label>
      </div>
      <label className={LABEL}>
        이름
        <input name="name" required maxLength={200} defaultValue={item?.name} placeholder="예: 빅토리아 피크, KE123 인천→홍콩" className={INPUT} />
      </label>
      <label className={LABEL}>
        주소
        <input name="address" maxLength={300} defaultValue={item?.address} placeholder="비워 두면 이름으로 찾습니다" className={INPUT} />
      </label>
      <label className={LABEL}>
        메모
        <textarea name="memo" rows={2} maxLength={2000} defaultValue={item?.memo} className={`${INPUT} resize-none`} />
      </label>
      <label className={LABEL}>
        링크
        <input type="url" name="link" maxLength={2000} defaultValue={item?.link} placeholder="https://" className={INPUT} />
      </label>
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <label className={LABEL}>
          비용
          <input
            name="costAmount"
            inputMode="decimal"
            defaultValue={item?.cost_amount === null || item?.cost_amount === undefined ? "" : String(Number(item.cost_amount))}
            placeholder="금액"
            className={INPUT}
          />
        </label>
        <label className={LABEL}>
          통화
          <select name="costCurrency" defaultValue={item?.cost_currency ?? ""} className={INPUT}>
            <option value="">선택</option>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "저장 중…" : submitLabel}
      </button>
    </form>
  );
}
