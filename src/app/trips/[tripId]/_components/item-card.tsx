"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { deleteItem, updateItem } from "@/app/actions/items";
import { GEOCODED_KINDS, formatCost, formatTime, ITEM_KIND_LABELS, type Item } from "@/lib/items/types";
import type { TripDay } from "@/lib/trips/days";
import { ItemForm } from "./item-form";

type Props = { item: Item; days: TripDay[]; compact?: boolean; readOnly?: boolean };

// 항목 하나. 수정은 창(dialog)으로, 삭제는 확인 후 바로 지운다.
export function ItemCard({ item, days, compact = false, readOnly = false }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    if (!window.confirm(`"${item.name}" 항목을 지울까요?`)) return;
    startDelete(async () => {
      const result = await deleteItem(item.id, item.trip_id);
      setError(result.error);
    });
  }

  const cost = formatCost(item.cost_amount, item.cost_currency);
  const missingPlace = GEOCODED_KINDS.includes(item.kind) && item.lat === null;
  const onMap = GEOCODED_KINDS.includes(item.kind) && item.lat !== null;
  const meta = [formatTime(item.time), ITEM_KIND_LABELS[item.kind], cost].filter(Boolean).join(" · ");

  return (
    <div className={compact ? "flex flex-col gap-0.5 py-1" : "flex flex-col gap-1 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {onMap ? (
            // R-07: 1화면에서 장소를 누르면 지도로 넘어가 그 핀을 고른다.
            <Link href={`/trips/${item.trip_id}?view=map&item=${item.id}`} className="font-medium break-words hover:underline" title="지도에서 보기">
              {item.name}
            </Link>
          ) : (
            <p className="font-medium break-words">{item.name}</p>
          )}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{meta}</p>
        </div>
        {!readOnly && (
          <div className="flex shrink-0 gap-1 text-xs">
            <button type="button" onClick={() => dialogRef.current?.showModal()} className="rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900">
              수정
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="rounded px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-zinc-900"
            >
              {deleting ? "지우는 중…" : "삭제"}
            </button>
          </div>
        )}
      </div>
      {item.address && <p className="text-xs text-zinc-600 break-words dark:text-zinc-400">{item.address}</p>}
      {missingPlace && <p className="text-xs text-amber-600">위치 없음: 지도에 표시되지 않습니다. 주소를 넣어 다시 저장해 보세요.</p>}
      {item.memo && <p className="text-sm whitespace-pre-wrap break-words">{item.memo}</p>}
      {item.link && (
        <a href={item.link} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-blue-600 hover:underline">
          {item.link}
        </a>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {!readOnly && (
        <dialog
          ref={dialogRef}
          aria-label={`${item.name} 수정`}
          className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg p-0 backdrop:bg-black/40 dark:bg-zinc-950 dark:text-zinc-100"
        >
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="font-semibold">항목 수정</h2>
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label="수정 창 닫기" className="rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900">
              ✕
            </button>
          </div>
          <div className="max-h-[80vh] overflow-y-auto p-4">
            <ItemForm
              action={updateItem.bind(null, item.id, item.trip_id)}
              days={days}
              item={item}
              submitLabel="고치기"
              onSaved={() => dialogRef.current?.close()}
            />
          </div>
        </dialog>
      )}
    </div>
  );
}
