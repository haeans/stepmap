"use client";

// 매거진 BACK의 "쓴 돈" (F10). 제목 오른쪽 "수정"을 누르면 목록이 금액·통화 칸으로 바뀌어 줄마다 고쳐 저장한다.
// 저장은 기존 updateItem을 쓴다. 금액·통화 말고는 원래 값을 그대로 보낸다.
// C9 F27: 목록 아래에는 통화별 합계만 두고, "정산"을 누르면 인원을 넣어 통화별 1인당 금액을 본다(R-09 고침).

import { useActionState, useState, useTransition, type ReactNode } from "react";
import { updateItem, type ItemActionState } from "@/app/actions/items";
import { setCompanions } from "@/app/actions/trips";
import { formatAmount, summarizeCosts } from "@/lib/cost/summary";
import { CURRENCIES, formatTime, type Item } from "@/lib/items/types";
import { FIELD } from "./form-styles";
import { CostList } from "./schedule-sections";

// 통화 칸은 FIELD의 w-full이 w-24를 이겨 줄 전체를 차지하고 금액 칸이 30px로 눌려 입력할 수 없었다(C9 F27).
// 그래서 통화 칸 폭을 w-24!로 고정한다.
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
          <select name="costCurrency" aria-label={`${item.name} 통화`} defaultValue={item.cost_currency ?? ""} className={`${FIELD} w-24! shrink-0 py-1.5`}>
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

const TOGGLE = "rounded-full border px-3 py-1 text-xs transition active:scale-95";
const toggleTone = (on: boolean) => (on ? "border-white bg-white font-semibold text-zinc-900" : "border-white/25 hover:bg-white/10");
const MAX_PEOPLE = 99;

// 정산: 인원을 넣으면 통화별 1인당 금액. 반올림·환율 안내는 B24 그대로(summarizeCosts).
// 소유자가 바꾼 인원은 여행(trips.companions)에 저장한다. 공유받은 사람은 저장하지 않고 이 화면에서만 바꿔 본다.
function Settle({ tripId, items, companions, readOnly }: { tripId: string; items: Item[]; companions: number; readOnly: boolean }) {
  const [people, setPeople] = useState(companions);
  const [saved, setSaved] = useState(companions);
  const [draft, setDraft] = useState(String(companions));
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const totals = summarizeCosts(items, people);

  function commit(n: number) {
    const next = Math.min(MAX_PEOPLE, Math.max(1, Math.round(Number.isFinite(n) ? n : people)));
    setPeople(next);
    setDraft(String(next));
    if (readOnly || next === saved) return;
    startSave(async () => {
      const result = await setCompanions(tripId, next);
      setError(result.error);
      if (!result.error) setSaved(next);
    });
  }

  const step = "flex size-8 items-center justify-center rounded-full border border-white/25 text-base transition hover:bg-white/10 active:scale-95 disabled:opacity-40";
  return (
    <div className="flex flex-col gap-3 border-t border-white/15 pt-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="opacity-80">인원</span>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="인원 한 명 줄이기" onClick={() => commit(people - 1)} disabled={people <= 1} className={step}>
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_PEOPLE}
            aria-label="정산 인원"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commit(Number(draft))}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="w-14 rounded-xl border border-white/20 bg-white/5 py-1 text-center tabular-nums focus:border-white/50 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span>명</span>
          <button type="button" aria-label="인원 한 명 늘리기" onClick={() => commit(people + 1)} disabled={people >= MAX_PEOPLE} className={step}>
            +
          </button>
        </div>
      </div>
      <table aria-label="통화별 1인당 금액" className="w-full">
        <thead>
          <tr className="text-xs opacity-60">
            <th className="text-left font-normal">통화</th>
            <th className="text-right font-normal">1인당 ({people}명)</th>
          </tr>
        </thead>
        <tbody>
          {totals.map((t) => (
            <tr key={t.currency} className="font-semibold">
              <td className="py-0.5">{t.currency}</td>
              <td className="py-0.5 text-right tabular-nums">{formatAmount(t.perPerson, t.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs opacity-60" aria-live="polite">
        {error ?? (readOnly ? "공유받은 여행이라 인원은 저장되지 않아요." : saving ? "인원 저장 중…" : "인원은 이 여행에 저장돼요.")}
      </p>
    </div>
  );
}

export function CostSection({ tripId, items, companions, readOnly, title, panelClassName }: { tripId: string; items: Item[]; companions: number; readOnly: boolean; title: ReactNode; panelClassName: string }) {
  const [editing, setEditing] = useState(false);
  const [settling, setSettling] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {title}
        {items.length > 0 && (
          <div className="flex gap-1.5">
            {!editing && (
              <button type="button" aria-pressed={settling} onClick={() => setSettling((v) => !v)} className={`${TOGGLE} ${toggleTone(settling)}`}>
                정산
              </button>
            )}
            {!readOnly && (
              <button type="button" aria-pressed={editing} onClick={() => setEditing((v) => !v)} className={`${TOGGLE} ${toggleTone(editing)}`}>
                {editing ? "완료" : "수정"}
              </button>
            )}
          </div>
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
          <div className="flex flex-col gap-3">
            <CostList items={items} />
            {settling && items.length > 0 && <Settle tripId={tripId} items={items} companions={companions} readOnly={readOnly} />}
          </div>
        )}
      </div>
    </div>
  );
}
