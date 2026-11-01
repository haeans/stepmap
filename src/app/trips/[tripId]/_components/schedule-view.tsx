"use client";

import type { TripDay } from "@/lib/trips/days";
import type { ScheduleFormat } from "@/lib/trips/schedule-format";
import type { Trip } from "@/lib/trips/types";
import { ScheduleA, ScheduleB } from "./schedule-sections";
import { useScheduleFormat } from "./use-schedule-format";

const FORMATS: { value: ScheduleFormat; label: string }[] = [
  { value: "a", label: "크게" },
  { value: "b", label: "종이" },
];

export function ScheduleView({ trip, days }: { trip: Trip; days: TripDay[] }) {
  const [format, setFormat] = useScheduleFormat();

  return (
    <div className="flex flex-col gap-6">
      <div role="radiogroup" aria-label="일정 형식" className="flex gap-1 self-end rounded-md bg-zinc-100 p-1 text-sm dark:bg-zinc-900">
        {FORMATS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="radio"
            aria-checked={format === f.value}
            onClick={() => setFormat(f.value)}
            className={`rounded px-3 py-1 ${format === f.value ? "bg-white shadow-sm dark:bg-zinc-700" : "text-zinc-600 dark:text-zinc-400"}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {format === "a" && <ScheduleA trip={trip} days={days} />}
      {format === "b" && <ScheduleB trip={trip} days={days} />}
    </div>
  );
}
