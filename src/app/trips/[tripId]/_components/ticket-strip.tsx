"use client";

// 매거진 맨 위(제목 아래)의 예약 카드 줄 (F10). 교통(비행기 표 등)과 숙소를 표 모양 카드로 보여 주고,
// 누르면 팝업으로 자세한 정보(일차·날짜·시각·주소·메모·링크·비용)를 보여 준다. 팝업에서 수정·삭제도 한다.

import { useRef, useState, useTransition, type RefObject } from "react";
import { deleteItem, updateItem } from "@/app/actions/items";
import { formatCost, formatTime, ITEM_KIND_LABELS, type Item } from "@/lib/items/types";
import type { TripDay } from "@/lib/trips/days";
import { ItemForm } from "./item-form";

type Props = { items: Item[]; days: TripDay[]; readOnly: boolean };

function PlaneIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}

function BedIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />
    </svg>
  );
}

function when(item: Item, days: TripDay[]): string {
  const date = days.find((d) => d.day === item.day)?.date;
  return [`DAY ${item.day}`, date, formatTime(item.time)].filter(Boolean).join(" · ");
}

// 팝업: 자세한 정보 → (수정 누르면) 수정 폼
function TicketDialog({ item, days, readOnly, dialogRef }: { item: Item; days: TripDay[]; readOnly: boolean; dialogRef: RefObject<HTMLDialogElement | null> }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const cost = formatCost(item.cost_amount, item.cost_currency);
  const Icon = item.kind === "transport" ? PlaneIcon : BedIcon;

  function close() {
    dialogRef.current?.close();
  }

  function onDelete() {
    if (!window.confirm(`"${item.name}" 항목을 지울까요?`)) return;
    startDelete(async () => {
      const result = await deleteItem(item.id, item.trip_id);
      setError(result.error);
      if (!result.error) close();
    });
  }

  const rows: [string, string][] = [
    ["종류", ITEM_KIND_LABELS[item.kind]],
    ["언제", when(item, days)],
    [item.kind === "transport" ? "편명·노선" : "주소", item.address],
    ["비용", cost],
  ];

  return (
    <dialog
      ref={dialogRef}
      aria-label={`${item.name} 자세히`}
      onClose={() => setEditing(false)}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm dark:bg-zinc-950 dark:text-zinc-100"
    >
      <div className="flex items-start gap-3 bg-zinc-900 px-5 py-4 text-white">
        <span className="mt-0.5 rounded-full bg-white/15 p-2">
          <Icon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-widest text-white/60 uppercase">{item.kind === "transport" ? "Ticket" : "Stay"}</p>
          <h2 className="text-xl font-bold break-words">{item.name}</h2>
        </div>
        <button type="button" onClick={close} aria-label="닫기" className="rounded-full px-2 py-1 text-white/70 transition hover:bg-white/15 hover:text-white">
          ✕
        </button>
      </div>

      {editing ? (
        <div className="max-h-[70vh] overflow-y-auto p-5">
          <ItemForm
            key={item.updated_at}
            action={updateItem.bind(null, item.id, item.trip_id)}
            days={days}
            item={item}
            submitLabel="고치기"
            onSaved={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-5 text-sm">
          <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-2">
            {rows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-zinc-500 dark:text-zinc-400">{k}</dt>
                  <dd className="break-words">{v}</dd>
                </div>
              ))}
          </dl>
          {item.memo && <p className="rounded-lg bg-zinc-100 p-3 whitespace-pre-wrap break-words dark:bg-zinc-900">{item.memo}</p>}
          {item.link && (
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="truncate text-sky-600 hover:underline">
              예약 링크 열기 ↗
            </a>
          )}
          {error && <p className="text-rose-600">{error}</p>}
          {!readOnly && (
            <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="rounded-full px-4 py-2 text-rose-600 transition hover:bg-rose-50 active:scale-95 disabled:opacity-50 dark:hover:bg-rose-500/10"
              >
                {deleting ? "지우는 중…" : "삭제"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-full bg-zinc-900 px-4 py-2 text-white transition hover:bg-zinc-700 active:scale-95 dark:bg-white dark:text-zinc-900"
              >
                수정
              </button>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

// 표 모양 카드 하나. 왼쪽 아이콘·이름, 아래 날짜, 오른쪽 끝에 절취선.
function Ticket({ item, days, readOnly, delay }: { item: Item; days: TripDay[]; readOnly: boolean; delay: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const Icon = item.kind === "transport" ? PlaneIcon : BedIcon;
  return (
    <li className="shrink-0 snap-start">
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        style={{ animationDelay: `${delay}ms` }}
        className="group relative flex h-full w-60 flex-col gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 text-left text-white shadow-lg shadow-black/20 backdrop-blur-md transition duration-300 ease-out hover:-translate-y-1 hover:border-white/40 hover:bg-white/20 hover:shadow-2xl active:scale-[0.98] motion-reduce:transition-none"
      >
        <div className="flex items-center gap-2 text-xs text-white/70">
          <Icon className="size-4" />
          <span>{ITEM_KIND_LABELS[item.kind]}</span>
          {item.address && <span className="ml-auto truncate font-mono">{item.address}</span>}
        </div>
        <p className="text-lg leading-tight font-semibold break-words">{item.name}</p>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-dashed border-white/25 pt-2 text-xs text-white/80">
          <span className="font-mono">{when(item, days)}</span>
          <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
        </div>
      </button>
      <TicketDialog key={item.updated_at} item={item} days={days} readOnly={readOnly} dialogRef={dialogRef} />
    </li>
  );
}

export function TicketStrip({ items, days, readOnly }: Props) {
  if (items.length === 0) {
    return <p className="text-sm text-white/70">비행기 표·숙소를 넣으면 여기에 예약 카드로 나옵니다.</p>;
  }
  return (
    <ul aria-label="교통·숙소 예약" className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pt-2 pb-4">
      {items.map((item, i) => (
        <Ticket key={item.id} item={item} days={days} readOnly={readOnly} delay={i * 80} />
      ))}
    </ul>
  );
}
