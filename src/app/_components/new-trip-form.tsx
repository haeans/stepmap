"use client";

import { useActionState, useState } from "react";
import { createTrip, type ActionState } from "@/app/actions/trips";
import { destinationProblem } from "@/lib/trips/validation";

const INPUT = "rounded-xl border border-line bg-surface px-3.5 py-2.5 placeholder:text-zinc-400";
const LABEL = "flex flex-col gap-1.5 text-sm font-medium text-muted";
const PRIMARY =
  "rounded-full bg-foreground px-5 py-2.5 font-medium text-background shadow-sm hover:opacity-90 disabled:opacity-50";

export function NewTripForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(createTrip, { error: null });

  if (!open) {
    return (
      // 새 여행 만들기 버튼: 로고 그림(발자국·핀) + "+" + "새 발자국" (C9 F21). 하늘 배경 위에 밝은 반투명 알약으로 둔다(F32).
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex items-center gap-2.5 self-start rounded-full border border-white/70 bg-surface/60py-2 pr-5 pl-3 font-medium text-[#603820] shadow-md backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-lg active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-line dark:text-foreground"
      >
        <span aria-hidden className="relative flex">
          {/* eslint-disable-next-line @next/next/no-img-element -- 브랜드 이미지는 <img>로 쓴다(B49) */}
          <img src="/brand/logo-mark.png" alt="" width={67} height={60} className="h-8 w-auto dark:brightness-0 dark:invert" />
          <span className="absolute -right-1.5 -bottom-1 flex size-4 items-center justify-center rounded-full bg-accent text-xs leading-none font-bold text-white ring-2 ring-surface">
            +
          </span>
        </span>
        새 발자국
      </button>
    );
  }

  // 이름·목적지·기간은 필수(C9 F24). 서버(parseTripForm)도 같은 규칙으로 다시 막는다. 동행 인원은 받지 않는다.
  return (
    <form action={action} className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6 shadow-md">
      <p className="font-serif text-xl font-bold">새 발자국</p>
      <label className={LABEL}>
        여행 이름
        <input name="title" required maxLength={100} placeholder="예: 홍콩 3박 4일" className={INPUT} autoFocus />
      </label>
      <label className={LABEL}>
        목적지
        <input
          name="destination"
          required
          maxLength={100}
          placeholder="예: 홍콩"
          className={INPUT}
          onChange={(e) => e.currentTarget.setCustomValidity(e.currentTarget.value ? (destinationProblem(e.currentTarget.value) ?? "") : "")}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={LABEL}>
          시작일
          <input type="date" name="startDate" required className={INPUT} />
        </label>
        <label className={LABEL}>
          종료일
          <input type="date" name="endDate" required className={INPUT} />
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
