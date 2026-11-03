// 1화면 B안 "종이" (F11, 레퍼런스 f11.png). 한 장의 종이 위에 일정을 시간순으로 촘촘하게 보여 준다.
// 순서(02-FRONTEND.md 3-2): 위쪽(제목·기간·기록 수) → 교통·숙소 → DAY 1~N(시각·점·이름·부가 설명) → 쓴 돈·쪽지

import Link from "next/link";
import { formatAmount, summarizeCosts } from "@/lib/cost/summary";
import type { GroupedItems } from "@/lib/items/group";
import { formatCost, formatTime, GEOCODED_KINDS, type Item } from "@/lib/items/types";
import { dayColor } from "@/lib/map/places";
import type { TripDay } from "@/lib/trips/days";
import { formatShortDate, formatShortPeriod } from "@/lib/trips/short-date";
import type { Trip } from "@/lib/trips/types";
import { ItemMenu } from "./item-menu";
import { NoteComposer } from "./note-composer";

type Props = { trip: Trip; grouped: GroupedItems; count: number; dayOptions: TripDay[]; readOnly: boolean };

const MUTED = "text-zinc-500 dark:text-zinc-400";
const RULE = "border-zinc-200 dark:border-zinc-800";
// 매거진처럼 굵고 촘촘한 제목 (바탕은 흰 종이 그대로)
const SECTION = "text-xl font-bold tracking-tight";

// 지도에 핀이 있는 항목은 이름을 누르면 지도 탭으로 넘어간다. (R-07)
function ItemName({ item, className }: { item: Item; className: string }) {
  if (GEOCODED_KINDS.includes(item.kind) && item.lat !== null) {
    return (
      <Link href={`/trips/${item.trip_id}?view=map&item=${item.id}`} title="지도에서 보기" className={`${className} hover:underline`}>
        {item.name}
      </Link>
    );
  }
  return <span className={className}>{item.name}</span>;
}

function detail(item: Item): string {
  return [item.address, item.memo].filter(Boolean).join(" · ");
}

function PlaneIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0 text-rose-600" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}

function BedIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0 text-rose-600" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />
    </svg>
  );
}

// 교통·숙소 한 줄: 아이콘, 이름, 주소 | 일차·시각, 메뉴
function GoRow({ item, days, readOnly }: { item: Item; days: TripDay[]; readOnly: boolean }) {
  const date = formatShortDate(days.find((d) => d.day === item.day)?.date ?? null);
  const when = [date || `DAY ${item.day}`, formatTime(item.time)].filter(Boolean).join(" ");
  return (
    // 모바일은 날짜·시각을 이름 아래로 내려 이름이 잘리지 않게 한다.
    <li className="flex items-start gap-2 py-1 sm:items-center">
      <span className="mt-0.5 sm:mt-0">{item.kind === "transport" ? <PlaneIcon /> : <BedIcon />}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
          <ItemName item={item} className="break-words" />
          {item.address && <span className={`text-xs ${MUTED}`}>{item.address}</span>}
        </div>
        <span className={`shrink-0 text-xs tabular-nums ${MUTED}`}>{when}</span>
      </div>
      {!readOnly && <ItemMenu item={item} days={days} />}
    </li>
  );
}

function DayHeader({ day }: { day: TripDay }) {
  return (
    <div className="flex items-center gap-3">
      <h3 className="text-2xl font-bold tracking-tight" style={{ color: dayColor(day.day) }}>
        DAY {day.day}
      </h3>
      {day.date && <span className={`text-xs ${MUTED}`}>{formatShortDate(day.date)}</span>}
      <span aria-hidden className={`h-px flex-1 border-t ${RULE}`} />
    </div>
  );
}

// 장소 한 줄: 시각 | 점(+이어지는 선) | 이름·부가 설명 | 메뉴
function PlaceRow({ item, last, color, days, readOnly }: { item: Item; last: boolean; color: string; days: TripDay[]; readOnly: boolean }) {
  const sub = detail(item);
  const cost = formatCost(item.cost_amount, item.cost_currency);
  return (
    <li className="grid grid-cols-[3rem_1rem_1fr_auto] gap-x-2 sm:grid-cols-[3.5rem_1rem_1fr_auto]">
      <span className={`pt-1 text-right text-xs font-medium tabular-nums ${MUTED}`}>{formatTime(item.time) || "—"}</span>
      <span className="relative flex justify-center">
        <span aria-hidden className="relative z-10 mt-1.5 size-2.5 rounded-full" style={{ backgroundColor: color }} />
        {!last && <span aria-hidden className="absolute top-3 -bottom-1.5 w-px bg-zinc-300 dark:bg-zinc-700" />}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5 pb-4">
        <ItemName item={item} className="text-base leading-snug font-semibold break-words" />
        {(sub || cost) && <p className={`text-xs break-words ${MUTED}`}>{[sub, cost].filter(Boolean).join(" · ")}</p>}
        {item.lat === null && <p className="text-xs text-amber-600">위치 없음: 지도에 표시되지 않습니다.</p>}
      </div>
      {!readOnly ? <ItemMenu item={item} days={days} /> : <span />}
    </li>
  );
}

function Costs({ items, companions }: { items: Item[]; companions: number }) {
  if (items.length === 0) return <p className={`text-xs ${MUTED}`}>비용이 있는 항목이 없습니다.</p>;
  const totals = summarizeCosts(items, companions);
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3">
            <span className="truncate">{item.name}</span>
            <span className="shrink-0 text-xs leading-5 font-medium tabular-nums">{formatCost(item.cost_amount, item.cost_currency)}</span>
          </li>
        ))}
      </ul>
      <div className={`flex flex-col items-end gap-0.5 border-t pt-2 ${RULE}`}>
        <p className="flex flex-wrap justify-end gap-x-3 text-base font-bold tracking-tight tabular-nums">
          {totals.map((t) => (
            <span key={t.currency}>
              {formatAmount(t.total, t.currency)} {t.currency}
            </span>
          ))}
        </p>
        <p className={`flex flex-wrap justify-end gap-x-3 text-xs tabular-nums ${MUTED}`}>
          <span>1인당 ({companions}명)</span>
          {totals.map((t) => (
            <span key={t.currency}>
              {formatAmount(t.perPerson, t.currency)} {t.currency}
            </span>
          ))}
        </p>
        {totals.length > 1 && <p className={`text-xs ${MUTED}`}>통화가 달라 따로 합계를 냈습니다. 환율 계산은 하지 않습니다.</p>}
      </div>
    </div>
  );
}

// 쪽지 목록
function MemoList({ memos, days, readOnly }: { memos: Item[]; days: TripDay[]; readOnly: boolean }) {
  if (memos.length === 0) return <p className={`text-xs ${MUTED}`}>메모가 없습니다.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {memos.map((item) => (
        <li key={item.id} className="flex items-start gap-2">
          <span aria-hidden className={MUTED}>✎</span>
          <div className="min-w-0 flex-1">
            <p className="font-medium break-words">{item.name}</p>
            {item.memo && <p className={`text-xs whitespace-pre-wrap break-words ${MUTED}`}>{item.memo}</p>}
          </div>
          {!readOnly && <ItemMenu item={item} days={days} />}
        </li>
      ))}
    </ul>
  );
}

export function PaperView({ trip, grouped, count, dayOptions, readOnly }: Props) {
  const go = [...grouped.transport, ...grouped.lodging];
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-8 rounded-2xl border border-zinc-200 bg-white px-5 py-9 text-sm shadow-sm sm:px-10 dark:border-zinc-800 dark:bg-zinc-950">
      <header className="flex flex-col gap-2">
        {trip.destination && <p className={`text-xs tracking-[0.3em] uppercase ${MUTED}`}>{trip.destination}</p>}
        <h2 className="text-4xl font-bold tracking-tight break-keep sm:text-5xl">{trip.title}</h2>
        <p className={`text-sm ${MUTED}`}>
          {[formatShortPeriod(trip.start_date, trip.end_date), `${count}개의 기록`].join(" · ")}
        </p>
      </header>

      <section aria-label="교통·숙소" className={`flex flex-col gap-2 border-y py-5 ${RULE}`}>
        <h3 className={SECTION}>GO</h3>
        {go.length === 0 ? (
          <p className={`text-xs ${MUTED}`}>아직 교통·숙소 항목이 없습니다.</p>
        ) : (
          <ul className="flex flex-col">
            {go.map((item) => (
              <GoRow key={item.id} item={item} days={dayOptions} readOnly={readOnly} />
            ))}
          </ul>
        )}
      </section>

      {grouped.days.map(({ day, places }) => (
        <section key={day.day} aria-label={`${day.day}일차`} className="flex flex-col gap-3">
          <DayHeader day={day} />
          {places.length === 0 ? (
            <p className={`pl-[4.5rem] text-xs ${MUTED}`}>아직 장소가 없습니다.</p>
          ) : (
            <ol>
              {places.map((item, i) => (
                <PlaceRow key={item.id} item={item} last={i === places.length - 1} color={dayColor(day.day)} days={dayOptions} readOnly={readOnly} />
              ))}
            </ol>
          )}
        </section>
      ))}

      <footer className={`grid gap-8 border-t pt-5 sm:grid-cols-2 ${RULE}`}>
        <section aria-label="쓴 돈" className="flex flex-col gap-2">
          <h3 className={SECTION}>쓴 돈</h3>
          <Costs items={grouped.costs} companions={trip.companions} />
        </section>
        <section aria-label="쪽지" className="flex flex-col gap-2">
          {readOnly ? (
            <>
              <h3 className={SECTION}>쪽지</h3>
              <MemoList memos={grouped.memos} days={dayOptions} readOnly={readOnly} />
            </>
          ) : (
            <NoteComposer tripId={trip.id} title={<h3 className={SECTION}>쪽지</h3>}>
              <MemoList memos={grouped.memos} days={dayOptions} readOnly={readOnly} />
            </NoteComposer>
          )}
        </section>
      </footer>
    </article>
  );
}
