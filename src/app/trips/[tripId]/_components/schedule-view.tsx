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
// photos: 매거진 장소 카드에 직접 넣은 사진 (항목 id별)
type Props = {
  trip: Trip;
  grouped: GroupedItems;
  count: number;
  dayOptions: TripDay[];
  readOnly: boolean;
  coverUrl?: string | null;
  photos?: Record<string, string>;
};

export function ScheduleView(props: Props) {
  const [format, setFormat] = useScheduleFormat();

  return (
    <div className="flex flex-col gap-6">
      {/* 넓은 화면(xl)에서는 머리글 줄의 매거진/지도 버튼 아래, 화면 오른쪽 끝에 붙인다. */}
      <div className="self-end xl:absolute xl:top-[4.75rem] xl:right-8 xl:z-20">
        <Segmented label="일정 형식" size="sm" value={format ?? ""} options={FORMATS} onChange={(v) => setFormat(v as ScheduleFormat)} />
      </div>
      {format === "a" && <MagazineView {...props} />}
      {format === "b" && <ScheduleB {...props} />}
    </div>
  );
}
