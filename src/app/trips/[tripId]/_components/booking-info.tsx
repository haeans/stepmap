"use client";

// 예약 정보 줄 (C8 F20). 소유자에게만 서버가 item.secret을 보낸다. 공유받은 사람은 secret이 없어 이 줄이 보이지 않는다.
// - 예약번호: 가려서(K7••••XM) 보이고, 누르면 원래 값. 다시 누르면 가린다.
// - 예약 링크: 주소(도메인 포함)는 보이지 않고 "예약 링크 열기" 버튼만 둔다. owner·secret 모두 같다. (C9 F26 결정 4)
//   매거진 DAY 숙소 카드는 버튼을 "체크인" 줄 오른쪽에 따로 두므로(BookingLinkButton) 여기서는 hideLink로 뺀다.
// "나에게만 보여요" 안내 문구는 두지 않는다(C9 F26 결정 4).

import { useState } from "react";
import { maskCode } from "@/lib/items/sensitive";
import type { ItemSecret } from "@/lib/items/types";

// light: 흰 카드 위, dark: 어두운 사진·유리 패널 위, current: 둘러싼 글자색을 따른다
type Tone = "light" | "dark" | "current";

const chipClass = (tone: Tone) =>
  `rounded-full border px-2.5 py-0.5 text-xs transition active:scale-95 ${
    { light: "border-zinc-300 hover:bg-zinc-100", dark: "border-white/25 hover:bg-white/15", current: "border-current/25 hover:bg-current/10" }[tone]
  }`;

export function BookingLinkButton({ secret: s, tone = "light", className = "" }: { secret?: ItemSecret | null; tone?: Tone; className?: string }) {
  if (!s?.booking_link) return null;
  return (
    <a href={s.booking_link} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className={`whitespace-nowrap ${chipClass(tone)} ${className}`}>
      예약 링크 열기 ↗
    </a>
  );
}

export function BookingInfo({ secret: s, tone = "light", className = "", hideLink = false }: { secret?: ItemSecret | null; tone?: Tone; className?: string; hideLink?: boolean }) {
  const [showNo, setShowNo] = useState(false);
  const link = !hideLink && !!s?.booking_link;
  if (!s || (!s.booking_no && !link)) return null;

  const sub = { light: "text-zinc-500", dark: "text-white/60", current: "opacity-60" }[tone];
  const chip = chipClass(tone);

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
      {link && <BookingLinkButton secret={s} tone={tone} className="self-start" />}
    </div>
  );
}
