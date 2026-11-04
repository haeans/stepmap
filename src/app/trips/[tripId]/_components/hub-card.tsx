// 매거진 DAY의 시작·끝 교통 거점 카드 (C9 F26 결정 1·2). 공항·기차역·버스터미널은 교통 항목의 한쪽 끝이라
// 따로 저장된 장소가 아니다. 그래서 펼침·수정은 없고, 교통 항목은 GO 예약 카드에서 고친다.
// 사진은 아직 없어 로고로 대체한다(결정 2). 다른 사진을 정하면 LogoPhoto 자리만 바꾼다.

import { dayHub } from "@/lib/items/day-plan";
import { formatTime, type Item } from "@/lib/items/types";

const HUB_LABEL = { airport: "공항", station: "역", terminal: "터미널" } as const;

// 사진을 못 불러온 시작·끝 카드의 대체 이미지: 로고(public/brand/logo.png, 02-FRONTEND.md 7절)
export function LogoPhoto() {
  return (
    <div aria-hidden className="absolute inset-0 flex items-start justify-center bg-[#f3e9da] pt-5">
      {/* eslint-disable-next-line @next/next/no-img-element -- 작은 고정 이미지라 최적화가 필요 없다 */}
      <img src="/brand/logo.png" alt="" className="w-2/5 max-w-44 min-w-28 object-contain" />
    </div>
  );
}

type Props = { item: Item; side: "from" | "to" };

// 시각: 출발 거점은 교통의 출발 시각을 다른 카드처럼 왼쪽 위에 둔다. 도착 거점은 도착 시각을 저장하지 않아 비워 둔다.
export function HubCard({ item, side }: Props) {
  const hub = dayHub(item, side);
  if (!hub) return null;
  const time = formatTime(item.time);
  return (
    <article className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.07] text-white shadow-lg shadow-black/30 backdrop-blur-xl">
      <div className="relative h-28 overflow-hidden">
        <LogoPhoto />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        {side === "from" && time && <span className="absolute top-3 left-3 rounded-full bg-black/45 px-2.5 py-1 font-mono text-xs backdrop-blur-md">{time}</span>}
        <div className="absolute inset-x-3 bottom-3 min-w-0">
          <p className="text-xs text-white/70">
            {HUB_LABEL[hub.kind]} · {side === "to" ? "도착" : "출발"}
          </p>
          <h4 className="text-lg leading-tight font-semibold break-words drop-shadow">{hub.name}</h4>
        </div>
      </div>
      <p className="px-4 py-2.5 text-xs text-white/70">
        {item.name}
        {time && ` · ${time} 출발`}
      </p>
    </article>
  );
}
