"use client";

import { useActionState, useState } from "react";
import { createTrip, type ActionState } from "@/app/actions/trips";

const INPUT = "rounded-xl border border-line bg-surface px-3.5 py-2.5 placeholder:text-zinc-400";
const LABEL = "flex flex-col gap-1.5 text-sm font-medium text-muted";
const PRIMARY =
  "rounded-full bg-foreground px-5 py-2.5 font-medium text-background shadow-sm hover:opacity-90 disabled:opacity-50";

export function NewTripForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(createTrip, { error: null });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${PRIMARY} flex items-center gap-1.5 self-start`}
      >
        <span aria-hidden className="text-lg leading-none">＋</span>
        새 여행 만들기
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6 shadow-md">
      <p className="font-serif text-xl font-bold">새 여행</p>
      <label className={LABEL}>
        여행 이름
        <input name="title" required maxLength={100} placeholder="예: 홍콩 3박 4일" className={INPUT} autoFocus />
      </label>
      <label className={LABEL}>
        목적지
        <input name="destination" maxLength={100} placeholder="예: 홍콩" className={INPUT} />
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_7rem]">
        <label className={LABEL}>
          시작일
          <input type="date" name="startDate" className={INPUT} />
        </label>
        <label className={LABEL}>
          종료일
          <input type="date" name="endDate" className={INPUT} />
        </label>
        <label className={LABEL}>
          동행 인원
          <input type="number" name="companions" min={1} max={99} defaultValue={1} className={INPUT} />
        </label>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className={PRIMARY}
        >
          {pending ? "만드는 중…" : "만들기"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full px-5 py-2.5 text-muted hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800">
          취소
        </button>
      </div>
    </form>
  );
}
