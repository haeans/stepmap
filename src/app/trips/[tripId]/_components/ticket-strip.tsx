"use client";

// 매거진 맨 위(제목 아래)의 GO 패널 (F10, C8 F16). 카드를 누르면 레퍼런스("GO 패널을 누르면 뜨는 창") 모양의 창이 뜬다.
// - 항공권(비행기 교통 항목), 승차권(기차·버스·배 교통 항목), 숙소 예약(숙소 항목), 교통 패스(패스·N일권·N시간권 등이 든 교통 항목):
//   예약·구매한 표만 들어간다. 택시·렌터카·리무진 같은 개인 교통과 교통카드는 넣지 않는다(go-info.ts transportKind, C10 F30).
//   종류마다 카드 하나로 묶고(F16), 카드 아래 좌우 화살표로 예약을 하나씩 넘겨 본다. 닫기·수정·삭제는 아이콘 버튼(웹은 카드 오른쪽 세로). 카드와 넘기는 순서는 날짜순.
// - 날씨(WeatherBadge): 여행 제목 오른쪽의 투명 패널. 누르면 날씨 창(F16).
// - 준비물(Checklist): 매거진 BACK에 둔다. DB(trip_checks)에 저장한다(C10 F31). 공유받은 사람은 보기만 한다.

import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode, type RefObject } from "react";
import { deleteItem, updateItem } from "@/app/actions/items";
import { compareItems } from "@/lib/items/group";
import { formatCost, formatTime, type Item } from "@/lib/items/types";
import type { TripDay } from "@/lib/trips/days";
import { CHECKLIST_MAX, PACKING_LABEL_MAX, type Check } from "@/lib/trips/packing";
import { isFlight, isPass, isTicket, parseFlight, parseRide, passLines, stayRange } from "@/lib/trips/go-info";
import { clothingTip, isRainy, weatherKind, weatherLabel, type TripWeather, type WeatherKind } from "@/lib/weather/codes";
import { maskCode } from "@/lib/items/sensitive";
import { BookingInfo, BookingLinkButton } from "./booking-info";
import { PhotoInfo } from "./place-card";
import { photoVersion, usePlacePhoto } from "./use-place-photo";
import { addCheck, deleteCheck, moveBrowserChecklist, toggleCheck, useChecklist } from "./checklist-store";
import { EDIT_PANEL, EditHeader } from "./edit-sheet";
import { ItemForm } from "./item-form";

type Props = {
  items: Item[]; // 교통·숙소 항목
  days: TripDay[];
  readOnly: boolean;
  coverImage: string;
  companions: number;
  photos?: Record<string, string>; // 항목 id → 직접 넣은 사진 (숙소 창, C10 F30)
};

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

// "2026-12-03" → "12.03 (목)"
function md(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  return `${iso.slice(5, 7)}.${iso.slice(8, 10)} (${WEEK[d.getUTCDay()]})`;
}

const dateOfDay = (days: TripDay[], day: number) => days.find((d) => d.day === day)?.date ?? null;

// ───────── 아이콘 ─────────

function Svg({ children, className = "size-5" }: { children: ReactNode; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const PlaneIcon = (p: { className?: string }) => (
  <Svg {...p}>
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  </Svg>
);
const BedIcon = (p: { className?: string }) => (
  <Svg {...p}>
    <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />
  </Svg>
);
const TrainIcon = (p: { className?: string }) => (
  <Svg {...p}>
    <rect x="5" y="3" width="14" height="14" rx="3" />
    <path d="M5 11h14M9 21l-2-4M15 21l2-4M9 14h.01M15 14h.01" />
  </Svg>
);

const BusIcon = (p: { className?: string }) => (
  <Svg {...p}>
    <rect x="4" y="3" width="16" height="15" rx="3" />
    <path d="M4 11h16M8 21v-3M16 21v-3M8 14.5h.01M16 14.5h.01" />
  </Svg>
);
const PassIcon = (p: { className?: string }) => (
  <Svg {...p}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M7 10h6M7 14h3" />
  </Svg>
);

function WeatherIcon({ kind, className = "size-6" }: { kind: WeatherKind; className?: string }) {
  const sun = (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  );
  const cloud = <path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z" />;
  if (kind === "sun") return <Svg className={`${className} text-amber-300`}>{sun}</Svg>;
  if (kind === "partly")
    return (
      <Svg className={className}>
        <path d="M12 2v2M4.9 4.9l1.4 1.4M2 12h2M19.1 4.9l-1.4 1.4" className="text-amber-300" stroke="currentColor" />
        <path d="M13 21H8a5 5 0 1 1 4.6-7h1.4a3.5 3.5 0 1 1 0 7z" />
      </Svg>
    );
  if (kind === "rain" || kind === "storm")
    return (
      <Svg className={`${className} text-sky-300`}>
        <path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3" />
        <path d="M16 14v6M8 14v6M12 16v6" />
      </Svg>
    );
  if (kind === "snow")
    return (
      <Svg className={className}>
        <path d="M20 17.6A5 5 0 0 0 18 8h-1.3A8 8 0 1 0 4 16.3" />
        <path d="M8 16h.01M8 20h.01M12 18h.01M12 22h.01M16 16h.01M16 20h.01" />
      </Svg>
    );
  return <Svg className={className}>{cloud}</Svg>;
}

// ───────── 창(팝업) 틀 ─────────

// 웹(넓은 화면)에서는 창 전체를 글씨·간격까지 비율 그대로 키운다(zoom). 창이 화면에 다 들어오도록 화면 높이도 같이 본다.
// - 폭 48rem 이상이고 높이 38rem 이상: 1.25배 / 폭 64rem 이상이고 높이 44rem 이상: 1.4배 (가장 긴 숙소 창이 들어가는 높이)
// - 그보다 낮은 화면은 키우지 않는다. 그래도 넘치면(아주 낮은 화면) 창 안에서 스크롤한다.
// 수정 화면은 원래 크기로 보이게 같은 조건에서 되돌린다(ZOOM_UNDO).
const ZOOM_UP = "[@media(width>=48rem)_and_(height>=38rem)]:[zoom:1.25] [@media(width>=64rem)_and_(height>=44rem)]:[zoom:1.4]";
const ZOOM_UNDO = "[@media(width>=48rem)_and_(height>=38rem)]:[zoom:0.8] [@media(width>=64rem)_and_(height>=44rem)]:[zoom:0.7143]";
const MAX_H = "max-h-[calc(100dvh-2rem)] [@media(width>=48rem)_and_(height>=38rem)]:max-h-[calc((100dvh-2rem)/1.25)] [@media(width>=64rem)_and_(height>=44rem)]:max-h-[calc((100dvh-2rem)/1.4)]";

// beforeClose: 바깥 누르기·Esc로 닫기 전에 묻는다. false면 닫지 않는다(수정 중 고친 내용이 있을 때).
function GoDialog({ dialogRef, label, children, onClose, beforeClose, wide = false }: { dialogRef: RefObject<HTMLDialogElement | null>; label: string; children: ReactNode; onClose?: () => void; beforeClose?: () => boolean; wide?: boolean }) {
  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      onClose={onClose}
      onCancel={(e) => {
        if (beforeClose && !beforeClose()) e.preventDefault();
      }}
      onClick={(e) => {
        // 바깥(어두운 곳)을 누르면 닫는다
        if (e.target === e.currentTarget && (!beforeClose || beforeClose())) e.currentTarget.close();
      }}
      // 폭: 카드(23rem) + 웹에서는 오른쪽 아이콘 버튼 줄. wide(항공권 가로 표)는 웹에서 넓게
      className={`m-auto w-[min(23rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain bg-transparent p-0 text-zinc-900 backdrop:bg-black/55 backdrop:backdrop-blur-sm ${wide ? "md:w-[min(50rem,calc(100vw-2rem))]" : "md:w-[min(26rem,calc(100vw-2rem))]"} ${MAX_H} ${ZOOM_UP}`}
    >
      <div className="transition duration-300 ease-out starting:translate-y-4 starting:scale-95 starting:opacity-0">{children}</div>
    </dialog>
  );
}

const CloseIcon = (p: { className?: string }) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
const EditIcon = (p: { className?: string }) => (
  <Svg {...p}>
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Svg>
);
const TrashIcon = (p: { className?: string }) => (
  <Svg {...p}>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
  </Svg>
);

// 창의 아이콘 버튼(닫기·수정·삭제). 글자는 마우스를 올리면(title) 나오고, 화면 읽기에는 aria-label로 읽힌다.
function RailButton({ label, onClick, disabled, danger, className = "", children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex size-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition hover:bg-white/30 active:scale-95 disabled:opacity-50 ${danger ? "text-rose-200 hover:bg-rose-500/40 hover:text-white" : "text-white"} ${className}`}
    >
      {children}
    </button>
  );
}

// 창 안 배치: 카드 + 아이콘 버튼 줄. 웹(md 이상)은 카드 오른쪽 위에 세로(닫기 → 수정 → 삭제),
// 좁은 화면은 카드 위 오른쪽에 가로(수정 · 삭제 · 닫기).
function DialogFrame({ onClose, actions, children }: { onClose: () => void; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 md:flex-row-reverse md:items-start">
      <div className="flex justify-end gap-2 md:flex-col">
        <RailButton label="닫기" onClick={onClose} className="order-last hover:rotate-90 md:order-first">
          <CloseIcon className="size-5" />
        </RailButton>
        {actions}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// 같은 종류의 예약이 여럿이면 카드 바로 아래 줄의 좌우 화살표로 넘겨 본다(키보드 ← →도 된다).
// 화살표 사이에 몇 번째인지(점)와 지금 보는 예약 이름. 카드 내용을 가리지 않게 카드 위에 겹치지 않는다.
function Pager({ index, labels, onPick, children }: { index: number; labels: string[]; onPick: (i: number) => void; children: ReactNode }) {
  const count = labels.length;
  if (count < 2) return <>{children}</>;
  const arrow = (dir: -1 | 1) => {
    const to = index + dir;
    const off = to < 0 || to >= count;
    return (
      <button
        type="button"
        onClick={() => onPick(to)}
        disabled={off}
        aria-label={off ? (dir < 0 ? "이전 없음" : "다음 없음") : `${dir < 0 ? "이전" : "다음"}: ${labels[to]}`}
        title={off ? undefined : labels[to]}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-white/30 active:scale-95 disabled:opacity-30 disabled:hover:bg-white/15"
      >
        <Svg className="size-5">
          <path d={dir < 0 ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
        </Svg>
      </button>
    );
  };
  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" && index > 0) onPick(index - 1);
        if (e.key === "ArrowRight" && index < count - 1) onPick(index + 1);
      }}
    >
      {children}
      <div className="mt-2.5 flex items-center gap-2">
        {arrow(-1)}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span className="flex gap-1.5">
            {labels.map((l, i) => (
              <button key={i} type="button" onClick={() => onPick(i)} aria-label={l} aria-current={i === index} className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"}`} />
            ))}
          </span>
          <span className="max-w-full truncate text-xs text-white/85">{labels[index]}</span>
        </div>
        {arrow(1)}
      </div>
    </div>
  );
}

// 항공권·승차권·숙소·패스 창의 수정·삭제(아이콘 버튼, DialogFrame). 수정을 누르면 카드 대신 흰 수정 폼.
function useItemActions(item: Item, close: () => void) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const onDelete = () => {
    if (!window.confirm(`"${item.name}" 항목을 지울까요?`)) return;
    startDelete(async () => {
      const result = await deleteItem(item.id, item.trip_id);
      setError(result.error);
      if (!result.error) close();
    });
  };
  return { editing, setEditing, error, deleting, onDelete };
}

// 수정 중 나가기 (F16 검수): 한 칸이라도 고쳤으면 "저장하지 않고 닫을까요?"를 묻고, 안 고쳤으면 바로 나간다.
// guardRef에 묻는 함수를 걸어 두면 창(GoDialog)이 바깥 누르기·Esc 때 부른다. 창을 열 때마다 GroupTile이 이 몸통을 새로 그려 원래 카드가 보인다.
function ItemDialogBody({ item, days, readOnly, close, guardRef, children }: { item: Item; days: TripDay[]; readOnly: boolean; close: () => void; guardRef: RefObject<(() => boolean) | null>; children: ReactNode }) {
  const { editing, setEditing, error, deleting, onDelete } = useItemActions(item, close);
  const dirty = useRef(false);
  const canLeave = useCallback(() => !dirty.current || window.confirm("수정한 내용을 저장하지 않고 닫을까요?"), []);
  useEffect(() => {
    if (!editing) return;
    guardRef.current = canLeave;
    return () => {
      guardRef.current = null;
    };
  }, [editing, guardRef, canLeave]);
  const startEdit = () => {
    dirty.current = false;
    setEditing(true);
  };
  if (editing) {
    return (
      // 창은 웹에서 키워 보이므로 수정 화면은 그만큼 되돌려 원래 크기로 보이게 한다
      <div data-tone="dark" className={`${EDIT_PANEL} ${ZOOM_UNDO}`}>
        <EditHeader title="항목 수정" sub={item.name} onClose={() => canLeave() && setEditing(false)} back />
        <div
          className="max-h-[70vh] overflow-y-auto px-5 pb-5"
          onInput={() => {
            dirty.current = true;
          }}
        >
          <ItemForm key={item.updated_at} action={updateItem.bind(null, item.id, item.trip_id)} days={days} item={item} submitLabel="고치기" onSaved={() => setEditing(false)} />
        </div>
      </div>
    );
  }
  const actions = !readOnly && (
    <>
      <RailButton label="수정" onClick={startEdit}>
        <EditIcon className="size-[1.15rem]" />
      </RailButton>
      <RailButton label={deleting ? "지우는 중…" : "삭제"} onClick={onDelete} disabled={deleting} danger>
        <TrashIcon className="size-[1.15rem]" />
      </RailButton>
    </>
  );
  return (
    <DialogFrame onClose={close} actions={actions}>
      {children}
      {error && <p className="mt-2 text-center text-sm text-rose-200">{error}</p>}
    </DialogFrame>
  );
}

// ───────── 1. 항공권 ─────────

// 공항 코드(ICN)는 크게, 코드를 모르는 공항 이름(오사카)은 한 줄에 들어가게 작게 (C9 F26 결정 3)
const airportClass = (v: string) => `leading-none font-black tracking-tight ${/^[A-Z]{3}$/.test(v) ? "text-5xl" : "text-2xl break-keep"}`;

// 떼는 쪽의 바코드 (꾸밈, 웹 항공권 창). 편명으로 무늬를 정하고 옆으로 눕힌다(가로 줄을 세로로 쌓음).
function SideBarcode({ seed, label }: { seed: string; label: string }) {
  const bars: number[] = [];
  let h = 7;
  for (let i = 0; i < 44; i++) {
    h = (h * 31 + seed.charCodeAt(i % Math.max(1, seed.length)) + i) % 97;
    bars.push(1 + (h % 3));
  }
  // 칸 없이 떼는 쪽 높이를 채운다. 줄 굵기를 비율(flex-grow)로 줘서 창 높이가 달라도 위아래로 꽉 찬다. 옆에 편명을 세로로.
  return (
    <div aria-hidden className="flex h-full items-stretch gap-3">
      <div className="flex w-14 flex-col">
        {bars.map((w, i) => (
          <span key={i} className="flex flex-col" style={{ flexGrow: w + 2 }}>
            <span className="w-full bg-zinc-900/85" style={{ flexGrow: w }} />
            <span style={{ flexGrow: 2 }} />
          </span>
        ))}
      </div>
      <span className="font-mono text-[11px] font-bold tracking-[0.3em] text-zinc-900/55 [writing-mode:vertical-rl]">{label}</span>
    </div>
  );
}

// 예약번호 (항공권 TO 아래, 승차권 떼는 쪽). 가려서 보이고 "보기"로 원래 값. 소유자만 secret이 온다(F20).
function TicketBookingNo({ code, align = "right", className = "mt-2", labelClass = "text-zinc-500" }: { code: string; align?: "left" | "right"; className?: string; labelClass?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className={`flex flex-col gap-1 ${align === "right" ? "items-end" : "items-start"} ${className}`}>
      <span className={`text-[11px] tracking-wide ${labelClass}`}>예약번호</span>
      <span className="flex items-center gap-1.5">
        <span className="font-mono text-sm font-bold tracking-wide">{show ? code : maskCode(code)}</span>
        <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} className="rounded-full border border-zinc-300 px-2 py-0.5 text-[11px] transition hover:bg-zinc-100 active:scale-95">
          {show ? "가리기" : "보기"}
        </button>
      </span>
    </div>
  );
}

// 항공권 창 (C10 F30, 레퍼런스 탑승권 모양). 색은 지금 그대로(검정 머리띠·호박색 글씨·종이색 바탕).
// - FROM 아래: 날짜·출발 시각. TO 아래: 예약번호(있을 때). 도착 시각은 저장 칸이 없다.
// - 그 아래 편명·날짜·출발·일차, 맨 아래 메모와 "예약 링크 열기"
// - 좁은 화면은 세로 카드. 웹(md 이상)은 가로 표이고, 점선 오른쪽 떼는 쪽은 내용 없이 누운 바코드(꾸밈)만
// 돌아오는 편은 따로 항공권 카드로 넘겨 본다.
// 뒤에는 대표 이미지를 흐리게 깔고(TicketBackdrop, 승차권과 같음), 칸은 둥근 상자, 글씨는 세 단계로 맞춘다.
// 항공권 본문·떼는 쪽 사이 홈 (C10 F30). 덧댄 동그라미가 아니라 실제로 잘라 뒤 배경이 보이게 한다(웹만, 승차권과 같은 방식).
const FLIGHT_MAIN_SHAPE =
  "md:[mask-image:radial-gradient(circle_at_100%_0,transparent_12px,#000_12.5px),radial-gradient(circle_at_100%_100%,transparent_12px,#000_12.5px)] md:[mask-composite:intersect]";
const FLIGHT_STUB_SHAPE =
  "md:[mask-image:radial-gradient(circle_at_0_0,transparent_12px,#000_12.5px),radial-gradient(circle_at_0_100%,transparent_12px,#000_12.5px)] md:[mask-composite:intersect]";

// 항공권 칸 사이 선: 좁은 화면 열 수(3칸이면 3, 4칸이면 2)와 넓은 화면(한 줄)에 맞춰 왼쪽·위 선을 붙인다
function cellLines(i: number, n: number): string {
  if (n !== 4) return i > 0 ? "border-l" : "";
  const narrow = [i % 2 === 1 ? "border-l" : "", i >= 2 ? "border-t" : ""];
  const wide = i > 0 ? "sm:border-l" : "sm:border-l-0";
  return [...narrow, wide, "sm:border-t-0"].filter(Boolean).join(" ");
}

function BoardingPass({ item, days, coverImage }: { item: Item; days: TripDay[]; coverImage: string }) {
  const f = parseFlight(item)!;
  const date = md(dateOfDay(days, item.day));
  const time = formatTime(item.time);
  const bookingNo = item.secret?.booking_no ?? "";
  // 글씨는 승차권과 같은 세 단계: 작은 이름표 · 값 · 공항 코드(크게)
  const eyebrow = "text-[11px] font-semibold tracking-[0.12em] text-zinc-900/50";
  const value = "text-lg leading-tight font-bold tabular-nums";
  const cells: [string, string][] = [
    ["편명", f.flightNo ?? "—"],
    ...(date ? ([["날짜", date]] as [string, string][]) : []),
    ["출발", time || "시각 미정"],
    ["일차", `DAY ${item.day}`],
  ];
  return (
    <div className="drop-shadow-2xl md:flex">
      {/* 본문 */}
      <div className={`min-w-0 overflow-hidden rounded-3xl bg-[#f5f1ea] md:flex-1 md:rounded-r-none ${FLIGHT_MAIN_SHAPE}`}>
        <div className="flex items-center justify-between gap-3 bg-zinc-900 px-5 py-3.5 md:h-14 md:px-7 md:py-0">
          <span className="flex items-center gap-2 text-xs font-bold tracking-[0.3em] text-amber-400 md:text-sm">
            <PlaneIcon className="size-4" />
            BOARDING PASS
          </span>
          <span className="font-bold text-white">{f.flightNo ?? ""}</span>
        </div>
        <div className="relative [&>*:not(:first-child)]:relative">
          <TicketBackdrop image={coverImage} part="main" paper="flight" />
          <div className="flex flex-col gap-5 px-5 pt-6 pb-6 text-zinc-900 md:px-7 md:pt-7">
            <div className="relative flex items-start justify-between gap-3">
              {/* 가운데 흐린 비행기 */}
              <PlaneIcon className="pointer-events-none absolute top-2 left-1/2 size-24 -translate-x-1/2 text-zinc-900/[0.06] md:size-28" />
              <div className="relative min-w-0">
                <p className={eyebrow}>FROM</p>
                <p className={`mt-1 ${airportClass(f.from)} md:text-6xl`}>{f.from || "—"}</p>
                <p className="mt-1 truncate text-sm font-semibold text-amber-700">{f.fromName}</p>
                {(date || time) && <p className="mt-2 text-sm font-medium text-zinc-700 tabular-nums">{[date, time].filter(Boolean).join(" · ")}</p>}
              </div>
              <div aria-hidden className="relative mt-12 flex flex-1 items-center text-amber-600 md:mt-14">
                <span className="flex-1 border-t-2 border-dashed border-zinc-900/15" />
                <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="currentColor">
                  <path d="M8 5l9 7-9 7z" />
                </svg>
              </div>
              <div className="relative min-w-0 text-right">
                <p className={eyebrow}>TO</p>
                <p className={`mt-1 ${airportClass(f.to)} md:text-6xl`}>{f.to || "—"}</p>
                <p className="mt-1 truncate text-sm font-semibold text-amber-700">{f.toName}</p>
                {bookingNo && <TicketBookingNo code={bookingNo} labelClass={eyebrow} />}
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-zinc-900/10 bg-white/55">
              {/* 칸 3개(날짜 없음)면 한 줄 3칸, 4개면 좁은 화면 2×2·넓은 화면 한 줄. 칸 사이 선은 칸마다 직접 정한다 */}
              <div className={`grid ${cells.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
                {cells.map(([name, v], i) => (
                  <div key={name} className={`min-w-0 border-zinc-900/10 px-4 py-3 ${cellLines(i, cells.length)}`}>
                    <p className={eyebrow}>{name}</p>
                    <p className={`mt-1 truncate ${value}`}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
            {item.memo && (
              <div className="flex items-start gap-3 rounded-2xl bg-amber-100/60 px-4 py-3">
                <span className={`${eyebrow} mt-0.5 shrink-0`}>MEMO</span>
                <p className="min-w-0 flex-1 text-sm font-medium whitespace-pre-wrap">{item.memo}</p>
              </div>
            )}
            {item.secret?.booking_link && <BookingLinkButton secret={item.secret} className="self-start" />}
          </div>
        </div>
      </div>
      {/* 웹: 점선 오른쪽 떼는 쪽(꾸밈) */}
      {/* -ml-0.5: 잘라 낸 가장자리 사이에 어두운 틈이 보이지 않게 살짝 겹친다 */}
      <div className={`relative hidden w-36 shrink-0 flex-col overflow-hidden rounded-r-3xl md:-ml-0.5 border-l-2 border-dashed border-zinc-900/15 bg-[#f5f1ea] md:flex ${FLIGHT_STUB_SHAPE}`}>
        <div aria-hidden className="h-14 shrink-0 bg-zinc-900" />
        <div className="relative flex flex-1 justify-center px-5 py-7 [&>*:not(:first-child)]:relative">
          <TicketBackdrop image={coverImage} part="stub" paper="flight" />
          <SideBarcode seed={f.flightNo ?? item.id} label={f.flightNo ?? "FLIGHT"} />
        </div>
      </div>
    </div>
  );
}

// ───────── 2. 숙소 예약 ─────────

// 위쪽 사진은 숙소 사진 (C10 F30): 직접 넣은 사진 → 장소 사진(Google Places, 매거진 장소 카드와 같은 주소라 캐시를 같이 씀) → 없으면 대표 이미지.
function StayCard({ item, lodgings, days, coverImage, companions, photoUrl }: { item: Item; lodgings: Item[]; days: TripDay[]; coverImage: string; companions: number; photoUrl: string | null }) {
  const stay = stayRange(item, lodgings, days);
  const { ref: photoRef, photo: placePhoto, onError: onPhotoError } = usePlacePhoto(item.trip_id, item.id, photoVersion(item.kind, item.name, item.address), !photoUrl && item.lat !== null);
  const photo = photoUrl ?? placePhoto?.url ?? null;
  // 여행 기간 막대: 이 숙소에 묵는 밤은 주황, 나머지는 회색
  const nights = days.slice(0, -1);
  const mine = (d: number) => {
    const out = stay.next ? stay.next.day : days[days.length - 1]?.day ?? item.day;
    return d >= item.day && d < out;
  };
  return (
    <div className="overflow-hidden rounded-3xl bg-[#f7f5f1] shadow-2xl">
      <div ref={photoRef as RefObject<HTMLDivElement>} className="relative h-36 bg-cover bg-center" style={photo ? undefined : { backgroundImage: `url("${coverImage}")` }}>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- 외부 사진 주소를 그대로 쓴다(이미지 최적화를 쓰지 않음, B49)
          <img src={photo} alt={`${item.name} 사진`} referrerPolicy="no-referrer" onError={photoUrl ? undefined : onPhotoError} className="absolute inset-0 size-full object-cover" />
        )}
        <span className="absolute top-3 left-3 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow">✓ 숙소</span>
        {!photoUrl && placePhoto && <PhotoInfo photo={placePhoto} name={item.name} />}
      </div>
      {/* 아래: 숙소 사진(없으면 대표 이미지)을 흐리게 깔고 종이색으로 덮는다(뒷배경만, 배치는 전과 같음) */}
      <div className="relative [&>*:not(:first-child)]:relative">
        <TicketBackdrop image={photo ?? coverImage} part="main" paper="stay" />
        <div className="flex flex-col gap-4 p-5">
          <div>
            <h3 className="text-xl font-bold tracking-tight break-keep">{item.name}</h3>
            <p className="text-sm text-zinc-500">{[item.address, `${companions}인`].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500">CHECK-IN</p>
              <p className="text-lg font-bold">{md(stay.checkIn) || `DAY ${item.day}`}</p>
            </div>
            {stay.nights && <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">{stay.nights}박</span>}
            <div className="text-right">
              <p className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500">CHECK-OUT</p>
              <p className="text-lg font-bold">{md(stay.checkOut) || "—"}</p>
            </div>
          </div>
          {nights.length > 0 && (
            <div>
              <div className="flex justify-between text-[11px] text-zinc-400">
                {days.map((d) => (
                  <span key={d.day}>{d.date ? d.date.slice(5).replace("-", ".") : `D${d.day}`}</span>
                ))}
              </div>
              <div className="mt-1 flex gap-1">
                {nights.map((d) => (
                  <span key={d.day} className={`h-1.5 flex-1 rounded-full ${mine(d.day) ? "bg-amber-600" : "bg-zinc-200"}`} />
                ))}
              </div>
              {stay.next && <p className="mt-2 truncate text-right text-xs text-zinc-500">다음 숙소 · {stay.next.name}</p>}
            </div>
          )}
          {/* 예약번호·예약 링크는 소유자에게만(F20). 메모는 메모로만 보인다(예약번호를 메모에 두지 않는다). */}
          <BookingInfo secret={item.secret} className="border-t border-zinc-200 pt-3" />
          {(item.memo || item.link) && (
            <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-3 text-sm">
              {item.memo ? <p className="min-w-0 whitespace-pre-wrap text-zinc-600">{item.memo}</p> : <span />}
              {item.link && (
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">
                  링크 ↗
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ───────── 3. 날씨 ─────────

function WeatherCard({ weather }: { weather: TripWeather }) {
  const first = weather.days[0];
  const rainy = weather.days.find(isRainy);
  return (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-b from-[#2b4a7e] via-[#4b5f86] to-[#b27d52] p-5 text-white shadow-2xl">
      <p className="text-sm text-white/85">
        {weather.place} · {md(first.date)} {weather.source === "forecast" ? "도착하는 날" : "(작년 같은 날)"}
      </p>
      <div className="mt-2 flex items-center gap-4">
        <WeatherIcon kind={weatherKind(first.code)} className="size-16" />
        <p className="text-7xl leading-none font-light tracking-tight">{first.max}°</p>
        <div>
          <p className="text-lg font-bold">{weatherLabel(first.code)}</p>
          <p className="text-xs text-white/80">
            최저 {first.min}° · {clothingTip(first.min)}
          </p>
        </div>
      </div>
      <div className="mt-5 grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-black/20 p-3 backdrop-blur-sm">
        {weather.days.slice(0, 7).map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-1 text-center">
            <span className="text-xs text-white/80">
              {WEEK[new Date(`${d.date}T00:00:00Z`).getUTCDay()]} {Number(d.date.slice(8))}
            </span>
            <WeatherIcon kind={weatherKind(d.code)} className="size-5" />
            <span className="text-sm font-bold">{d.max}°</span>
            <span className="text-[11px] text-white/70">{d.min}°</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-white/85">
        {rainy ? `${md(rainy.date)} 비 ${weather.source === "forecast" ? "예보" : "(작년)"} · 우산을 챙기세요` : "여행 중 큰 비 소식은 없어요"}
      </p>
      {weather.source === "last-year" && <p className="mt-1 text-[11px] text-white/60">예보는 출발 16일 전부터 나와요. 지금은 작년 이맘때 날씨예요.</p>}
      <p className="mt-1 text-[10px] text-white/45">날씨: Open-Meteo</p>
    </div>
  );
}

// ───────── 3-1. 승차권 (기차·버스·배) ─────────

// 떼는 쪽 도착지 글씨 크기: 짧으면 크게("부산"), 길면 한 줄에 들어가게("신오사카")
const destClass = (v: string) => (v.length <= 3 ? "text-5xl md:text-6xl" : v.length <= 5 ? "text-4xl md:text-[2.75rem]" : "text-3xl");

// 승차권 표의 잘린 모양 (C10 F30). 덧댄 도형이 아니라 실제로 잘라 내서 뒤 배경이 보인다.
// 본문과 떼는 쪽이 각자 귀퉁이를 잘라(clip-path) 점선 위아래가 삼각형으로 파이고, 바깥 옆면은 반원으로 판다(mask).
// - 웹(md): 가로로 붙음. 본문 왼쪽 가운데, 떼는 쪽 오른쪽 가운데에 반원
// - 모바일: 위아래로 붙음. 점선 양 끝(본문 아래 두 귀, 떼는 쪽 위 두 귀)에 반원을 반씩
const RIDE_MAIN_SHAPE = [
  "[clip-path:polygon(16px_0,calc(100%_-_16px)_0,100%_16px,100%_100%,0_100%,0_16px)]",
  "[mask-image:radial-gradient(circle_at_0_100%,transparent_16px,#000_16.5px),radial-gradient(circle_at_100%_100%,transparent_16px,#000_16.5px)] [mask-composite:intersect]",
  "md:[clip-path:polygon(16px_0,calc(100%_-_16px)_0,100%_16px,100%_calc(100%_-_16px),calc(100%_-_16px)_100%,16px_100%,0_calc(100%_-_16px),0_16px)]",
  "md:[mask-image:radial-gradient(circle_at_0_50%,transparent_16px,#000_16.5px)]",
].join(" ");
const RIDE_STUB_SHAPE = [
  "[clip-path:polygon(0_0,100%_0,100%_calc(100%_-_16px),calc(100%_-_16px)_100%,16px_100%,0_calc(100%_-_16px))]",
  "[mask-image:radial-gradient(circle_at_0_0,transparent_16px,#000_16.5px),radial-gradient(circle_at_100%_0,transparent_16px,#000_16.5px)] [mask-composite:intersect]",
  "md:[clip-path:polygon(16px_0,calc(100%_-_16px)_0,100%_16px,100%_calc(100%_-_16px),calc(100%_-_16px)_100%,16px_100%,0_calc(100%_-_16px),0_16px)]",
  "md:[mask-image:radial-gradient(circle_at_100%_50%,transparent_16px,#000_16.5px)]",
].join(" ");

// 승차권 뒷배경 (C10 F30). 그린 그림 대신 여행 대표 이미지를 흐리게(블러·채도 낮춤) 깔고 종이색으로 덮어,
// 교통 패스(CITY PASS)·매거진과 같은 사진 느낌을 내면서 글씨는 그대로 읽히게 한다.
// - main: 위쪽(글씨 자리)은 종이색을 짙게, 아래로 갈수록 사진이 조금 더 비친다
// - stub: 떼는 쪽 위쪽에 사진이 비치고 아래로 종이색
// 항공권·숙소·교통 패스도 같은 방식을 쓴다(paper: 창마다 종이색).
const BACKDROP_WASH = {
  ride: {
    main: "bg-gradient-to-b from-[#eef2f7]/95 via-[#eef2f7]/88 to-[#eef2f7]/65",
    stub: "bg-gradient-to-b from-[#eef2f7]/45 via-[#eef2f7]/85 to-[#eef2f7]/95",
  },
  flight: {
    main: "bg-gradient-to-b from-[#f5f1ea]/95 via-[#f5f1ea]/88 to-[#f5f1ea]/65",
    stub: "bg-gradient-to-b from-[#f5f1ea]/45 via-[#f5f1ea]/85 to-[#f5f1ea]/95",
  },
  stay: {
    main: "bg-gradient-to-b from-[#f7f5f1]/95 via-[#f7f5f1]/88 to-[#f7f5f1]/70",
    stub: "bg-gradient-to-b from-[#f7f5f1]/45 via-[#f7f5f1]/85 to-[#f7f5f1]/95",
  },
  pass: {
    main: "bg-gradient-to-b from-[#e6efe9]/90 via-[#e6efe9]/85 to-[#e6efe9]/70",
    stub: "bg-gradient-to-b from-[#e6efe9]/45 via-[#e6efe9]/85 to-[#e6efe9]/95",
  },
} as const;

function TicketBackdrop({ image, part, paper = "ride" }: { image: string; part: "main" | "stub"; paper?: keyof typeof BACKDROP_WASH }) {
  const wash = BACKDROP_WASH[paper][part];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 scale-110 bg-cover bg-center blur-[6px] saturate-[0.6]" style={{ backgroundImage: `url("${image}")` }} />
      <div className={`absolute inset-0 ${wash}`} />
    </div>
  );
}

// 승차권 창 (C10 F30, 레퍼런스 기차표 모양). 색은 지금 그대로(남색 #1e3a5f·하늘색·연회색 종이).
// 한 값은 한 곳에만 둔다. 값이 없는 칸은 "—" 대신 칸을 숨긴다.
// - 본문: 왼쪽 남색 띠와 빗금 → 기차/버스 그림·TICKET·열차 이름 → 출발 → 도착(고정폭 글씨)
//   → 상자(날짜 | 출발 시각, 타는 곳은 있을 때 아래 줄) → 요금(있을 때) → 메모 띠(있을 때)
// - 머리 줄 오른쪽 아래: 예약번호(있을 때, 배경 없이)
// - 떼는 쪽(웹은 오른쪽, 모바일은 아래, 점선으로 나눔): 도착지를 크게, 일차 도장(날짜를 알 때)
// 날짜를 모르면(출발일 없는 여행) 날짜 칸에 일차를 쓴다.
// 상자·메모 띠·도장은 둥근 모서리, 선은 얇고 흐리게. 글씨는 이름표·값·도착지 세 단계만 쓴다.
function RideTicket({ item, days, coverImage }: { item: Item; days: TripDay[]; coverImage: string }) {
  const ride = parseRide(item.name);
  const cost = formatCost(item.cost_amount, item.cost_currency);
  const Icon = ride?.bus ? BusIcon : TrainIcon;
  const date = md(dateOfDay(days, item.day));
  const time = formatTime(item.time);
  const bookingNo = item.secret?.booking_no ?? "";
  // 글씨 크기는 세 단계만 쓴다: 작은 이름표(11px) · 값(18px) · 도착지(크게). 이름표는 모두 같은 모양.
  const navy = "text-[#1e3a5f]";
  const eyebrow = "text-[11px] font-semibold tracking-[0.12em] text-[#1e3a5f]/55";
  const value = "text-lg leading-tight font-bold tabular-nums";
  const cell = (name: string, v: string) => (
    <div className="min-w-0 px-4 py-3">
      <p className={eyebrow}>{name}</p>
      <p className={`mt-1 truncate ${value}`}>{v}</p>
    </div>
  );
  return (
    <div className="drop-shadow-2xl">
      <div className="md:flex">
        {/* 본문 */}
        <div className={`relative flex min-w-0 bg-[#eef2f7] md:flex-1 [&>*:not(:first-child)]:relative ${RIDE_MAIN_SHAPE}`}>
          <TicketBackdrop image={coverImage} part="main" />
          <div aria-hidden className="flex shrink-0">
            <span className="w-4 bg-[#1e3a5f] md:w-5" />
            <span className="w-3" style={{ backgroundImage: "repeating-linear-gradient(135deg, #7dd3fc 0 3px, transparent 3px 8px)" }} />
          </div>
          <div className={`flex min-w-0 flex-1 flex-col gap-5 py-6 pr-6 pl-5 md:pl-6 ${navy}`}>
            {/* 머리: 그림 · TICKET · 열차 이름 | 예약번호 */}
            <div className="flex items-center gap-3 border-b border-sky-300/80 pb-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-sky-500 shadow-sm">
                <Icon className="size-7" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`${eyebrow} whitespace-nowrap`}>{ride?.bus ? "BUS TICKET" : "TRAIN TICKET"}</p>
                <p className={`mt-1 truncate ${value}`}>{ride?.carrier || item.name}</p>
              </div>
              {bookingNo && <TicketBookingNo code={bookingNo} className="shrink-0 self-end" labelClass={eyebrow} />}
            </div>
            {ride && (
              <p className="flex items-center gap-2 text-base font-semibold break-keep text-sky-700">
                {ride.from}
                <span aria-hidden className="text-sky-400">→</span>
                {ride.to}
              </p>
            )}
            {/* 날짜·출발 | 타는 곳 */}
            <div className="overflow-hidden rounded-2xl border border-[#1e3a5f]/20 bg-white/55">
              <div className="grid grid-cols-2 divide-x divide-[#1e3a5f]/15">
                {cell(date ? "날짜" : "일차", date || `DAY ${item.day}`)}
                {cell("출발", time || "시각 미정")}
              </div>
              {item.address && (
                <div className="border-t border-[#1e3a5f]/15 px-4 py-3">
                  <p className={eyebrow}>타는 곳</p>
                  <p className="mt-1 text-sm font-semibold break-words">{item.address}</p>
                </div>
              )}
            </div>
            {cost && (
              <p className="flex items-baseline gap-3">
                <span className={eyebrow}>요금</span>
                <span className={`${value} text-sky-700`}>{cost}</span>
              </p>
            )}
            {item.memo && (
              <div className="flex items-start gap-3 rounded-2xl bg-sky-200/70 px-4 py-3">
                <span className={`${eyebrow} mt-0.5 flex shrink-0 items-center gap-1.5`}>
                  <Icon className="size-3.5" />
                  MEMO
                </span>
                <p className="min-w-0 flex-1 text-sm font-medium whitespace-pre-wrap">{item.memo}</p>
              </div>
            )}
            {item.secret?.booking_link && <BookingLinkButton secret={item.secret} className="self-start" />}
          </div>
        </div>

        {/* 떼는 쪽 */}
        <div className={`relative flex flex-col justify-between gap-6 border-t-2 border-dashed border-[#1e3a5f]/25 bg-[#eef2f7] px-6 py-6 md:w-56 md:shrink-0 md:border-t-0 md:border-l-2 [&>*:not(:first-child)]:relative ${RIDE_STUB_SHAPE} ${navy}`}>
          <TicketBackdrop image={coverImage} part="stub" />
          <div className="min-w-0">
            <p className={eyebrow}>{ride ? "도착" : "승차권"}</p>
            {ride ? (
              <p className={`mt-2 leading-none font-black tracking-tight break-keep ${destClass(ride.to)}`}>{ride.to}</p>
            ) : (
              <Icon className="mt-2 size-14 text-sky-500" />
            )}
          </div>
          <div className="flex items-end justify-between gap-3">
            <p className="text-[11px] leading-relaxed text-[#1e3a5f]/55">
              도착할 때까지
              <br />
              표를 챙겨 주세요
            </p>
            {/* 일차 도장: 날짜 칸에 이미 일차가 있으면(출발일 없음) 넣지 않는다 */}
            {date && <span className="shrink-0 rounded-xl border-2 border-sky-400/80 px-3 py-1 text-sm font-bold tracking-wide text-sky-600">DAY {item.day}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────── 4. 교통 패스 ─────────

// 교통 패스 창 (C10 F30, 레퍼런스 교통카드 모양). 색은 지금 그대로(짙은 초록 #173a2c·연초록).
// - 위: 대표 이미지를 배경으로 깔고 "CITY PASS", 그 아래 패스 이름과 사용일·비용 한 줄(같은 흰 글씨, 조금 작게, 시각은 넣지 않음)
// - 아래 얇은 띠: 메모(이름표 없이. 쉼표·줄바꿈 목록이면 칩으로), 예약 정보(있을 때)
function PassCard({ item, days, coverImage }: { item: Item; days: TripDay[]; coverImage: string }) {
  const lines = passLines(item.memo);
  const cost = formatCost(item.cost_amount, item.cost_currency);
  const date = md(dateOfDay(days, item.day));
  const use = [`사용일 ${date || `DAY ${item.day}`}`, cost].filter(Boolean).join(" · ");
  const shadow = "drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]";
  const showBar = lines.length > 0 || !!item.memo || !!item.secret;
  return (
    <div className="overflow-hidden rounded-3xl bg-[#e6efe9] shadow-2xl">
      {/* 위: 대표 이미지 + CITY PASS + 패스 이름·사용일 */}
      <div className="relative aspect-[16/9] bg-[#173a2c] bg-cover bg-center" style={{ backgroundImage: `url("${coverImage}")` }}>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-[#173a2c]/60" />
        <div className="relative flex h-full flex-col justify-between p-5">
          <p className="text-4xl leading-none font-black tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">CITY PASS</p>
          <div className="min-w-0">
            <p className={`text-lg leading-tight font-bold break-keep text-white ${shadow}`}>{item.name}</p>
            <p className={`mt-1 truncate text-sm font-bold text-white/90 tabular-nums ${shadow}`}>{use}</p>
          </div>
        </div>
      </div>

      {/* 아래 얇은 띠: 메모 */}
      {showBar && (
        <div className="relative [&>*:not(:first-child)]:relative">
          <TicketBackdrop image={coverImage} part="stub" paper="pass" />
          <div className="flex flex-col gap-2 px-5 py-3 text-[#173a2c]">
            {(lines.length > 0 || item.memo) && (
              <div>
                {lines.length > 0 ? (
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    {lines.map((l) => (
                      <span key={l} className="rounded-full bg-[#173a2c] px-2.5 py-0.5 text-xs font-semibold text-white">
                        {l}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="min-w-0 text-sm whitespace-pre-wrap">{item.memo}</p>
                )}
              </div>
            )}
            <BookingInfo secret={item.secret} />
          </div>
        </div>
      )}
    </div>
  );
}

// ───────── 5. 준비물 ─────────

// 저장은 checklist-store.ts → DB trip_checks (C10 F31)

function dDay(start: string | null): string | null {
  if (!start) return null;
  const today = new Date();
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const s = Date.parse(`${start}T00:00:00Z`);
  const n = Math.round((s - t) / 86400000);
  return n > 0 ? `출발까지 D-${n}` : n === 0 ? "오늘 출발" : "여행 중이거나 다녀온 여행";
}

// 매거진 BACK의 준비물 (F16). 같이 챙기는 목록이라 공유받은 사람도 본다(C10 F31). 더하기·체크·빼기는 소유자만(readOnly면 숨김, 실제로 막는 것은 RLS).
// - 처음에는 비어 있고 제목 옆 "＋ 준비물 추가"로 하나씩 더한다. 하나라도 있으면 반투명 패널(BACK의 다른 칸과 같은 모양)이 생긴다.
// - 패널은 서랍처럼 접힌다. 접으면 진행률 원과 개수만 보인다.
// - 여행 하나에 30개까지(CHECKLIST_MAX). 다 차면 입력 칸 대신 안내를 보인다.
export function Checklist({
  tripId,
  initialChecks,
  readOnly,
  startDate,
  weather,
  title,
  panelClassName,
}: {
  tripId: string;
  initialChecks: Check[];
  readOnly: boolean;
  startDate: string | null;
  weather: TripWeather | null;
  title: ReactNode;
  panelClassName: string;
}) {
  const checks = useChecklist(tripId, initialChecks);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(true);
  const [text, setText] = useState("");
  const done = checks.filter((c) => c.done).length;
  const pct = checks.length ? Math.round((done / checks.length) * 100) : 0;
  const rainy = weather?.days.find(isRainy);
  const r = 22;
  const circ = 2 * Math.PI * r;
  const isFull = checks.length >= CHECKLIST_MAX;

  // C9까지 이 브라우저에 저장했던 준비물을 DB로 한 번 옮긴다 (소유자만)
  useEffect(() => {
    if (!readOnly) void moveBrowserChecklist(tripId);
  }, [tripId, readOnly]);

  async function apply(task: Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    const result = await task;
    if (!result.ok) setError(result.error ?? null);
  }

  const form = isFull ? (
    <p className="text-xs text-white/60">준비물은 {CHECKLIST_MAX}개까지 넣을 수 있어요.</p>
  ) : (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const label = text.trim();
        if (!label) return;
        setText("");
        void apply(addCheck(tripId, checks, label));
      }}
      className="flex gap-2"
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={PACKING_LABEL_MAX}
        autoFocus
        placeholder="예: 여권, 보조배터리"
        aria-label="준비물 더하기"
        className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none"
      />
      <button type="submit" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition active:scale-95">
        더하기
      </button>
    </form>
  );

  // 공유받은 사람: 빈 목록이면 칸을 보이지 않는다
  if (readOnly && checks.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {title}
        {!readOnly && (
        <button
          type="button"
          onClick={() => {
            setAdding((v) => !v);
            setOpen(true);
          }}
          className="rounded-full border border-white/25 px-3 py-1 text-xs transition hover:bg-white/15 active:scale-95"
        >
          {adding ? "다 넣었어요" : "＋ 준비물 추가"}
        </button>
        )}
      </div>

      {checks.length === 0 ? (
        !readOnly && adding && <div className={`${panelClassName} p-4`}>{form}</div>
      ) : (
        <div className={`${panelClassName} p-4`}>
          {/* 머리: 진행률 원 + 개수. 누르면 서랍이 접히고 펼쳐진다. */}
          <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-4 text-left">
            <span className="relative size-14 shrink-0">
              <svg viewBox="0 0 56 56" className="size-14 -rotate-90">
                <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth="6" />
                <circle cx="28" cy="28" r={r} fill="none" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} className="transition-[stroke-dashoffset] duration-500" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{pct}%</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">
                준비물 {done} / {checks.length}
              </span>
              <span className="block text-xs text-white/60" suppressHydrationWarning>
                {dDay(startDate) ?? "출발일을 넣으면 D-day가 나와요"}
              </span>
            </span>
            <span aria-hidden className={`flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 transition duration-300 ${open ? "rotate-180" : ""}`}>
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </button>

          {/* 서랍: 장소 카드와 같은 방식(grid 행 0fr → 1fr) */}
          <div className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <div className="min-h-0 overflow-hidden">
              <div className={`flex flex-col gap-3 pt-3 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} inert={!open}>
                <ul className="max-h-72 divide-y divide-white/10 overflow-y-auto">
                  {checks.map((c) => (
                    <li key={c.id} className="group flex items-center gap-3 py-2.5">
                      <label className={`flex min-w-0 flex-1 items-center gap-3 ${readOnly ? "" : "cursor-pointer"}`}>
                        <input
                          type="checkbox"
                          checked={c.done}
                          disabled={readOnly}
                          onChange={() => void apply(toggleCheck(tripId, checks, c))}
                          className="size-5 shrink-0 cursor-pointer accent-amber-400 disabled:cursor-default"
                        />
                        <span className={`truncate ${c.done ? "text-white/40 line-through" : ""}`}>{c.label}</span>
                      </label>
                      {rainy && c.label.includes("우산") && <span className="shrink-0 text-xs font-semibold text-sky-300">{md(rainy.date).slice(0, 5)} 비 {weather?.source === "forecast" ? "예보" : "(작년)"}</span>}
                      {!readOnly && (
                      <button
                        type="button"
                        onClick={() => void apply(deleteCheck(tripId, checks, c))}
                        aria-label={`${c.label} 빼기`}
                        className="shrink-0 rounded-full px-1.5 text-white/30 opacity-0 transition group-hover:opacity-100 hover:text-white focus:opacity-100"
                      >
                        ✕
                      </button>
                      )}
                    </li>
                  ))}
                </ul>
                {!readOnly && adding && form}
                {readOnly && <p className="text-[11px] text-white/45">체크는 여행을 만든 사람이 해요.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-rose-200">{error}</p>}
    </div>
  );
}

// ───────── 패널 카드(타일) ─────────

function Tile({ icon, kind, corner, title, foot, onOpen }: { icon: ReactNode; kind: string; corner?: string; title: string; foot: string; onOpen: () => void }) {
  return (
    <li className="shrink-0 snap-start">
      <button
        type="button"
        onClick={onOpen}
        className="group relative flex h-full w-56 flex-col gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 text-left text-white shadow-lg shadow-black/20 backdrop-blur-md transition duration-300 ease-out hover:-translate-y-1 hover:border-white/40 hover:bg-white/20 hover:shadow-2xl active:scale-[0.98] motion-reduce:transition-none"
      >
        <div className="flex items-center gap-2 text-xs text-white/70">
          {icon}
          <span>{kind}</span>
          {corner && <span className="ml-auto truncate font-mono">{corner}</span>}
        </div>
        <p className="text-lg leading-tight font-semibold break-words">{title}</p>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-dashed border-white/25 pt-2 text-xs text-white/80">
          {/* D-day는 오늘 날짜에 따라 서버·브라우저가 다를 수 있다 */}
          <span className="truncate" suppressHydrationWarning>
            {foot}
          </span>
          <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
        </div>
      </button>
    </li>
  );
}

function useDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  return { ref, open: () => ref.current?.showModal(), close: () => ref.current?.close() };
}

// 종류마다 카드 하나 (F16). 같은 종류의 예약(항공권 여러 편, 숙소 여러 곳)은 이 카드 하나로 묶고, 카드 아래 좌우 화살표로 넘겨 본다.
type GoKind = "flight" | "ticket" | "lodging" | "pass";
const KIND_LABEL: Record<GoKind, string> = { flight: "항공권", ticket: "승차권", lodging: "숙소", pass: "교통 패스" };
const KIND_UNIT: Record<GoKind, string> = { flight: "편", ticket: "장", lodging: "곳", pass: "건" };

function dayLabel(days: TripDay[], item: Item): string {
  return md(dateOfDay(days, item.day)) || `DAY ${item.day}`;
}

// 카드 아래 줄: 하나면 "날짜 · 시각(또는 박 수·비용)", 여럿이면 "첫 날짜 – 마지막 날짜"
// 카드 아래 줄 (C10 F30). 비용은 넣지 않고, 값이 없는 칸은 건너뛴다.
// - 예약 하나: 날짜(요일) · 시각. 숙소만 뒤에 N박.
// - 여럿을 묶은 카드: 시각 없이 첫 날짜 – 마지막 날짜(같은 날이면 날짜 하나).
function groupFoot(kind: GoKind, group: Item[], lodgings: Item[], days: TripDay[]): string {
  const first = group[0];
  if (group.length > 1) {
    const a = dayLabel(days, first);
    const b = dayLabel(days, group[group.length - 1]);
    return a === b ? a : `${a} – ${b}`;
  }
  const nights = kind === "lodging" ? stayRange(first, lodgings, days).nights : null;
  return [dayLabel(days, first), formatTime(first.time), nights ? `${nights}박` : null].filter(Boolean).join(" · ");
}

function groupTitle(kind: GoKind, group: Item[]): string {
  const first = group[0];
  const route = kind === "flight" ? parseFlight(first) : kind === "ticket" ? parseRide(first.name) : null;
  const base = route && route.from && route.to ? `${route.from} → ${route.to}` : first.name;
  return group.length > 1 ? `${base} 외 ${group.length - 1}${KIND_UNIT[kind]}` : base;
}

function GroupTile({ kind, group, items, days, readOnly, coverImage, companions, photos }: { kind: GoKind; group: Item[]; items: Item[]; days: TripDay[]; readOnly: boolean; coverImage: string; companions: number; photos: Record<string, string> }) {
  const d = useDialog();
  const [picked, setPicked] = useState(0);
  const guardRef = useRef<(() => boolean) | null>(null);
  const [opened, setOpened] = useState(0); // 창을 열 때마다 올려 몸통을 새로 그린다(수정 중 나갔다 다시 열어도 수정창이 아니라 카드)
  const open = () => {
    setOpened((n) => n + 1);
    d.open();
  };
  const index = Math.min(picked, group.length - 1); // 지워서 줄어들면 마지막 것을 보여 준다
  const item = group[index];
  const lodgings = items.filter((i) => i.kind === "lodging");
  const labels = group.map((g) => `${dayLabel(days, g)} · ${kind === "flight" ? (parseFlight(g)?.flightNo ?? g.name) : kind === "ticket" ? parseRide(g.name)?.carrier || g.name : g.name}`);
  const icon =
    kind === "flight" ? <PlaneIcon className="size-4" />
    : kind === "ticket" ? (group.every((g) => parseRide(g.name)?.bus) ? <BusIcon className="size-4" /> : <TrainIcon className="size-4" />)
    : kind === "lodging" ? <BedIcon className="size-4" />
    : <PassIcon className="size-4" />;
  // 카드 오른쪽 위는 개수만: 숙소는 "N곳", 나머지는 "N건". 하나면 비운다 (C10 F30)
  const corner = group.length > 1 ? `${group.length}${kind === "lodging" ? "곳" : "건"}` : undefined;

  const body =
    kind === "flight" ? (
      <BoardingPass item={item} days={days} coverImage={coverImage} />
    ) : kind === "ticket" ? (
      <RideTicket item={item} days={days} coverImage={coverImage} />
    ) : kind === "lodging" ? (
      <StayCard key={item.id} item={item} lodgings={lodgings} days={days} coverImage={coverImage} companions={companions} photoUrl={photos[item.id] ?? null} />
    ) : (
      <PassCard item={item} days={days} coverImage={coverImage} />
    );

  return (
    <>
      <Tile icon={icon} kind={KIND_LABEL[kind]} corner={corner} title={groupTitle(kind, group)} foot={groupFoot(kind, group, lodgings, days)} onOpen={open} />
      <GoDialog dialogRef={d.ref} label={`${KIND_LABEL[kind]} 자세히`} beforeClose={() => guardRef.current?.() ?? true} wide={kind === "flight" || kind === "ticket"}>
        <ItemDialogBody key={`${item.id}:${item.updated_at}:${opened}`} item={item} days={days} readOnly={readOnly} close={d.close} guardRef={guardRef}>
          <Pager index={index} labels={labels} onPick={setPicked}>
            {body}
          </Pager>
        </ItemDialogBody>
      </GoDialog>
    </>
  );
}

// 여행 제목 오른쪽의 투명 날씨 패널 (F16). 누르면 원래의 날씨 창을 그대로 연다.
export function WeatherBadge({ weather }: { weather: TripWeather }) {
  const d = useDialog();
  const first = weather.days[0];
  if (!first) return null;
  return (
    <>
      <button
        type="button"
        onClick={d.open}
        aria-label={`날씨 자세히: ${weather.place} ${first.max}° ${weatherLabel(first.code)}`}
        // 좁은 화면: 아이콘·기온만 작게(제목 오른쪽 위). sm 이상: 날씨 이름과 날짜까지.
        className="flex shrink-0 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-left text-white shadow-lg shadow-black/20 backdrop-blur-md transition duration-300 ease-out hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/20 active:scale-[0.98] motion-reduce:transition-none sm:gap-3 sm:px-4 sm:py-2.5"
      >
        <WeatherIcon kind={weatherKind(first.code)} className="size-6 sm:size-8" />
        <span className="flex flex-col leading-tight">
          <span className="text-lg font-semibold tabular-nums sm:text-xl">
            {first.max}° <span className="hidden text-sm font-normal text-white/80 sm:inline">{weatherLabel(first.code)}</span>
          </span>
          <span className="hidden text-xs text-white/70 sm:block">
            {md(first.date)} · {weather.source === "forecast" ? "예보" : "작년 기준"}
          </span>
        </span>
      </button>
      <GoDialog dialogRef={d.ref} label="날씨">
        <DialogFrame onClose={d.close}>
          <WeatherCard weather={weather} />
        </DialogFrame>
      </GoDialog>
    </>
  );
}

// GO 줄을 마우스로 끌어 옆으로 옮긴다 (C10 F30). 터치·펜은 브라우저 스크롤을 그대로 쓴다.
// 5px 넘게 끌었으면 놓을 때의 클릭을 막아 카드 창이 열리지 않게 한다. 끄는 동안은 스냅을 끈다.
function useDragScroll(ref: RefObject<HTMLUListElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: { x: number; left: number } | null = null;
    let dragged = false;
    const down = (e: PointerEvent) => {
      dragged = false;
      // 카드 위에서 누를 때만. 카드 창(dialog)은 줄 안에 그려져서 창 안·배경을 끌어도 이벤트가 올라오므로 뺀다.
      const target = e.target instanceof Element ? e.target : null;
      const onCard = target !== null && target.closest("li") !== null && target.closest("dialog") === null;
      if (e.pointerType !== "mouse" || e.button !== 0 || !onCard || el.scrollWidth <= el.clientWidth) return;
      start = { x: e.clientX, left: el.scrollLeft };
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      if (!dragged && Math.abs(dx) < 5) return;
      if (!dragged) {
        dragged = true;
        try {
          el.setPointerCapture(e.pointerId); // 줄 밖으로 끌어도 계속 따라오게
        } catch {
          // 이미 끝난 포인터면 붙잡지 않고 그대로 옮긴다
        }
        el.style.scrollSnapType = "none";
        el.style.cursor = "grabbing";
        el.style.userSelect = "none";
      }
      el.scrollLeft = start.left - dx;
    };
    const up = () => {
      if (!start) return;
      start = null;
      el.style.cursor = "";
      el.style.userSelect = "";
      // 스냅을 다시 켜면 가까운 카드에 맞춰 멈춘다
      requestAnimationFrame(() => (el.style.scrollSnapType = ""));
      // 클릭은 pointerup 바로 뒤에 온다. 줄 밖에서 놓아 클릭이 오지 않아도 다음 클릭을 막지 않게 지운다.
      setTimeout(() => (dragged = false), 0);
    };
    const click = (e: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      e.preventDefault();
      e.stopPropagation();
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("click", click, true);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click, true);
    };
  }, [ref]);
}

export function TicketStrip({ items, days, readOnly, coverImage, companions, photos = {} }: Props) {
  const stripRef = useRef<HTMLUListElement>(null);
  useDragScroll(stripRef);
  // 종류별로 묶고(각 묶음 안은 날짜순, groupItems가 이미 정렬함), 묶음은 가장 이른 예약 날짜순
  const groups = (
    [
      ["flight", items.filter(isFlight)],
      ["ticket", items.filter(isTicket)],
      ["lodging", items.filter((i) => i.kind === "lodging")],
      ["pass", items.filter(isPass)],
    ] as [GoKind, Item[]][]
  )
    .map(([kind, group]) => [kind, [...group].sort(compareItems)] as [GoKind, Item[]])
    .filter(([, group]) => group.length > 0)
    .sort((a, b) => compareItems(a[1][0], b[1][0]));

  return (
    <ul ref={stripRef} aria-label="GO: 교통·숙소" className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pt-2 pb-4">
      {groups.map(([kind, group]) => (
        <GroupTile key={kind} kind={kind} group={group} items={items} days={days} readOnly={readOnly} coverImage={coverImage} companions={companions} photos={photos} />
      ))}
      {groups.length === 0 && <li className="self-center px-2 text-sm text-white/70">비행기 표·기차표·숙소를 넣으면 여기에 카드로 나와요.</li>}
    </ul>
  );
}
