import { Segmented } from "./segmented";

export type TripViewName = "schedule" | "map";

export function parseTripView(value: string | string[] | undefined): TripViewName {
  return value === "map" ? "map" : "schedule";
}

// 1화면(매거진)과 2화면(지도)을 오가는 전환 버튼 (02-FRONTEND.md 2절). 움직이는 선택 버튼(F10)을 쓴다.
export function ViewSwitch({ tripId, current }: { tripId: string; current: TripViewName }) {
  return (
    <Segmented
      role="navigation"
      label="여행 화면"
      value={current}
      options={[
        { value: "schedule", label: "일정", href: `/trips/${tripId}` },
        { value: "map", label: "지도", href: `/trips/${tripId}?view=map` },
      ]}
    />
  );
}
