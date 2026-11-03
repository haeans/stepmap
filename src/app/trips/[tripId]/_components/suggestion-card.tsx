"use client";

// F18: 매거진 DAY 안의 "추천" 카드. 모양은 장소 카드(place-card.tsx)와 같고, 아직 저장 전이라 흐리게(투명하게) 보인다.
// 누르면 서랍이 열려 자세한 내용·추천 이유와 [넣기][고치기][빼기]가 나온다.
// 넣기: 자동 추출 저장(saveExtractedItems)으로 저장 → 진짜 장소 카드로 바뀐다. 고치기: 저장 전 추천값만 고친다. 빼기: 추천만 지운다.
// place-card.tsx는 F16이 고치는 파일이라 건드리지 않고 같은 모양을 여기서 따로 그린다.

import { useActionState, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { saveExtractedItems } from "@/app/actions/extract";
import { formatCost, ITEM_KIND_LABELS } from "@/lib/items/types";
import { parseItemForm, type ItemInput } from "@/lib/items/validation";
import type { TripDay } from "@/lib/trips/days";
import { EDIT_DIALOG, EditHeader } from "./edit-sheet";
import { PRIMARY } from "./form-styles";
import { ItemFields } from "./item-fields";
import { removeSuggestion, updateSuggestion, type PendingSuggestion } from "./suggestions";

type Props = { tripId: string; suggestion: PendingSuggestion; color: string; days: TripDay[] };

// 저장 액션이 읽는 미리보기 폼 모양(items.0.*)으로 바꾼다.
function toForm(item: ItemInput): FormData {
  const form = new FormData();
  const p = "items.0.";
  form.set("count", "1");
  form.set(`${p}include`, "on");
  form.set(`${p}kind`, item.kind);
  form.set(`${p}day`, String(item.day));
  form.set(`${p}time`, item.time ?? "");
  form.set(`${p}name`, item.name);
  form.set(`${p}address`, item.address);
  form.set(`${p}memo`, item.memo);
  form.set(`${p}link`, item.link);
  form.set(`${p}costAmount`, item.costAmount === null ? "" : String(item.costAmount));
  form.set(`${p}costCurrency`, item.costCurrency ?? "");
  return form;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-3 py-2">
      <dt className="text-xs text-white/55">{label}</dt>
      <dd className="min-w-0 text-sm break-words">{children}</dd>
    </div>
  );
}

const MARK = <span className="text-amber-200"> (추천)</span>;

export function SuggestionCard({ tripId, suggestion, color, days }: Props) {
  const { item, suggest } = suggestion;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const drawerId = useId();

  const cost = formatCost(item.costAmount, item.costCurrency);
  const date = days.find((d) => d.day === item.day)?.date;

  function onAccept() {
    startSave(async () => {
      const result = await saveExtractedItems(tripId, { error: null, saved: null }, toForm(item));
      if (result.error) setError(result.error);
      else removeSuggestion(tripId, suggestion.id);
    });
  }

  // 고치기: DB에 저장하지 않고 추천값만 바꾼다.
  async function onEdit(_prev: string | null, form: FormData): Promise<string | null> {
    const parsed = parseItemForm(form);
    if (!parsed.ok) return parsed.error;
    updateSuggestion(tripId, suggestion.id, parsed.value);
    dialogRef.current?.close();
    return null;
  }
  const [editError, editAction, editing] = useActionState(onEdit, null);

  return (
    <article
      aria-label={`추천 일정: ${item.name}`}
      className={`overflow-hidden rounded-2xl border border-dashed bg-white/[0.04] text-white shadow-lg shadow-black/20 backdrop-blur-xl transition duration-300 ease-out motion-reduce:transition-none ${
        open ? "border-white/45 opacity-95" : "border-white/30 opacity-60 hover:-translate-y-1 hover:opacity-85 motion-reduce:hover:translate-y-0"
      }`}
    >
      {/* 머리: 장소 카드와 같은 모양(일차 색 그라데이션 + 시각·이름). 누르면 서랍이 열린다. */}
      <button type="button" aria-expanded={open} aria-controls={drawerId} onClick={() => setOpen((v) => !v)} className="group block w-full text-left">
        <div className="relative h-36 overflow-hidden sm:h-40">
          <div aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${color}66, ${color}22 60%, transparent)` }} />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          {item.time && <span className="absolute top-3 left-3 rounded-full bg-black/45 px-2.5 py-1 font-mono text-xs backdrop-blur-md">{item.time}</span>}
          <span className="absolute top-3 right-3 rounded-full bg-amber-300/90 px-2.5 py-1 text-xs font-semibold text-zinc-900">추천</span>
          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-white/70">
                {ITEM_KIND_LABELS[item.kind]}
                {item.address && ` · ${item.address}`}
              </p>
              <h4 className="text-lg leading-tight font-semibold break-words drop-shadow">{item.name}</h4>
            </div>
            <span
              aria-hidden
              className={`flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition duration-300 ${open ? "rotate-180 bg-white/30" : "group-hover:bg-white/25"}`}
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </div>
        </div>
      </button>

      {/* 서랍 */}
      <div
        id={drawerId}
        className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={`px-4 pt-1 pb-4 transition-opacity duration-300 ${open ? "opacity-100 delay-150" : "opacity-0"}`} inert={!open}>
            <dl className="divide-y divide-white/10">
              <Row label="시간">
                {`DAY ${item.day}`}
                {suggest.day && MARK}
                {date && ` · ${date}`}
                {" · "}
                {item.time || "시각 미정"}
                {suggest.time && item.time && MARK}
              </Row>
              {suggest.reason && <Row label="추천 이유">{suggest.reason}</Row>}
              {cost && <Row label="비용">{cost}</Row>}
              {item.address && <Row label="주소">{item.address}</Row>}
              {item.memo && <Row label="메모"><p className="whitespace-pre-wrap">{item.memo}</p></Row>}
            </dl>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-1 text-sm">
              <button type="button" onClick={() => removeSuggestion(tripId, suggestion.id)} disabled={saving} className="rounded-full px-3 py-1.5 text-rose-300 transition hover:bg-rose-500/20 active:scale-95 disabled:opacity-50">
                빼기
              </button>
              <button type="button" onClick={() => dialogRef.current?.showModal()} disabled={saving} className="rounded-full px-3 py-1.5 transition hover:bg-white/15 active:scale-95 disabled:opacity-50">
                고치기
              </button>
              <button type="button" onClick={onAccept} disabled={saving} className="rounded-full bg-white px-4 py-1.5 font-semibold text-zinc-900 transition hover:bg-white/85 active:scale-95 disabled:opacity-50">
                {saving ? "넣는 중…" : "넣기"}
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
          </div>
        </div>
      </div>

      <dialog ref={dialogRef} aria-label={`${item.name} 추천 고치기`} data-tone="dark" className={EDIT_DIALOG}>
        <EditHeader title="추천 고치기" sub="저장 전 추천값만 바꿉니다" onClose={() => dialogRef.current?.close()} closeLabel="고치기 창 닫기" />
        <div className="max-h-[75vh] overflow-y-auto px-5 pb-5">
          <form key={JSON.stringify(item)} action={editAction} className="flex flex-col gap-4">
            <ItemFields days={days} values={item} />
            {editError && <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-500">{editError}</p>}
            <button type="submit" disabled={editing} className={`${PRIMARY} mt-1`}>
              고치기
            </button>
          </form>
        </div>
      </dialog>
    </article>
  );
}
