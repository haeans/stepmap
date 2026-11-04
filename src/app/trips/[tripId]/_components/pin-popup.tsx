"use client";

import { InfoWindow } from "@vis.gl/react-google-maps";
import { useEffect } from "react";
import { formatTime } from "@/lib/items/types";
import { hubLabel, type MapPlace } from "@/lib/map/places";

// 핀 위 팝업 (C9 F25, R-06 b안): 이름과 시간·주소·메모 표(값이 없으면 줄을 숨김), 오른쪽 아래 구글맵 아이콘.
// 예약번호·예약 링크는 넣지 않는다. 공항·역·터미널 거점은 주소·메모가 없어 이름, "공항 · 도착", 시간만 보인다.
// 마지막 날 아침 숙소의 시각은 핀 목록(schedulePins)에서 이미 비어 온다.
// 닫기: 작은 X 버튼·Esc는 여기서, 지도 빈 곳 누르기는 route-map.tsx가 처리한다.

type Props = {
  place: MapPlace;
  anchor: google.maps.marker.AdvancedMarkerElement | null; // 아직 준비 안 됐으면 null
  onClose: () => void;
};

// 팝업 폭: 최소 15rem·최대 20rem, 좁은 화면에서는 화면 폭 - 4rem을 넘지 않는다.
// 여백까지 포함한 폭이다(border-box). InfoWindow maxWidth(320)를 넘으면 구글 틀 안에서 가로로 잘린다.
const WIDTH = "min-w-[min(15rem,calc(100vw-4rem))] max-w-[min(20rem,calc(100vw-4rem))]";

// 안쪽 여백: 네 방향 모두 약 16px. 구글 틀이 위·왼쪽에는 약 12px를 이미 넣고 오른쪽·아래는 0이라
// 위·왼쪽은 4px만, 오른쪽·아래는 16px를 둔다. 구글 여백 값이 다르면 이 줄만 고친다.
const PAD = "pt-1 pl-1 pr-4 pb-4";

// 구글맵 아이콘: 그 장소의 장소 카드(사진·리뷰·영업시간)가 열리도록 이름·주소로 검색한다.
// 흔한 이름은 다른 곳이 열릴 수 있다. 그러면 장소 id(items.place_id)로 여는 방식으로 넓힌다.
export function googleMapsUrl(place: Pick<MapPlace, "name" | "address" | "hub" | "lat" | "lng">): string {
  const base = "https://www.google.com/maps/search/?api=1&query=";
  const query = mapsQuery(place);
  return query ? base + encodeURIComponent(query) : `${base}${place.lat},${place.lng}`;
}

const MAX_ADDRESS = 80;

// 구글맵 검색어 (F25): 좌표로 열면 이름 없는 빈 위치만 나와서, 장소 카드가 열리도록 이름(+주소)으로 찾는다.
// 공항·역·터미널은 "간사이 공항"처럼 이름만. 장소·숙소는 "이름, 주소"(주소가 없으면 이름만). 둘 다 없으면 ""(좌표로 연다).
function mapsQuery({ name, address, hub }: Pick<MapPlace, "name" | "address" | "hub">): string {
  const title = name.trim();
  if (hub) return title;
  const where = tidyAddress(address);
  if (!where || where === title) return title;
  return title ? `${title}, ${where}` : where;
}

// 주소 다듬기: 전각 숫자·공백을 반각으로(NFKC), 우편번호(〒531-6039)를 빼고, 겹친 공백·쉼표를 줄인다.
// 너무 길면 80자 안의 마지막 쉼표에서 자른다(나라·도시·구는 남기고 뒤쪽 번지를 버림). 건물 이름·나라 이름은 남긴다.
function tidyAddress(address: string): string {
  const text = address
    .normalize("NFKC")
    .replace(/〒\s*[\d-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*(,\s*)*/g, ", ")
    .replace(/^[\s,]+|[\s,]+$/g, "");
  if (text.length <= MAX_ADDRESS) return text;
  const cut = text.lastIndexOf(",", MAX_ADDRESS);
  return (cut > 0 ? text.slice(0, cut) : text.slice(0, MAX_ADDRESS)).trim();
}

export function PinPopup({ place, anchor, onClose }: Props) {
  // Esc로 닫기. 구글 기본 머리글을 꺼서(headerDisabled) 직접 받는다. 구글이 함께 닫아도 onClose가 두 번 불릴 뿐이다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows = [
    { label: "시간", value: formatTime(place.time) },
    { label: "주소", value: place.address },
    { label: "메모", value: place.memo },
  ].filter((r) => r.value);

  return (
    // 구글 X 버튼은 크기를 바꿀 수 없어 머리글을 끄고 제목·X를 직접 그린다
    <InfoWindow anchor={anchor} onClose={onClose} headerDisabled maxWidth={320}>
      {/* 감싸는 div 하나에 여백을 두고, X·표 구분선·구글맵 아이콘을 모두 그 안쪽에 그린다 */}
      <div className={`box-border flex flex-col gap-2 text-sm text-zinc-900 ${PAD} ${WIDTH}`}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-base leading-snug font-bold break-words">{place.name}</p>
            {place.hub && <p className="text-sm text-zinc-600">{hubLabel(place.hub)}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            title="닫기"
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900"
          >
            <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>

        {/* 표: 위쪽 가는 선, 줄 사이 가는 선. 값이 없는 줄은 그리지 않아 선도 함께 사라진다 */}
        {rows.length > 0 && (
          <dl className="divide-y divide-zinc-200 border-t border-zinc-200 leading-snug">
            {rows.map((r) => (
              <div key={r.label} className="flex gap-3 py-1.5">
                <dt className="w-8 shrink-0 text-sm text-zinc-600">{r.label}</dt>
                <dd className="min-w-0 flex-1 text-sm break-words whitespace-pre-line text-zinc-900">{r.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="flex justify-end">
          <a
            href={googleMapsUrl(place)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="구글맵에서 보기"
            title="구글맵에서 보기"
            className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-800 transition hover:bg-zinc-200 hover:text-zinc-950 active:scale-95"
          >
            <GlobeArrowIcon />
          </a>
        </div>
      </div>
    </InfoWindow>
  );
}

// 지구본(왼쪽 아래)에 바깥으로 나가는 화살표(오른쪽 위)를 겹친 아이콘
function GlobeArrowIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="14" r="7.5" />
      <ellipse cx="10" cy="14" rx="3.2" ry="7.5" />
      <path d="M2.5 14h15" />
      <path d="M15 3h6v6M21 3l-7 7" />
    </svg>
  );
}
