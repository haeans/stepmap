// 1화면의 A안·B안. 화면 구조(영역과 순서)만 02-FRONTEND.md 3절을 따르고 꾸밈은 최소로 둔다.
// 항목은 groupItems로 영역별로 나눈 것을 받는다. 통화별 합계와 1인당 금액은 v0.8(R-09)에서 더한다.

import { formatCost, type Item } from "@/lib/items/types";
import type { GroupedItems } from "@/lib/items/group";
import type { TripDay } from "@/lib/trips/days";
import { formatTripPeriod, type Trip } from "@/lib/trips/types";
import { ItemCard } from "./item-card";

type Props = { trip: Trip; grouped: GroupedItems; count: number; dayOptions: TripDay[] };

const EMPTY = "text-sm text-zinc-500 dark:text-zinc-400";

function DayLabel({ day }: { day: TripDay }) {
  return (
    <>
      DAY {day.day}
      {day.date && <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">{day.date}</span>}
    </>
  );
}

function ItemList({ items, empty, days, compact }: { items: Item[]; empty: string; days: TripDay[]; compact?: boolean }) {
  if (items.length === 0) return <p className={EMPTY}>{empty}</p>;
  return (
    <ul className={compact ? "flex flex-col divide-y divide-dashed divide-zinc-200 dark:divide-zinc-800" : "flex flex-col gap-2"}>
      {items.map((item) => (
        <li key={item.id}>
          <ItemCard key={item.updated_at} item={item} days={days} compact={compact} />
        </li>
      ))}
    </ul>
  );
}

function CostList({ items }: { items: Item[] }) {
  if (items.length === 0) return <p className={EMPTY}>비용이 있는 항목이 없습니다.</p>;
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {items.map((item) => (
        <li key={item.id} className="flex justify-between gap-2">
          <span className="truncate">{item.name}</span>
          <span className="shrink-0 tabular-nums">{formatCost(item.cost_amount, item.cost_currency)}</span>
        </li>
      ))}
    </ul>
  );
}

// A안 "크게": 맨 위 → GO → DAY 1~N → BACK
export function ScheduleA({ trip, grouped, count, dayOptions }: Props) {
  return (
    <div className="flex flex-col gap-10">
      <section aria-label="여행 개요" className="flex flex-col gap-4">
        <div
          aria-label="대표 이미지"
          className="flex aspect-[21/9] w-full items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-400 dark:bg-zinc-900"
        >
          대표 이미지
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-4xl font-bold">{trip.title}</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            {[trip.destination, formatTripPeriod(trip), `${trip.companions}명`].filter(Boolean).join(" · ")}
          </p>
          <p className={EMPTY}>기록 {count}개</p>
        </div>
      </section>

      <section aria-labelledby="a-go" className="flex flex-col gap-3">
        <h3 id="a-go" className="text-2xl font-bold">GO</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">출발과 머물 곳</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="font-medium">교통</p>
            <ItemList items={grouped.transport} empty="아직 교통 항목이 없습니다." days={dayOptions} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium">숙소</p>
            <ItemList items={grouped.lodging} empty="아직 숙소 항목이 없습니다." days={dayOptions} />
          </div>
        </div>
      </section>

      {grouped.days.map(({ day, places }) => (
        <section key={day.day} aria-label={`${day.day}일차`} className="flex flex-col gap-3">
          <h3 className="text-2xl font-bold">
            <DayLabel day={day} />
          </h3>
          <ItemList items={places} empty="아직 장소가 없습니다." days={dayOptions} />
        </section>
      ))}

      <section aria-labelledby="a-back" className="flex flex-col gap-3">
        <h3 id="a-back" className="text-2xl font-bold">BACK</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="font-medium">쓴 돈</p>
            <CostList items={grouped.costs} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium">쪽지</p>
            <ItemList items={grouped.memos} empty="메모가 없습니다." days={dayOptions} />
          </div>
        </div>
      </section>
    </div>
  );
}

// B안 "종이": 위쪽 → 교통·숙소 요약 → DAY 1~N → 아래쪽
export function ScheduleB({ trip, grouped, count, dayOptions }: Props) {
  return (
    <article className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-sm border border-zinc-300 bg-white p-6 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
      <header className="flex flex-col gap-1 border-b border-dashed border-zinc-300 pb-4 dark:border-zinc-700">
        <h2 className="text-xl font-bold">{trip.title}</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          {[trip.destination, formatTripPeriod(trip)].filter(Boolean).join(" · ")}
        </p>
        <p className={EMPTY}>기록 {count}개</p>
      </header>

      <section aria-label="교통·숙소 요약" className="flex flex-col gap-2 border-b border-dashed border-zinc-300 pb-4 dark:border-zinc-700">
        <p className="font-medium">교통</p>
        <ItemList items={grouped.transport} empty="없음" days={dayOptions} compact />
        <p className="font-medium">숙소</p>
        <ItemList items={grouped.lodging} empty="없음" days={dayOptions} compact />
      </section>

      {grouped.days.map(({ day, places }) => (
        <section key={day.day} aria-label={`${day.day}일차`} className="flex flex-col gap-1">
          <h3 className="font-bold">
            <DayLabel day={day} />
          </h3>
          <ItemList items={places} empty="아직 장소가 없습니다." days={dayOptions} compact />
        </section>
      ))}

      <footer className="flex flex-col gap-2 border-t border-dashed border-zinc-300 pt-4 dark:border-zinc-700">
        <p className="font-medium">쓴 돈</p>
        <CostList items={grouped.costs} />
        <p className="font-medium">쪽지</p>
        <ItemList items={grouped.memos} empty="없음" days={dayOptions} compact />
      </footer>
    </article>
  );
}
