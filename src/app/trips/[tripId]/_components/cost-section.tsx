"use client";

// 매거진 BACK의 "쓴 돈" (F10). 제목 오른쪽 "수정"을 누르면 목록이 금액·통화 칸으로 바뀌어 줄마다 고쳐 저장한다.
// 저장은 기존 updateItem을 쓴다. 금액·통화 말고는 원래 값을 그대로 보낸다.

import { useActionState, useState, type ReactNode } from "react";
import { updateItem, type ItemActionState } from "@/app/actions/items";
import { CURRENCIES, formatTime, type Item } from "@/lib/items/types";
import { FIELD } from "./form-styles";
import { CostList } from "./schedule-sections";

function CostRow({ item }: { item: Item }) {
  const [state, action, pending] = useActionState<ItemActionState, FormData>(updateItem.bind(null, item.id, item.trip_id), { error: null, saved: null });
  return (
    <li>
      <form action={action} className="flex flex-col gap-1.5">
        {/* 금액·통화 말고는 원래 값 그대로 */}
        <input type="hidden" name="kind" value={item.kind} />
        <input type="hidden" name="day" value={item.day} />
        <input type="hidden" name="time" value={formatTime(item.time)} />
        <input type="hidden" name="name" value={item.name} />
        <input type="hidden" name="address" value={item.address} />
        <input type="hidden" name="memo" value={item.memo} />
        <input type="hidden" name="link" value={item.link} />
        <p className="truncate text-sm">{item.name}</p>
        <div className="flex items-center gap-2">
          <input
            name="costAmount"
            inputMode="decimal"
            aria-label={`${item.name} 금액`}
            defaultValue={item.cost_amount === null ? "" : String(Number(item.cost_amount))}
            className={`${FIELD} min-w-0 flex-1 py-1.5`}
          />
          <select name="costCurrency" aria-label={`${item.name} 통화`} defaultValue={item.cost_currency ?? ""} className={`${FIELD} w-24 py-1.5`}>
            <option value="">없음</option>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button type="submit" disabled={pending} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 transition active:scale-95 disabled:opacity-50">
            {pending ? "…" : state.saved ? "✓" : "저장"}
          </button>
        </div>
        {state.error && <p className="text-xs text-rose-300">{state.error}</p>}
      </form>
    </li>
  );
}

export function CostSection({ items, companions, readOnly, title, panelClassName }: { items: Item[]; companions: number; readOnly: boolean; title: ReactNode; panelClassName: string }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {title}
        {!readOnly && items.length > 0 && (
          <button
            type="button"
            aria-pressed={editing}
            onClick={() => setEditing((v) => !v)}
            className={`rounded-full border px-3 py-1 text-xs transition active:scale-95 ${editing ? "border-white bg-white font-semibold text-zinc-900" : "border-white/25 hover:bg-white/10"}`}
          >
            {editing ? "완료" : "수정"}
          </button>
        )}
      </div>
      <div className={`${panelClassName} p-4`}>
        {editing ? (
          <ul className="flex flex-col gap-3 [color-scheme:dark]">
            {items.map((item) => (
              <CostRow key={item.updated_at + item.id} item={item} />
            ))}
          </ul>
        ) : (
          <CostList items={items} companions={companions} />
        )}
      </div>
    </div>
  );
}
