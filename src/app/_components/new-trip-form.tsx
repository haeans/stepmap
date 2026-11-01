"use client";

import { useActionState, useState } from "react";
import { createTrip, type ActionState } from "@/app/actions/trips";

const INPUT = "rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950";

export function NewTripForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(createTrip, { error: null });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
      >
        새 여행 만들기
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <label className="flex flex-col gap-1 text-sm">
        여행 이름
        <input name="title" required maxLength={100} placeholder="예: 홍콩 3박 4일" className={INPUT} autoFocus />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        목적지
        <input name="destination" maxLength={100} placeholder="예: 홍콩" className={INPUT} />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          시작일
          <input type="date" name="startDate" className={INPUT} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          종료일
          <input type="date" name="endDate" className={INPUT} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          동행 인원
          <input type="number" name="companions" min={1} max={99} defaultValue={1} className={`${INPUT} w-24`} />
        </label>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "만드는 중…" : "만들기"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900">
          취소
        </button>
      </div>
    </form>
  );
}
