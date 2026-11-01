// 1화면의 A안·B안. 화면 구조(영역과 순서)만 02-FRONTEND.md 3절을 따르고 꾸밈은 최소로 둔다.
// 일정 항목은 v0.5(R-05)부터 들어온다. 그 전까지 각 영역은 빈 상태를 보여 준다.

import { formatTripPeriod, type Trip } from "@/lib/trips/types";
import type { TripDay } from "@/lib/trips/days";

type Props = { trip: Trip; days: TripDay[] };

const EMPTY = "text-sm text-zinc-500 dark:text-zinc-400";

function DayLabel({ day }: { day: TripDay }) {
  return (
    <>
      DAY {day.day}
      {day.date && <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">{day.date}</span>}
    </>
  );
}

// A안 "크게": 맨 위 → GO → DAY 1~N → BACK
export function ScheduleA({ trip, days }: Props) {
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
          <p className={EMPTY}>기록 0개</p>
        </div>
      </section>

      <section aria-labelledby="a-go" className="flex flex-col gap-3">
        <h3 id="a-go" className="text-2xl font-bold">GO</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">출발과 머물 곳</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="font-medium">교통</p>
            <p className={EMPTY}>아직 교통 항목이 없습니다.</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="font-medium">숙소</p>
            <p className={EMPTY}>아직 숙소 항목이 없습니다.</p>
          </div>
        </div>
      </section>

      {days.map((day) => (
        <section key={day.day} aria-label={`${day.day}일차`} className="flex flex-col gap-3">
          <h3 className="text-2xl font-bold">
            <DayLabel day={day} />
          </h3>
          <p className={EMPTY}>아직 장소가 없습니다.</p>
        </section>
      ))}

      <section aria-labelledby="a-back" className="flex flex-col gap-3">
        <h3 id="a-back" className="text-2xl font-bold">BACK</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="font-medium">쓴 돈</p>
            <p className={EMPTY}>비용이 있는 항목이 없습니다.</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="font-medium">쪽지</p>
            <p className={EMPTY}>메모가 없습니다.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

// B안 "종이": 위쪽 → 교통·숙소 요약 → DAY 1~N → 아래쪽
export function ScheduleB({ trip, days }: Props) {
  return (
    <article className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-sm border border-zinc-300 bg-white p-6 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
      <header className="flex flex-col gap-1 border-b border-dashed border-zinc-300 pb-4 dark:border-zinc-700">
        <h2 className="text-xl font-bold">{trip.title}</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          {[trip.destination, formatTripPeriod(trip)].filter(Boolean).join(" · ")}
        </p>
        <p className={EMPTY}>기록 0개</p>
      </header>

      <section aria-label="교통·숙소 요약" className="flex flex-col gap-1 border-b border-dashed border-zinc-300 pb-4 dark:border-zinc-700">
        <p><span className="font-medium">교통</span> <span className={EMPTY}>없음</span></p>
        <p><span className="font-medium">숙소</span> <span className={EMPTY}>없음</span></p>
      </section>

      {days.map((day) => (
        <section key={day.day} aria-label={`${day.day}일차`} className="flex flex-col gap-1">
          <h3 className="font-bold">
            <DayLabel day={day} />
          </h3>
          <p className={EMPTY}>아직 장소가 없습니다.</p>
        </section>
      ))}

      <footer className="flex flex-col gap-1 border-t border-dashed border-zinc-300 pt-4 dark:border-zinc-700">
        <p><span className="font-medium">쓴 돈</span> <span className={EMPTY}>없음</span></p>
        <p><span className="font-medium">쪽지</span> <span className={EMPTY}>없음</span></p>
      </footer>
    </article>
  );
}
