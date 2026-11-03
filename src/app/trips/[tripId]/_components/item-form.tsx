"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ItemActionState } from "@/app/actions/items";
import type { TripDay } from "@/lib/trips/days";
import { formatTime, type Item } from "@/lib/items/types";
import type { ItemInput } from "@/lib/items/validation";
import { PRIMARY } from "./form-styles";
import { ItemFields } from "./item-fields";

type Props = {
  action: (prev: ItemActionState, form: FormData) => Promise<ItemActionState>;
  days: TripDay[];
  item?: Item;
  submitLabel: string;
  onSaved?: (name: string) => void;
};

function toValues(item: Item): ItemInput {
  return {
    kind: item.kind,
    day: item.day,
    time: formatTime(item.time) || null,
    name: item.name,
    address: item.address,
    memo: item.memo,
    link: item.link,
    costAmount: item.cost_amount === null ? null : Number(item.cost_amount),
    costCurrency: item.cost_currency,
  };
}

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
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <ItemFields days={days} values={item && toValues(item)} />
      {state.error && <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-500">{state.error}</p>}
      <button type="submit" disabled={pending} className={`${PRIMARY} mt-1`}>
        {pending ? "저장 중…" : submitLabel}
      </button>
    </form>
  );
}
