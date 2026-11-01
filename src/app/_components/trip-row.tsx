"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { deleteTrip, renameTrip, type ActionState } from "@/app/actions/trips";
import { formatTripPeriod, type Trip } from "@/lib/trips/types";

// shared: 공유받은 여행. "공유받음"을 표시하고 이름 수정·삭제 버튼을 숨긴다. (R-08)
export function TripRow({ trip, shared }: { trip: Trip; shared: boolean }) {
  const [editing, setEditing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (prev, form) => {
      const result = await renameTrip(trip.id, prev, form);
      if (!result.error) setEditing(false);
      return result;
    },
    { error: null },
  );

  function onDelete() {
    if (!window.confirm(`"${trip.title}" 여행을 지울까요? 지운 여행은 되돌릴 수 없습니다.`)) return;
    startDelete(async () => {
      const result = await deleteTrip(trip.id);
      setDeleteError(result.error);
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      {editing ? (
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input
            name="title"
            defaultValue={trip.title}
            required
            maxLength={100}
            autoFocus
            aria-label="여행 이름"
            className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button type="submit" disabled={pending} className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
            저장
          </button>
          <button type="button" onClick={() => setEditing(false)} className="rounded-md px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900">
            취소
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link href={`/trips/${trip.id}`} className="text-lg font-medium break-words hover:underline">
              {trip.title}
            </Link>
            {shared && <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">공유받음</span>}
          </div>
          {!shared && (
            <div className="flex gap-1 text-sm">
              <button type="button" onClick={() => setEditing(true)} className="rounded-md px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900">
                이름 수정
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="rounded-md px-3 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-zinc-900"
              >
                {deleting ? "지우는 중…" : "삭제"}
              </button>
            </div>
          )}
        </div>
      )}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {[trip.destination, formatTripPeriod(trip), `${trip.companions}명`].filter(Boolean).join(" · ")}
      </p>
      {(state.error || deleteError) && <p className="text-sm text-red-600">{state.error ?? deleteError}</p>}
    </li>
  );
}
