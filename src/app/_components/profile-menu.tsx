"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { signOut } from "@/app/actions/auth";
import { ShareButton } from "@/app/trips/[tripId]/_components/share-button";

const ITEM = "w-full rounded-xl px-3 py-2 text-left text-zinc-900 transition hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900";

// 프로필 버튼과 메뉴 (C9 F23). 이메일 → 여행 목록 → 공유 → 로그아웃.
// 여행 화면(trip)에서만 여행 목록·공유 줄이 있다. 공유는 소유자만, 공유받았으면 "공유받음 · 보기 전용".
// 지도 탭의 로고 메뉴(F14 결정 8)를 옮겨 와 목록·매거진·지도가 같이 쓴다.
export function ProfileMenu({ email, trip }: { email: string; trip?: { id: string; readOnly: boolean } }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // 바깥을 누르거나 Esc를 누르면 닫는다. 공유 창이 열려 있으면 닫지 않는다(공유 창이 이 메뉴 안에 있다).
  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    const sharing = () => root?.querySelector("dialog[open]") !== null;
    const onPointer = (e: PointerEvent) => {
      if (!sharing() && !root?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sharing()) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label="프로필 메뉴"
        className="flex size-11 items-center justify-center rounded-full transition hover:scale-105 active:scale-95"
      >
        <DefaultAvatar />
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute top-13 right-0 z-30 flex w-60 flex-col gap-0.5 rounded-2xl border border-zinc-200 bg-white/95 p-2 text-sm shadow-xl backdrop-blur-xl transition duration-200 starting:-translate-y-1 starting:opacity-0 dark:border-zinc-800 dark:bg-zinc-950/95"
        >
          <p className="truncate px-3 py-2 text-xs text-zinc-500">{email}</p>
          {trip && (
            <>
              <Link href="/" className={ITEM}>
                ← 여행 목록
              </Link>
              {trip.readOnly ? (
                <p className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">공유받음 · 보기 전용</p>
              ) : (
                <ShareButton tripId={trip.id} className={ITEM} />
              )}
            </>
          )}
          <form action={signOut}>
            <button type="submit" className={ITEM}>
              로그아웃
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// 프로필 사진을 정하지 않았을 때의 기본 모양: 회색 동그라미에 흰 사람 실루엣
function DefaultAvatar() {
  return (
    <svg aria-hidden viewBox="0 0 40 40" className="size-10 rounded-full shadow-sm ring-1 ring-black/5">
      <circle cx="20" cy="20" r="20" fill="#c4c7cc" />
      <circle cx="20" cy="15.5" r="7" fill="#fff" />
      <path d="M6.5 34.5c2.2-6.3 7.4-9.5 13.5-9.5s11.3 3.2 13.5 9.5A19.9 19.9 0 0 1 20 40a19.9 19.9 0 0 1-13.5-5.5z" fill="#fff" />
    </svg>
  );
}
