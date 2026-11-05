// 교통 항목에서 교통 거점(공항·역·터미널) 검색어를 만든다. (F15 결정 1·3)
// 이름은 입력창과 같은 규칙(splitRoute)으로 나누고, 좌표 찾기는 hub-lookup.ts가 한다.

import { compareItems } from "@/lib/items/group";
import { splitRoute } from "@/lib/items/route-name";
import type { Item } from "@/lib/items/types";
import { isFlight, isMoveTransport, parseRide } from "@/lib/trips/go-info";
import type { TravelMode } from "./route-plan";

export type HubKind = "airport" | "station" | "terminal";
export type HubQueries = { mode: TravelMode; kind: HubKind; from: string | null; to: string | null };

export const MAX_HUB_ITEMS = 20;

const SUFFIX: Record<HubKind, { word: string; ends: RegExp }> = {
  airport: { word: "공항", ends: /(공항|airport)$/i },
  station: { word: "역", ends: /(역|station)$/i },
  terminal: { word: "터미널", ends: /(터미널|terminal)$/i },
};

// 출발지·도착지 글자 하나로 검색어를 만든다. 영문·숫자로만 된 2자 이하(T1·T2 같은 터미널 표기 등)는 찾지 않는다.
// 한글 2자(인천·서울)와 3자 공항 코드(ICN)는 정상이다.
export function hubQuery(place: string, kind: HubKind): string | null {
  const text = place.trim();
  if (!text || /^[A-Za-z0-9]{1,2}$/.test(text)) return null;
  const { word, ends } = SUFFIX[kind];
  return ends.test(text) ? text : `${text} ${word}`;
}

// 비행기인가는 GO 카드와 같은 기준(go-info.ts isFlight, C9 F26 결정 3)을 쓴다.

// 교통 항목의 거점 종류: 비행기는 공항, 버스는 터미널, 그 밖은 역
export function hubKind(item: Item): HubKind {
  return isFlight(item) ? "airport" : parseRide(item.name)?.bus ? "terminal" : "station";
}

// 비행기는 공항, 버스는 터미널, 그 밖은 역. 교통 패스·교통카드와 화살표 없는 이름은 거점이 없다(C10 F30).
// 도착지 뒤에 교통 이름이 붙어도("동서울 -> 속초 고속버스") splitRoute 결과("속초 고속버스")를 그대로 쓴다.
// 글자가 많을수록 그 터미널·역을 더 잘 찾기 때문이다. (결정 3)
export function hubQueries(item: Item): HubQueries | null {
  if (!isMoveTransport(item)) return null;
  const { from, to } = splitRoute(item.name);
  if (!from && !to) return null;
  const kind = hubKind(item);
  const queries = { mode: kind === "airport" ? "flight" : "transport", kind, from: hubQuery(from, kind), to: hubQuery(to, kind) } as const;
  return queries.from || queries.to ? queries : null;
}

// 거점을 찾을 교통 항목: 일정 순서로 앞 20개 (결정 1)
export function hubTargets(items: Item[]): { item: Item; queries: HubQueries }[] {
  const targets: { item: Item; queries: HubQueries }[] = [];
  for (const item of [...items].sort(compareItems)) {
    const queries = hubQueries(item);
    if (queries) targets.push({ item, queries });
    if (targets.length === MAX_HUB_ITEMS) break;
  }
  return targets;
}
