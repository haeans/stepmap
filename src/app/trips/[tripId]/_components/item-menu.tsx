"use client";

// 리스트 탭(F11) 줄 끝의 "⋯" 메뉴. 수정(창)과 삭제를 고른다. ItemCard와 같은 서버 액션·폼을 쓴다.

import { useEffect, useRef, useState, useTransition } from "react";
import { deleteItem, updateItem } from "@/app/actions/items";
import type { Item } from "@/lib/items/types";
import type { TripDay } from "@/lib/trips/days";
import { EDIT_DIALOG, EditHeader } from "./edit-sheet";
import { ItemForm } from "./item-form";

export function ItemMenu({ item, days }: { item: Item; days: TripDay[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // 메뉴 밖을 누르거나 Esc를 누르면 닫는다.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onEdit() {
    setOpen(false);
    dialogRef.current?.showModal();
  }

  function onDelete() {
    setOpen(false);
    if (!window.confirm(`"${item.name}" 항목을 지울까요?`)) return;
    startDelete(async () => {
      const result = await deleteItem(item.id, item.trip_id);
      setError(result.error);
    });
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={`${item.name} 메뉴`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={deleting}
        onClick={() => setOpen((v) => !v)}
        className="rounded px-1.5 leading-6 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        ⋯
      </button>
      {open && (
        <div role="menu" className="absolute top-7 right-0 z-10 flex w-24 flex-col rounded-md border border-zinc-200 bg-white py-1 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <button type="button" role="menuitem" onClick={onEdit} className="px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800">
            수정
          </button>
          <button type="button" role="menuitem" onClick={onDelete} className="px-3 py-1.5 text-left text-red-600 hover:bg-red-50 dark:hover:bg-zinc-800">
            삭제
          </button>
        </div>
      )}
      {error && <p className="absolute top-7 right-0 z-10 w-48 rounded bg-white p-2 text-xs text-red-600 shadow dark:bg-zinc-900">{error}</p>}

      <dialog
        ref={dialogRef}
        aria-label={`${item.name} 수정`}
        data-tone="dark"
        className={EDIT_DIALOG}
      >
        <EditHeader title="항목 수정" sub={item.name} onClose={() => dialogRef.current?.close()} closeLabel="수정 창 닫기" />
        <div className="max-h-[75vh] overflow-y-auto px-5 pb-5">
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
    </div>
  );
}
