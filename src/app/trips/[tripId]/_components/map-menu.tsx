"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { LogoMark } from "@/app/_components/app-header";
import { signOut } from "@/app/actions/auth";
import { ShareButton } from "./share-button";

const ITEM = "w-full rounded-xl px-3 py-2 text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-900";

// 지도 탭 오른쪽 위 로고 메뉴: 이메일 → 여행 목록 → 공유 → 로그아웃 (F14 결정 8·9)
// 지도 탭에는 머리글이 없어서 머리글의 버튼을 여기로 모은다.
export function MapMenu({ tripId, email, readOnly }: { tripId: string; email: string; readOnly: boolean }) {
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
    <div ref={rootRef} className="absolute top-4 right-4 z-20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label="메뉴"
        className="flex size-11 items-center justify-center rounded-full border border-zinc-200 bg-white/90 shadow-lg backdrop-blur-xl transition hover:scale-105 active:scale-95 dark:border-zinc-800 dark:bg-zinc-950/90"
      >
        <LogoMark />
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute top-13 right-0 flex w-60 flex-col gap-0.5 rounded-2xl border border-zinc-200 bg-white/95 p-2 text-sm shadow-xl backdrop-blur-xl transition duration-200 starting:-translate-y-1 starting:opacity-0 dark:border-zinc-800 dark:bg-zinc-950/95"
        >
          <p className="truncate px-3 py-2 text-xs text-zinc-500">{email}</p>
          <Link href="/" className={ITEM}>
            ← 여행 목록
          </Link>
          {readOnly ? (
            <p className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">공유받음 · 보기 전용</p>
          ) : (
            <ShareButton tripId={tripId} className={ITEM} />
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
