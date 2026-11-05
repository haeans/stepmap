// 하루 일정 규칙 (C9 F26 결정 1). 매거진 DAY BY DAY(F26·F28)와 지도 핀(F25)이 같이 쓴다.
// 하루 일정은 그날의 관광지·식당이다. 교통 거점(공항·기차역·버스터미널)과 숙소는 여행의 첫날과 마지막 날에만 넣는다.
// - 첫날: 시작은 그날 첫 교통의 도착 거점(예: 간사이 공항), 끝은 그날 체크인한 숙소.
// - 마지막 날: 시작은 전날 밤 숙소(그날보다 앞서 체크인한 마지막 숙소), 끝은 그날 마지막 교통의 출발 거점.
//   가운데 날에 체크인한 숙소가 있으면(숙소를 옮긴 여행) 마지막 날은 숙소로 시작하지 않는다. (fix-day-lodging)
// - 가운데 날: 관광지·식당. 그날 체크인한 숙소가 있으면 끝에 넣는다(fix-day-lodging). 교통은 넣지 않는다.
// 끝에 붙는 숙소는 체크인 시각이 그날 일정 순서와 맞지 않을 수 있어 화면에서 시각을 숨긴다(place-card, map/places).
// 첫날·마지막 날은 일정(메모 빼고)이 있는 처음·마지막 일차다. 데이터, GO 예약 카드, 쓴 돈은 그대로다.
// 그날 일정이 하나도 없으면 빈 목록이다.
// 좌표는 보지 않는다. 거점 좌표가 필요한 곳(지도)은 entry의 교통 항목과 side로 찾는다(map/hub-lookup.ts).

import { hubKind, hubQuery, type HubKind } from "@/lib/map/hubs";
import { isPass, parseFlight } from "@/lib/trips/go-info";
import { compareItems } from "./group";
import { splitRoute } from "./route-name";
import type { Item } from "./types";

export type DayRole = "start" | "place" | "end";

// side: 교통 항목이면 거점 쪽(도착 "to" / 출발 "from"), 숙소·장소면 null
export type DayEntry = { role: DayRole; item: Item; side: "from" | "to" | null };

export type DayHub = { kind: HubKind; name: string };

const isPlace = (i: Item) => i.kind === "sight" || i.kind === "food";
const isMove = (i: Item) => i.kind === "transport" && !isPass(i);

// 교통 항목의 한쪽 거점 이름. 그쪽 이름이 없으면 null (거점으로 쓸 수 없다).
export function dayHub(item: Item, side: "from" | "to"): DayHub | null {
  if (!isMove(item)) return null;
  const kind = hubKind(item);
  const flight = kind === "airport" ? parseFlight(item) : null;
  const place = flight ? (side === "from" ? flight.fromName : flight.toName) : splitRoute(item.name)[side];
  const name = place ? hubQuery(place, kind) : null;
  return name ? { kind, name } : null;
}

// pendingDays: 저장 전 미리보기(F28)가 있는 일차. 첫날·마지막 날을 정할 때 같이 센다. 그래서 일부만 저장했어도
// 여행의 마지막 날(미리보기만 있는 날 포함)이 저장된 숙소로 시작한다. 미리보기 항목 자체는 넣지 않는다. (fix-day-lodging)
export function daySchedule(day: number, items: Item[], pendingDays: number[] = []): DayEntry[] {
  const sorted = items.filter((i) => i.kind !== "memo").sort(compareItems);
  const today = sorted.filter((i) => i.day === day);
  if (today.length === 0 && !pendingDays.includes(day)) return [];
  const days = [...sorted.map((i) => i.day), ...pendingDays];
  if (days.length === 0) return [];
  const firstDay = Math.min(...days);
  const lastDay = Math.max(...days);

  let start: DayEntry | null = null;
  let end: DayEntry | null = null;
  if (day === firstDay) {
    const arrival = today.find((i) => isMove(i) && dayHub(i, "to"));
    if (arrival) start = { role: "start", item: arrival, side: "to" };
  }
  // 그날 체크인한 숙소로 하루를 끝낸다. 첫날뿐 아니라 숙소를 옮기는 가운데 날도 같다(마지막 날은 아래에서 출발 거점으로 끝).
  if (day !== lastDay || day === firstDay) {
    const checkIn = today.findLast((i) => i.kind === "lodging");
    if (checkIn) end = { role: "end", item: checkIn, side: null };
  }
  if (day === lastDay) {
    // 마지막 날은 전날 밤 숙소로 시작한다. 가운데 날에 체크인한 숙소가 있으면 그날 끝에 이미 나왔으므로 다시 넣지 않는다.
    const movedMidTrip = sorted.some((i) => i.kind === "lodging" && i.day > firstDay && i.day < lastDay);
    const lastNight = movedMidTrip ? undefined : sorted.findLast((i) => i.kind === "lodging" && i.day < day);
    if (lastNight && !start) start = { role: "start", item: lastNight, side: null };
    const departure = today.findLast((i) => isMove(i) && dayHub(i, "from"));
    // 하루짜리 여행에서 도착한 교통 하나뿐이면 그것을 다시 출발로 쓰지 않는다
    if (departure && departure !== start?.item) end = { role: "end", item: departure, side: "from" };
  }

  const places: DayEntry[] = today.filter(isPlace).map((item) => ({ role: "place", item, side: null }));
  return [...(start ? [start] : []), ...places, ...(end ? [end] : [])];
}
