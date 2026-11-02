"use client";

// 매거진 DAY 장소 카드 (F10). 사진이 들어간 카드를 누르면 서랍처럼 아래로 펼쳐지며
// 그 일정에 필요한 것(시간, 티켓·입장료와 예약 링크, 주소, 메모, 지도)을 보여 준다. 수정·삭제도 여기서 한다.
// 사진: 직접 넣은 사진(photoUrl). 없으면 일차 색 그라데이션. (장소 사진 API는 쓰지 않는다 — 출처 미정)

import Link from "next/link";
import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import { deleteItem, updateItem } from "@/app/actions/items";
import { formatCost, formatTime, ITEM_KIND_LABELS, type Item } from "@/lib/items/types";
import type { TripDay } from "@/lib/trips/days";
import { ItemForm } from "./item-form";

type Props = { item: Item; photoUrl?: string | null; color: string; days: TripDay[]; readOnly: boolean };

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-3 py-2">
      <dt className="text-xs text-white/55">{label}</dt>
      <dd className="min-w-0 text-sm break-words">{children}</dd>
    </div>
  );
}

export function PlaceCard({ item, photoUrl = null, color, days, readOnly }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const drawerId = useId();

  const photo = photoUrl;
  const cost = formatCost(item.cost_amount, item.cost_currency);
  const date = days.find((d) => d.day === item.day)?.date;
  const time = formatTime(item.time);
  const onMap = item.lat !== null;
  // API 없이 좌표로 구글 지도를 여는 일반 링크
  const mapsUrl = onMap ? `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}` : null;

  function onDelete() {
    if (!window.confirm(`"${item.name}" 항목을 지울까요?`)) return;
    startDelete(async () => {
      const result = await deleteItem(item.id, item.trip_id);
      setError(result.error);
    });
  }

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white/[0.07] text-white shadow-lg shadow-black/30 backdrop-blur-xl transition duration-300 ease-out motion-reduce:transition-none ${
        open ? "border-white/35 bg-white/[0.12] shadow-2xl" : "border-white/15 hover:-translate-y-1 hover:border-white/35 hover:bg-white/[0.12] hover:shadow-2xl motion-reduce:hover:translate-y-0"
      }`}
    >
      {/* 머리: 사진 + 시각·이름. 누르면 서랍이 열린다. */}
      <button type="button" aria-expanded={open} aria-controls={drawerId} onClick={() => setOpen((v) => !v)} className="group block w-full text-left">
        <div className="relative h-36 overflow-hidden sm:h-40">
          {photo ? (
            <div
              role="img"
              aria-label={`${item.name} 사진`}
              className="absolute inset-0 bg-cover bg-center transition duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none"
              style={{ backgroundImage: `url("${photo}")` }}
            />
          ) : (
            <div aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${color}aa, ${color}33 60%, transparent)` }} />
          )}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
          {time && <span className="absolute top-3 left-3 rounded-full bg-black/45 px-2.5 py-1 font-mono text-xs backdrop-blur-md">{time}</span>}
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

      {/* 서랍: grid 행 높이 0fr → 1fr 로 부드럽게 열고 닫는다 */}
      <div
        id={drawerId}
        className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={`px-4 pt-1 pb-4 transition-opacity duration-300 ${open ? "opacity-100 delay-150" : "opacity-0"}`} inert={!open}>
            <dl className="divide-y divide-white/10">
              <Row label="시간">{[`DAY ${item.day}`, date, time || "시각 미정"].filter(Boolean).join(" · ")}</Row>
              <Row label="티켓·입장">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{cost || "비용 정보 없음"}</span>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-900 transition hover:bg-white/85 active:scale-95"
                    >
                      티켓·예약 열기 ↗
                    </a>
                  )}
                </div>
              </Row>
              {item.address && <Row label="주소">{item.address}</Row>}
              {item.memo && <Row label="메모"><p className="whitespace-pre-wrap">{item.memo}</p></Row>}
              {!onMap && <Row label="위치"><span className="text-amber-300">위치 없음: 지도에 표시되지 않습니다. 주소를 넣어 다시 저장해 보세요.</span></Row>}
            </dl>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              {onMap && (
                <Link href={`/trips/${item.trip_id}?view=map&item=${item.id}`} className="rounded-full border border-white/25 px-3 py-1.5 transition hover:bg-white/15 active:scale-95">
                  지도에서 보기
                </Link>
              )}
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/25 px-3 py-1.5 transition hover:bg-white/15 active:scale-95">
                  구글 지도 ↗
                </a>
              )}
              {!readOnly && (
                <span className="ml-auto flex gap-1">
                  <button type="button" onClick={() => dialogRef.current?.showModal()} className="rounded-full px-3 py-1.5 transition hover:bg-white/15 active:scale-95">
                    수정
                  </button>
                  <button type="button" onClick={onDelete} disabled={deleting} className="rounded-full px-3 py-1.5 text-rose-300 transition hover:bg-rose-500/20 active:scale-95 disabled:opacity-50">
                    {deleting ? "지우는 중…" : "삭제"}
                  </button>
                </span>
              )}
            </div>
            {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
          </div>
        </div>
      </div>

      {!readOnly && (
        <dialog
          ref={dialogRef}
          aria-label={`${item.name} 수정`}
          className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-zinc-900 backdrop:bg-black/50 backdrop:backdrop-blur-sm dark:bg-zinc-950 dark:text-zinc-100"
        >
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="font-semibold">항목 수정</h2>
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label="수정 창 닫기" className="rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900">
              ✕
            </button>
          </div>
          <div className="max-h-[80vh] overflow-y-auto p-4">
            <ItemForm
              key={item.updated_at}
              action={updateItem.bind(null, item.id, item.trip_id)}
              days={days}
              item={item}
              submitLabel="고치기"
              onSaved={() => dialogRef.current?.close()}
            />
          </div>
        </dialog>
      )}
    </article>
  );
}
