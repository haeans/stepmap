"use client";

// 예약 정보 줄 (C8 F20). 소유자에게만 서버가 item.secret을 보낸다. 공유받은 사람은 secret이 없어 이 줄이 보이지 않는다.
// - 예약번호: 가려서(K7••••XM) 보이고, 누르면 원래 값. 다시 누르면 가린다.
// - 예약 링크: owner는 도메인만 보이고 "주소 보기"로 원래 주소, secret(토큰이 든 링크)은 주소를 보여 주지 않고 "열기"만.

import { useState } from "react";
import { maskCode, maskLink } from "@/lib/items/sensitive";
import type { ItemSecret } from "@/lib/items/types";

// light: 흰 카드 위, dark: 어두운 사진·유리 패널 위, current: 둘러싼 글자색을 따른다
type Tone = "light" | "dark" | "current";

export function BookingInfo({ secret: s, tone = "light", className = "" }: { secret?: ItemSecret | null; tone?: Tone; className?: string }) {
  const [showNo, setShowNo] = useState(false);
  const [showLink, setShowLink] = useState(false);
  if (!s || (!s.booking_no && !s.booking_link)) return null;

  const sub = { light: "text-zinc-500", dark: "text-white/60", current: "opacity-60" }[tone];
  const chip = `rounded-full border px-2.5 py-0.5 text-xs transition active:scale-95 ${
    { light: "border-zinc-300 hover:bg-zinc-100", dark: "border-white/25 hover:bg-white/15", current: "border-current/25 hover:bg-current/10" }[tone]
  }`;

  return (
    <div className={`flex flex-col gap-1.5 text-sm ${className}`}>
      {s.booking_no && (
        <div className="flex min-w-0 items-center gap-2">
          <span className={`shrink-0 ${sub}`}>예약번호</span>
          <span className="min-w-0 truncate font-mono tracking-wide">{showNo ? s.booking_no : maskCode(s.booking_no)}</span>
          <button type="button" onClick={() => setShowNo((v) => !v)} aria-pressed={showNo} className={`ml-auto shrink-0 ${chip}`}>
            {showNo ? "가리기" : "보기"}
          </button>
        </div>
      )}
      {s.booking_link && (
        <div className="flex min-w-0 items-center gap-2">
          <span className={`shrink-0 ${sub}`}>예약 링크</span>
          <span className="min-w-0 truncate font-mono text-xs">
            {s.level === "secret" ? "주소 숨김" : showLink ? s.booking_link : maskLink(s.booking_link)}
          </span>
          <span className="ml-auto flex shrink-0 gap-1.5">
            {s.level === "owner" && (
              <button type="button" onClick={() => setShowLink((v) => !v)} aria-pressed={showLink} className={chip}>
                {showLink ? "가리기" : "주소 보기"}
              </button>
            )}
            <a href={s.booking_link} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className={chip}>
              열기 ↗
            </a>
          </span>
        </div>
      )}
      <p className={`text-[11px] ${sub}`}>나에게만 보여요 · 공유받은 사람에게는 보이지 않아요</p>
    </div>
  );
}
