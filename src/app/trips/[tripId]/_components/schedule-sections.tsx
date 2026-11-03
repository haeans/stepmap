// 1화면의 B안(A안은 magazine-view.tsx, F10). 화면 구조(영역과 순서)만 02-FRONTEND.md 3절을 따르고 꾸밈은 최소로 둔다.
// 항목은 groupItems로 영역별로 나눈 것을 받는다. 쓴 돈 영역에 통화별 합계와 1인당 금액을 둔다(R-09).

import { formatAmount, summarizeCosts } from "@/lib/cost/summary";
import { formatCost, type Item } from "@/lib/items/types";
import type { GroupedItems } from "@/lib/items/group";
import type { TripDay } from "@/lib/trips/days";
import { formatTripPeriod, type Trip } from "@/lib/trips/types";
import { ItemCard } from "./item-card";

// readOnly: 공유받은 사람(보기 전용)에게는 수정·삭제 버튼을 숨긴다. (R-08)
type Props = { trip: Trip; grouped: GroupedItems; count: number; dayOptions: TripDay[]; readOnly: boolean };

const EMPTY = "text-sm text-zinc-500 dark:text-zinc-400";

function DayLabel({ day }: { day: TripDay }) {
  return (
    <>
      DAY {day.day}
      {day.date && <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">{day.date}</span>}
    </>
  );
}

function ItemList({
  items,
  empty,
  days,
  compact,
  readOnly,
}: {
  items: Item[];
  empty: string;
  days: TripDay[];
  compact?: boolean;
  readOnly: boolean;
}) {
  if (items.length === 0) return <p className={EMPTY}>{empty}</p>;
  return (
    <ul className={compact ? "flex flex-col divide-y divide-dashed divide-zinc-200 dark:divide-zinc-800" : "flex flex-col gap-2"}>
      {items.map((item) => (
        <li key={item.id}>
          <ItemCard key={item.updated_at} item={item} days={days} compact={compact} readOnly={readOnly} />
        </li>
      ))}
    </ul>
  );
}

// 쓴 돈: 항목별 금액, 통화별 합계와 1인당 금액 (R-09). 글자색은 바깥을 따른다(매거진 사진 위 유리 카드, F10).
export function CostList({ items, companions }: { items: Item[]; companions: number }) {
  if (items.length === 0) return <p className="text-sm opacity-60">비용이 있는 항목이 없습니다.</p>;
  const totals = summarizeCosts(items, companions);
  return (
    <div className="flex flex-col gap-3 text-sm">
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between gap-2">
            <span className="truncate">{item.name}</span>
            <span className="shrink-0 tabular-nums">{formatCost(item.cost_amount, item.cost_currency)}</span>
          </li>
        ))}
      </ul>
      <table aria-label="통화별 합계" className="w-full border-t border-current/20 pt-2">
        <thead>
          <tr className="text-xs opacity-60">
            <th className="pt-2 text-left font-normal">통화</th>
            <th className="pt-2 text-right font-normal">합계</th>
            <th className="pt-2 text-right font-normal">1인당 ({companions}명)</th>
          </tr>
        </thead>
        <tbody>
          {totals.map((t) => (
            <tr key={t.currency} className="font-medium">
              <td className="py-0.5">{t.currency}</td>
              <td className="py-0.5 text-right tabular-nums">{formatAmount(t.total, t.currency)}</td>
              <td className="py-0.5 text-right tabular-nums">{formatAmount(t.perPerson, t.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {totals.length > 1 && <p className="text-xs opacity-60">통화가 달라 따로 합계를 냈습니다. 환율 계산은 하지 않습니다.</p>}
    </div>
  );
}

// B안 "종이": 위쪽 → 교통·숙소 요약 → DAY 1~N → 아래쪽
export function ScheduleB({ trip, grouped, count, dayOptions, readOnly }: Props) {
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
        <ItemList items={grouped.transport} empty="없음" days={dayOptions} readOnly={readOnly} compact />
        <p className="font-medium">숙소</p>
        <ItemList items={grouped.lodging} empty="없음" days={dayOptions} readOnly={readOnly} compact />
      </section>

      {grouped.days.map(({ day, places }) => (
        <section key={day.day} aria-label={`${day.day}일차`} className="flex flex-col gap-1">
          <h3 className="font-bold">
            <DayLabel day={day} />
          </h3>
          <ItemList items={places} empty="아직 장소가 없습니다." days={dayOptions} readOnly={readOnly} compact />
        </section>
      ))}

      <footer className="flex flex-col gap-2 border-t border-dashed border-zinc-300 pt-4 dark:border-zinc-700">
        <p className="font-medium">쓴 돈</p>
        <CostList items={grouped.costs} companions={trip.companions} />
        <p className="font-medium">쪽지</p>
        <ItemList items={grouped.memos} empty="없음" days={dayOptions} readOnly={readOnly} compact />
      </footer>
    </article>
  );
}
