"use client";

import type { GroupedItems } from "@/lib/items/group";
import type { TripDay } from "@/lib/trips/days";
import type { Trip } from "@/lib/trips/types";
import type { TripWeather } from "@/lib/weather/codes";
import { MagazineView } from "./magazine-view";

// 1화면(일정). C8에서 "종이" 형식을 지워 PC·모바일 모두 매거진 하나로 연다 (F13).
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
  weather?: TripWeather | null;
};

export function ScheduleView(props: Props) {
  return <MagazineView {...props} />;
}
