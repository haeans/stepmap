"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { deleteItem, updateItem } from "@/app/actions/items";
import { GEOCODED_KINDS, formatCost, formatTime, ITEM_KIND_LABELS, type Item } from "@/lib/items/types";
import type { TripDay } from "@/lib/trips/days";
import { BookingInfo } from "./booking-info";
import { EDIT_DIALOG, EditHeader } from "./edit-sheet";
import { ItemForm } from "./item-form";

type Props = { item: Item; days: TripDay[]; compact?: boolean; readOnly?: boolean };

// 항목 하나. 수정은 창(dialog)으로, 삭제는 확인 후 바로 지운다.
// 글자·버튼 색은 바깥 글자색을 따른다(매거진 사진 위 유리 카드에서 흰 글씨, F10).
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
    <div className={compact ? "flex flex-col gap-0.5 py-1" : "flex flex-col gap-1 rounded-lg p-3"}>
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
          <p className="text-xs opacity-60">{meta}</p>
        </div>
        {!readOnly && (
          <div className="flex shrink-0 gap-1 text-xs">
            <button type="button" onClick={() => dialogRef.current?.showModal()} className="rounded px-2 py-1 transition hover:bg-current/10 active:scale-95">
              수정
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="rounded px-2 py-1 text-rose-500 transition hover:bg-rose-500/15 active:scale-95 disabled:opacity-50"
            >
              {deleting ? "지우는 중…" : "삭제"}
            </button>
          </div>
        )}
      </div>
      {item.address && <p className="text-xs break-words opacity-70">{item.address}</p>}
      {missingPlace && <p className="text-xs text-amber-500">위치 없음: 지도에 표시되지 않습니다. 주소를 넣어 다시 저장해 보세요.</p>}
      {item.memo && <p className="text-sm whitespace-pre-wrap break-words">{item.memo}</p>}
      {item.link && (
        <a href={item.link} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-sky-500 hover:underline">
          {item.link}
        </a>
      )}
      <BookingInfo secret={item.secret} tone="current" />
      {error &&<p className="text-xs text-rose-500">{error}</p>}

      {!readOnly && (
        <dialog
          ref={dialogRef}
          aria-label={`${item.name} 수정`}
          data-tone="dark"
          className={EDIT_DIALOG}
        >
          <EditHeader title="항목 수정" sub={item.name} onClose={() => dialogRef.current?.close()} closeLabel="수정 창 닫기" />
          <div className="max-h-[75vh] overflow-y-auto px-5 pb-5">
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
