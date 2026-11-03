"use client";

// 매거진 맨 위(제목 아래)의 GO 패널 (F10, C8 F16). 카드를 누르면 레퍼런스("GO 패널을 누르면 뜨는 창") 모양의 창이 뜬다.
// - 항공권(비행기 교통 항목), 승차권(기차·버스·배 교통 항목), 숙소 예약(숙소 항목), 교통 패스(이름에 패스·1일권 등이 든 교통 항목):
//   종류마다 카드 하나로 묶고(F16), 창 위의 탭으로 예약을 하나씩 나눠 본다. 수정·삭제는 카드 아래(웹은 오른쪽 위). 카드와 탭은 날짜순.
// - 날씨(WeatherBadge): 여행 제목 오른쪽의 투명 패널. 누르면 날씨 창(F16).
// - 준비물(Checklist): 매거진 BACK에 둔다. DB 칸이 없어 이 브라우저에만 저장한다(localStorage).

import { useCallback, useMemo, useRef, useState, useSyncExternalStore, useTransition, type ReactNode, type RefObject } from "react";
import { deleteItem, updateItem } from "@/app/actions/items";
import { compareItems } from "@/lib/items/group";
import { formatCost, formatTime, type Item } from "@/lib/items/types";
import type { TripDay } from "@/lib/trips/days";
import { isPass, isTicket, parseFlight, parseRide, passLines, returnFlight, stayRange } from "@/lib/trips/go-info";
import { clothingTip, isRainy, weatherKind, weatherLabel, type TripWeather, type WeatherKind } from "@/lib/weather/codes";
import { EDIT_PANEL, EditHeader } from "./edit-sheet";
import { ItemForm } from "./item-form";

type Props = {
  items: Item[]; // 교통·숙소 항목
  days: TripDay[];
  readOnly: boolean;
  coverImage: string;
  companions: number;
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

function GoDialog({ dialogRef, label, children, onClose, actions = false }: { dialogRef: RefObject<HTMLDialogElement | null>; label: string; children: ReactNode; onClose?: () => void; actions?: boolean }) {
  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        // 바깥(어두운 곳)을 누르면 닫는다
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      // 웹(넓은 화면)에서는 창 전체를 글씨·간격까지 비율 그대로 키운다(zoom): md 1.25배, lg 1.4배
      // 창이 화면보다 길면(숙소 창 등) 창 안에서 위아래로 스크롤한다. 높이는 키운 비율만큼 나눠 화면 안에 들어오게 한다.
      // 수정·삭제가 있는 창은 웹에서 오른쪽 세로 버튼 자리만큼 넓다
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[min(23rem,calc(100vw-2rem))] overflow-y-auto ${actions ? "md:w-[min(26.5rem,calc((100vw-2rem)/1.25))] lg:w-[min(26.5rem,calc((100vw-2rem)/1.4))]" : ""} overscroll-contain bg-transparent p-0 text-zinc-900 backdrop:bg-black/55 backdrop:backdrop-blur-sm md:max-h-[calc((100dvh-2rem)/1.25)] md:[zoom:1.25] lg:max-h-[calc((100dvh-2rem)/1.4)] lg:[zoom:1.4]`}
    >
      <div className="relative transition duration-300 ease-out starting:translate-y-4 starting:scale-95 starting:opacity-0">
        {/* 닫기 버튼은 창을 스크롤해도 위에 남는다 */}
        <div className="pointer-events-none sticky top-0 z-10 flex justify-end pb-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="닫기"
            className="pointer-events-auto flex size-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:rotate-90 hover:bg-white/25"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

// 항공권·승차권·숙소·패스 창의 수정·삭제(좁은 화면은 카드 아래, 웹은 카드 오른쪽 위 세로). 수정을 누르면 카드 대신 흰 수정 폼.
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

function ItemDialogBody({ item, days, readOnly, close, children }: { item: Item; days: TripDay[]; readOnly: boolean; close: () => void; children: ReactNode }) {
  const { editing, setEditing, error, deleting, onDelete } = useItemActions(item, close);
  if (editing) {
    return (
      // 창은 웹에서 1.25·1.4배로 커지므로 수정 화면은 그만큼 되돌려 원래 크기로 보이게 한다
      <div data-tone="dark" className={`${EDIT_PANEL} md:[zoom:0.8] lg:[zoom:0.7143]`}>
        <EditHeader title="항목 수정" sub={item.name} onClose={() => setEditing(false)} back />
        <div className="max-h-[70vh] overflow-y-auto px-5 pb-5">
          <ItemForm key={item.updated_at} action={updateItem.bind(null, item.id, item.trip_id)} days={days} item={item} submitLabel="고치기" onSaved={() => setEditing(false)} />
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="md:flex md:items-start md:gap-2">
        <div className="min-w-0 md:flex-1">{children}</div>
        {!readOnly && (
          // 좁은 화면: 카드 아래 가로. 웹(md 이상): 카드 오른쪽 위에 세로(닫기 버튼 바로 아래), 스크롤해도 따라온다.
          <div className="mt-3 flex justify-center gap-2 text-sm text-white md:sticky md:top-11 md:mt-0 md:w-14 md:shrink-0 md:flex-col md:text-xs">
            <button type="button" onClick={() => setEditing(true)} className="rounded-full bg-white/15 px-4 py-1.5 backdrop-blur-md transition hover:bg-white/25 active:scale-95 md:px-0">
              수정
            </button>
            <button type="button" onClick={onDelete} disabled={deleting} className="rounded-full bg-white/15 px-4 py-1.5 text-rose-200 backdrop-blur-md transition hover:bg-rose-500/30 active:scale-95 disabled:opacity-50 md:px-0">
              {deleting ? "지우는 중…" : "삭제"}
            </button>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-center text-sm text-rose-200">{error}</p>}
    </>
  );
}

// ───────── 1. 항공권 ─────────

// 편명으로 정하는 바코드 무늬(꾸밈)
function Barcode({ seed }: { seed: string }) {
  const bars = useMemo(() => {
    const widths: number[] = [];
    let h = 7;
    for (let i = 0; i < 34; i++) {
      h = (h * 31 + seed.charCodeAt(i % Math.max(1, seed.length)) + i) % 97;
      widths.push(1 + (h % 3));
    }
    return widths;
  }, [seed]);
  return (
    <div aria-hidden className="flex h-11 items-stretch gap-[2px]">
      {bars.map((w, i) => (
        <span key={i} className="bg-zinc-900" style={{ width: w }} />
      ))}
    </div>
  );
}

function BoardingPass({ item, transports, days }: { item: Item; transports: Item[]; days: TripDay[] }) {
  const f = parseFlight(item)!;
  const back = returnFlight(item, transports);
  const cell = (label: string, value: string) => (
    <div className="min-w-0">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="truncate text-lg font-bold tabular-nums">{value || "—"}</p>
    </div>
  );
  return (
    <div className="overflow-hidden rounded-3xl bg-[#f5f1ea] shadow-2xl">
      <div className="flex items-center justify-between bg-zinc-900 px-5 py-3.5">
        <span className="text-xs font-bold tracking-[0.3em] text-amber-400">BOARDING PASS</span>
        <span className="font-bold text-white">{f.flightNo ?? ""}</span>
      </div>
      <div className="flex flex-col gap-5 px-5 pt-6 pb-4">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-5xl leading-none font-black tracking-tight">{f.from}</p>
            <p className="mt-1 text-xs text-zinc-500">{f.fromName}</p>
          </div>
          <div aria-hidden className="mb-6 flex flex-1 items-center gap-1 text-zinc-500">
            <span className="flex-1 border-t-2 border-dashed border-zinc-300" />
            <PlaneIcon className="size-4 rotate-45" />
            <span className="flex-1 border-t-2 border-dashed border-zinc-300" />
          </div>
          <div className="text-right">
            <p className="text-5xl leading-none font-black tracking-tight">{f.to}</p>
            <p className="mt-1 text-xs text-zinc-500">{f.toName}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {cell("날짜", md(dateOfDay(days, item.day)))}
          {cell("출발", formatTime(item.time))}
          {cell("일차", `DAY ${item.day}`)}
        </div>
        {item.memo && <p className="rounded-xl bg-black/5 px-3 py-2 text-sm whitespace-pre-wrap">{item.memo}</p>}
      </div>
      <div className="relative mx-5 border-t-2 border-dashed border-zinc-300">
        <span className="absolute -top-3 -left-8 size-6 rounded-full bg-black/55" />
        <span className="absolute -top-3 -right-8 size-6 rounded-full bg-black/55" />
      </div>
      <div className="flex items-end justify-between gap-3 px-5 pt-4 pb-5">
        <Barcode seed={f.flightNo ?? item.id} />
        {back && (
          <div className="text-right">
            <p className="text-[11px] text-zinc-500">돌아오는 편</p>
            <p className="text-sm font-bold">
              {back.flight.flightNo ?? back.item.name} · {md(dateOfDay(days, back.item.day)).slice(0, 5)} {formatTime(back.item.time)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────── 2. 숙소 예약 ─────────

function StayCard({ item, lodgings, days, coverImage, companions }: { item: Item; lodgings: Item[]; days: TripDay[]; coverImage: string; companions: number }) {
  const stay = stayRange(item, lodgings, days);
  const [showMemo, setShowMemo] = useState(false);
  // 여행 기간 막대: 이 숙소에 묵는 밤은 주황, 나머지는 회색
  const nights = days.slice(0, -1);
  const mine = (d: number) => {
    const out = stay.next ? stay.next.day : days[days.length - 1]?.day ?? item.day;
    return d >= item.day && d < out;
  };
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="relative h-40 bg-cover bg-center md:h-52" style={{ backgroundImage: `url("${coverImage}")` }}>
        <span className="absolute top-3 left-3 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow">✓ 숙소</span>
      </div>
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
            <div className="mt-2 flex justify-between gap-2 text-xs">
              <span className="font-semibold text-amber-700">지금 보는 숙소{item.address ? ` · ${item.address}` : ""}</span>
              {stay.next && <span className="truncate text-zinc-500">다음 · {stay.next.name}</span>}
            </div>
          </div>
        )}
        {(item.memo || item.link) && (
          <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-3 text-sm">
            {item.memo ? (
              <button type="button" onClick={() => setShowMemo((v) => !v)} className="min-w-0 text-left text-zinc-600">
                <span className="text-zinc-500">메모 · 예약번호 </span>
                <span className="font-mono">{showMemo ? item.memo : "••••••"}</span>
              </button>
            ) : (
              <span />
            )}
            {item.link && (
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">
                예약 보기 ↗
              </a>
            )}
          </div>
        )}
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

function RideTicket({ item, days }: { item: Item; days: TripDay[] }) {
  const ride = parseRide(item.name);
  const cost = formatCost(item.cost_amount, item.cost_currency);
  const Icon = ride?.bus ? BusIcon : TrainIcon;
  const cell = (label: string, value: string) => (
    <div className="min-w-0">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="truncate text-lg font-bold tabular-nums">{value || "—"}</p>
    </div>
  );
  return (
    <div className="overflow-hidden rounded-3xl bg-[#eef2f7] shadow-2xl">
      <div className="flex items-center justify-between gap-3 bg-[#1e3a5f] px-5 py-3.5">
        <span className="text-xs font-bold tracking-[0.3em] text-sky-300">TICKET</span>
        <span className="truncate font-bold text-white">{ride ? ride.carrier : ""}</span>
      </div>
      <div className="flex flex-col gap-5 px-5 pt-6 pb-5">
        {ride ? (
          <div className="flex items-end justify-between gap-2">
            <p className="min-w-0 text-3xl leading-tight font-black tracking-tight break-keep">{ride.from}</p>
            <div aria-hidden className="mb-2 flex min-w-10 flex-1 items-center gap-1 text-zinc-500">
              <span className="flex-1 border-t-2 border-dashed border-zinc-300" />
              <Icon className="size-4" />
              <span className="flex-1 border-t-2 border-dashed border-zinc-300" />
            </div>
            <p className="min-w-0 text-right text-3xl leading-tight font-black tracking-tight break-keep">{ride.to}</p>
          </div>
        ) : (
          <p className="text-2xl leading-tight font-black tracking-tight break-keep">{item.name}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {cell("날짜", md(dateOfDay(days, item.day)))}
          {cell("출발", formatTime(item.time))}
        </div>
        {(item.address || cost) && (
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-zinc-500">타는 곳</p>
              <p className="font-semibold break-words">{item.address || "—"}</p>
            </div>
            {cost && <p className="shrink-0 text-lg font-bold tabular-nums">{cost}</p>}
          </div>
        )}
        {item.memo && <p className="rounded-xl bg-black/5 px-3 py-2 text-sm whitespace-pre-wrap">{item.memo}</p>}
        {!ride && <p className="text-xs text-zinc-400">이름을 “KTX 101 서울→부산”처럼 쓰면 출발·도착이 크게 나와요.</p>}
      </div>
    </div>
  );
}

// ───────── 4. 교통 패스 ─────────

function PassCard({ item, days }: { item: Item; days: TripDay[] }) {
  const lines = passLines(item.memo);
  const cost = formatCost(item.cost_amount, item.cost_currency);
  const date = md(dateOfDay(days, item.day));
  return (
    <div className="rounded-3xl bg-white p-5 shadow-2xl">
      <div className="relative overflow-hidden rounded-2xl bg-[#173a2c] p-5 text-white">
        <svg aria-hidden viewBox="0 0 200 200" className="absolute -top-10 -right-10 size-56 text-white/10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="100" cy="100" r="40" />
          <circle cx="100" cy="100" r="65" />
          <circle cx="100" cy="100" r="90" />
        </svg>
        <p className="relative text-2xl leading-tight font-black tracking-tight break-keep">{item.name}</p>
        <p className="relative mt-1 text-[11px] font-semibold tracking-[0.25em] text-emerald-300">TRANSIT PASS</p>
        <div className="relative mt-10 flex items-end justify-between">
          <div>
            <p className="text-xs text-white/70">사용일</p>
            <p className="text-xl font-bold">{date || `DAY ${item.day}`}</p>
          </div>
          {cost && <p className="text-xl font-bold">{cost}</p>}
        </div>
      </div>
      <p className="mt-4 text-xs text-zinc-500">개시하는 날</p>
      <p className="font-bold">
        {date || `DAY ${item.day}`}
        {formatTime(item.time) && ` · ${formatTime(item.time)}`}
        {item.address && ` · ${item.address}`}
      </p>
      {lines.length > 0 && (
        <>
          <p className="mt-4 text-xs text-zinc-500">탈 수 있는 노선</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {lines.map((l) => (
              <span key={l} className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-900">
                {l}
              </span>
            ))}
          </div>
        </>
      )}
      {lines.length === 0 && <p className="mt-3 text-xs text-zinc-400">메모에 노선을 쉼표로 적으면 여기에 나와요. 예: JR 교토선, 한큐 교토선</p>}
    </div>
  );
}

// ───────── 5. 준비물 (이 브라우저에만 저장) ─────────

type Check = { id: string; label: string; done: boolean };
const CHANGE = "stepmap:checklist-change";

function checklistKey(tripId: string) {
  return `stepmap:checklist:${tripId}`;
}
function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function useChecklist(tripId: string) {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(checklistKey(tripId));
      } catch {
        return null;
      }
    },
    () => null,
  );
  const checks: Check[] = useMemo(() => {
    try {
      const parsed = raw ? (JSON.parse(raw) as Check[]) : null;
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // 깨진 값이면 기본 목록
    }
    return []; // 넣은 준비물이 없으면 비어 있다(F16). 하나 더할 때마다 한 줄씩 생긴다.
  }, [raw]);
  const save = useCallback(
    (next: Check[]) => {
      try {
        window.localStorage.setItem(checklistKey(tripId), JSON.stringify(next));
      } catch {
        // 저장소를 못 쓰면 바뀌지 않는다
      }
      window.dispatchEvent(new Event(CHANGE));
    },
    [tripId],
  );
  return [checks, save] as const;
}

function dDay(start: string | null): string | null {
  if (!start) return null;
  const today = new Date();
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const s = Date.parse(`${start}T00:00:00Z`);
  const n = Math.round((s - t) / 86400000);
  return n > 0 ? `출발까지 D-${n}` : n === 0 ? "오늘 출발" : "여행 중이거나 다녀온 여행";
}

// 매거진 BACK의 준비물 (F16). 공유받은 사람에게는 보이지 않는다(B76, 매거진에서 readOnly면 넣지 않음).
// - 처음에는 비어 있고 제목 옆 "＋ 준비물 추가"로 하나씩 더한다. 하나라도 있으면 반투명 패널(BACK의 다른 칸과 같은 모양)이 생긴다.
// - 패널은 서랍처럼 접힌다. 접으면 진행률 원과 개수만 보인다.
export function Checklist({ tripId, startDate, weather, title, panelClassName }: { tripId: string; startDate: string | null; weather: TripWeather | null; title: ReactNode; panelClassName: string }) {
  const [checks, save] = useChecklist(tripId);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(true);
  const [text, setText] = useState("");
  const done = checks.filter((c) => c.done).length;
  const pct = checks.length ? Math.round((done / checks.length) * 100) : 0;
  const rainy = weather?.days.find(isRainy);
  const r = 22;
  const circ = 2 * Math.PI * r;

  const form = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const label = text.trim();
        if (!label) return;
        save([...checks, { id: `u${Date.now()}`, label, done: false }]);
        setText("");
      }}
      className="flex gap-2"
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={40}
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {title}
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
      </div>

      {checks.length === 0 ? (
        adding && <div className={`${panelClassName} p-4`}>{form}</div>
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
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={c.done}
                          onChange={() => save(checks.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))}
                          className="size-5 shrink-0 cursor-pointer accent-amber-400"
                        />
                        <span className={`truncate ${c.done ? "text-white/40 line-through" : ""}`}>{c.label}</span>
                      </label>
                      {rainy && c.label.includes("우산") && <span className="shrink-0 text-xs font-semibold text-sky-300">{md(rainy.date).slice(0, 5)} 비 {weather?.source === "forecast" ? "예보" : "(작년)"}</span>}
                      <button
                        type="button"
                        onClick={() => save(checks.filter((x) => x.id !== c.id))}
                        aria-label={`${c.label} 빼기`}
                        className="shrink-0 rounded-full px-1.5 text-white/30 opacity-0 transition group-hover:opacity-100 hover:text-white focus:opacity-100"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
                {adding && form}
                <p className="text-[11px] text-white/45">준비물은 이 브라우저에만 저장돼요.</p>
              </div>
            </div>
          </div>
        </div>
      )}
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

// 종류마다 카드 하나 (F16). 같은 종류의 예약(항공권 여러 편, 숙소 여러 곳)은 이 카드 하나로 묶고, 창 위의 탭으로 나눠 본다.
type GoKind = "flight" | "ticket" | "lodging" | "pass";
const KIND_LABEL: Record<GoKind, string> = { flight: "항공권", ticket: "승차권", lodging: "숙소", pass: "교통 패스" };
const KIND_UNIT: Record<GoKind, string> = { flight: "편", ticket: "장", lodging: "곳", pass: "건" };

function dayLabel(days: TripDay[], item: Item): string {
  return md(dateOfDay(days, item.day)) || `DAY ${item.day}`;
}

// 카드 아래 줄: 하나면 "날짜 · 시각(또는 박 수·비용)", 여럿이면 "첫 날짜 – 마지막 날짜"
function groupFoot(kind: GoKind, group: Item[], lodgings: Item[], days: TripDay[]): string {
  const first = group[0];
  if (group.length > 1) {
    const last = group[group.length - 1];
    const a = dayLabel(days, first);
    const b = dayLabel(days, last);
    return a === b ? a : `${a} – ${b}`;
  }
  if (kind === "lodging") {
    const stay = stayRange(first, lodgings, days);
    return [stay.nights ? `${stay.nights}박` : null, dayLabel(days, first)].filter(Boolean).join(" · ");
  }
  if (kind === "flight" || kind === "ticket") return [dayLabel(days, first), formatTime(first.time)].filter(Boolean).join(" · ");
  return [dayLabel(days, first), formatCost(first.cost_amount, first.cost_currency)].filter(Boolean).join(" · ");
}

function groupTitle(kind: GoKind, group: Item[]): string {
  const first = group[0];
  const route = kind === "flight" ? parseFlight(first) : kind === "ticket" ? parseRide(first.name) : null;
  const base = route ? `${route.from} → ${route.to}` : first.name;
  return group.length > 1 ? `${base} 외 ${group.length - 1}${KIND_UNIT[kind]}` : base;
}

function GroupTile({ kind, group, items, days, readOnly, coverImage, companions }: { kind: GoKind; group: Item[]; items: Item[]; days: TripDay[]; readOnly: boolean; coverImage: string; companions: number }) {
  const d = useDialog();
  const [picked, setPicked] = useState(0);
  const index = Math.min(picked, group.length - 1); // 지워서 줄어들면 마지막 것을 보여 준다
  const item = group[index];
  const lodgings = items.filter((i) => i.kind === "lodging");
  const icon =
    kind === "flight" ? <PlaneIcon className="size-4" />
    : kind === "ticket" ? (group.every((g) => parseRide(g.name)?.bus) ? <BusIcon className="size-4" /> : <TrainIcon className="size-4" />)
    : kind === "lodging" ? <BedIcon className="size-4" />
    : <PassIcon className="size-4" />;
  const corner =
    group.length > 1 ? `${group.length}건`
    : kind === "flight" ? (parseFlight(item)?.flightNo ?? undefined)
    : kind === "ticket" ? parseRide(item.name)?.carrier || undefined
    : kind === "lodging" ? item.address
    : undefined;

  const body =
    kind === "flight" ? (
      <BoardingPass item={item} transports={items.filter((i) => i.kind === "transport")} days={days} />
    ) : kind === "ticket" ? (
      <RideTicket item={item} days={days} />
    ) : kind === "lodging" ? (
      <StayCard item={item} lodgings={lodgings} days={days} coverImage={coverImage} companions={companions} />
    ) : (
      <PassCard item={item} days={days} />
    );

  return (
    <>
      <Tile icon={icon} kind={KIND_LABEL[kind]} corner={corner} title={groupTitle(kind, group)} foot={groupFoot(kind, group, lodgings, days)} onOpen={d.open} />
      <GoDialog dialogRef={d.ref} label={`${KIND_LABEL[kind]} 자세히`} actions={!readOnly}>
        {group.length > 1 && (
          <div role="tablist" aria-label={`${KIND_LABEL[kind]} 고르기`} className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {group.map((g, i) => (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                onClick={() => setPicked(i)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition active:scale-95 ${i === index ? "bg-white text-zinc-900" : "bg-white/15 text-white hover:bg-white/25"}`}
              >
                {dayLabel(days, g)} · {kind === "flight" ? (parseFlight(g)?.flightNo ?? g.name) : kind === "ticket" ? (parseRide(g.name)?.carrier || g.name) : g.name}
              </button>
            ))}
          </div>
        )}
        <ItemDialogBody key={`${item.id}:${item.updated_at}`} item={item} days={days} readOnly={readOnly} close={d.close}>
          {body}
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
        <WeatherCard weather={weather} />
      </GoDialog>
    </>
  );
}

export function TicketStrip({ items, days, readOnly, coverImage, companions }: Props) {
  // 종류별로 묶고(각 묶음 안은 날짜순, groupItems가 이미 정렬함), 묶음은 가장 이른 예약 날짜순
  const groups = (
    [
      ["flight", items.filter((i) => parseFlight(i))],
      ["ticket", items.filter(isTicket)],
      ["lodging", items.filter((i) => i.kind === "lodging")],
      ["pass", items.filter(isPass)],
    ] as [GoKind, Item[]][]
  )
    .map(([kind, group]) => [kind, [...group].sort(compareItems)] as [GoKind, Item[]])
    .filter(([, group]) => group.length > 0)
    .sort((a, b) => compareItems(a[1][0], b[1][0]));

  return (
    <ul aria-label="GO: 교통·숙소" className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pt-2 pb-4">
      {groups.map(([kind, group]) => (
        <GroupTile key={kind} kind={kind} group={group} items={items} days={days} readOnly={readOnly} coverImage={coverImage} companions={companions} />
      ))}
      {groups.length === 0 && <li className="self-center px-2 text-sm text-white/70">비행기 표·기차표·숙소를 넣으면 여기에 카드로 나와요.</li>}
    </ul>
  );
}
