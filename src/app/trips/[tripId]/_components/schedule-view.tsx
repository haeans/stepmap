"use client";

import type { GroupedItems } from "@/lib/items/group";
import type { TripDay } from "@/lib/trips/days";
import type { ScheduleFormat } from "@/lib/trips/schedule-format";
import type { Trip } from "@/lib/trips/types";
import { MagazineView } from "./magazine-view";
import { ScheduleB } from "./schedule-sections";
import { Segmented } from "./segmented";
import { useScheduleFormat } from "./use-schedule-format";

const FORMATS: { value: ScheduleFormat; label: string }[] = [
  { value: "a", label: "크게" },
  { value: "b", label: "종이" },
];

// coverUrl: 대표 이미지 주소(F08). 없으면 매거진이 임시 그림을 쓴다.
type Props = { trip: Trip; grouped: GroupedItems; count: number; dayOptions: TripDay[]; readOnly: boolean; coverUrl?: string | null };

export function ScheduleView(props: Props) {
  const [format, setFormat] = useScheduleFormat();

  return (
    <div className="flex flex-col gap-6">
      <div className="self-end">
        <Segmented label="일정 형식" size="sm" value={format ?? ""} options={FORMATS} onChange={(v) => setFormat(v as ScheduleFormat)} />
      </div>
      {format === "a" && <MagazineView {...props} />}
      {format === "b" && <ScheduleB {...props} />}
    </div>
  );
}
