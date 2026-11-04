"use client";

import { InfoWindow } from "@vis.gl/react-google-maps";
import { formatTime } from "@/lib/items/types";
import { hubLabel, type MapPlace } from "@/lib/map/places";

// 핀 위 팝업 (C9 F25, R-06 b안): 이름·일정 시간·주소·메모(없으면 칸도 숨김)와 구글맵으로 가는 버튼.
// 예약번호·예약 링크는 넣지 않는다. 공항·역·터미널 거점은 주소·메모가 없어 이름, "공항 · 도착", 시간만 보인다.
// 마지막 날 아침 숙소의 시각은 핀 목록(schedulePins)에서 이미 비어 온다.
// 닫기: X 버튼·Esc(InfoWindow 기본)는 onClose로, 지도 빈 곳 누르기는 route-map.tsx가 처리한다.

type Props = {
  place: MapPlace;
  anchor: google.maps.marker.AdvancedMarkerElement | null; // 아직 준비 안 됐으면 null
  onClose: () => void;
};

// 구글맵은 좌표로 연다. 구글 장소 id를 저장하지 않아 이름으로 찾으면 다른 곳이 나올 수 있다.
export function googleMapsUrl(place: Pick<MapPlace, "lat" | "lng">): string {
  return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
}

export function PinPopup({ place, anchor, onClose }: Props) {
  const time = formatTime(place.time);
  return (
    <InfoWindow
      anchor={anchor}
      onClose={onClose}
      maxWidth={280}
      headerContent={<p className="pr-1 text-base leading-snug font-bold break-words text-zinc-900">{place.name}</p>}
    >
      <div className="flex flex-col gap-1 pb-1 text-zinc-700">
        {place.hub && <p className="text-xs font-semibold text-zinc-500">{hubLabel(place.hub)}</p>}
        {time && <p className="font-mono text-xs">{time}</p>}
        {place.address && <p className="text-xs break-words">{place.address}</p>}
        {place.memo && <p className="mt-1 text-sm break-words whitespace-pre-line text-zinc-900">{place.memo}</p>}
        <a
          href={googleMapsUrl(place)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 self-start rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-700 active:scale-95"
        >
          구글맵에서 보기 ↗
        </a>
      </div>
    </InfoWindow>
  );
}
