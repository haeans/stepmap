"use client";

import { AdvancedMarker, APIProvider, ControlPosition, Map, Pin, useAdvancedMarkerRef, useMap } from "@vis.gl/react-google-maps";
import { useEffect } from "react";
import { dayColor, type LatLng, type MapPlace } from "@/lib/map/places";
import { PinPopup } from "./pin-popup";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

// 패널에 가린 만큼 지도 가장자리에서 띄울 거리(px)
export type MapPadding = { top: number; right: number; bottom: number; left: number };

type Props = {
  places: MapPlace[]; // 모든 장소. 강조하지 않는 일차는 흐리게 그린다.
  framed: LatLng[]; // 지도 범위를 맞출 점 (고른 일차 또는 전체의 핀, F25)
  focusDay: number | null; // 강조할 일차 (F14 결정 4)
  selectedId: string | null;
  onSelect: (id: string) => void;
  popupId: string | null; // 팝업을 띄울 핀 (F25)
  onClosePopup: () => void;
  padding: MapPadding;
};

// 2화면의 구글맵. 일차별 색 번호 핀만 그린다. 동선 선과 ✈ 공항 표시는 F25에서 뺐다(공항은 번호 핀). (R-06)
export function RouteMap(props: Props) {
  if (!API_KEY) {
    return <div className="flex h-full items-center justify-center text-sm text-zinc-500">지도 키가 없어 지도를 표시할 수 없습니다.</div>;
  }
  return (
    <APIProvider apiKey={API_KEY} language="ko">
      <Map
        mapId={MAP_ID}
        defaultCenter={props.places[0] ?? { lat: 37.5665, lng: 126.978 }}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        // 오른쪽 위는 로고 메뉴, 아래는 모바일 시트 자리다 (F14 결정 9)
        zoomControlOptions={{ position: ControlPosition.RIGHT_CENTER }}
        className="h-full w-full"
        // 지도 빈 곳을 누르면 팝업을 닫는다. 핀을 누를 때는 지도 클릭이 오지 않는다 (F25)
        onClick={props.onClosePopup}
      >
        {props.places.map((p) => (
          <PlaceMarker
            key={p.id}
            place={p}
            selected={p.id === props.selectedId}
            dimmed={props.focusDay !== null && p.day !== props.focusDay}
            popup={p.id === props.popupId}
            onSelect={props.onSelect}
            onClosePopup={props.onClosePopup}
          />
        ))}
        <CameraControl points={props.framed} selected={props.places.find((p) => p.id === props.selectedId) ?? null} padding={props.padding} />
      </Map>
    </APIProvider>
  );
}

type MarkerProps = {
  place: MapPlace;
  selected: boolean;
  dimmed: boolean;
  popup: boolean;
  onSelect: (id: string) => void;
  onClosePopup: () => void;
};

// 일차 색 번호 핀 하나. 팝업은 그 핀에 붙여 핀 위에 띄운다.
// 핀마다 자기 팝업을 따로 띄우므로 다른 핀으로 옮겨 가도 앞 팝업의 닫기(onClose)가 새 팝업을 닫지 않는다.
function PlaceMarker({ place: p, selected, dimmed, popup, onSelect, onClosePopup }: MarkerProps) {
  const [ref, marker] = useAdvancedMarkerRef();
  return (
    <>
      <AdvancedMarker
        ref={ref}
        position={p}
        title={`DAY ${p.day} · ${p.order}. ${p.name}`}
        onClick={() => onSelect(p.id)}
        zIndex={selected ? 1000 : dimmed ? p.order : 100 + p.order}
        style={{ opacity: dimmed ? 0.35 : 1, transition: "opacity 200ms" }}
      >
        <Pin
          background={dayColor(p.day)}
          borderColor={selected ? "#18181b" : "#ffffff"}
          glyphColor="#ffffff"
          glyphText={String(p.order)}
          scale={selected ? 1.3 : 1}
        />
      </AdvancedMarker>
      {popup && <PinPopup place={p} anchor={marker} onClose={onClosePopup} />}
    </>
  );
}

// 고른 장소가 있으면 그 핀으로, 없으면 범위 안 점이 모두 들어오게 지도를 옮긴다. (R-07)
// 패널에 가린 곳(padding)을 빼고 남은 곳의 가운데로 맞춘다.
function CameraControl({ points, selected, padding }: { points: LatLng[]; selected: MapPlace | null; padding: MapPadding }) {
  const map = useMap();
  const { top, right, bottom, left } = padding;

  useEffect(() => {
    if (!map || (!selected && points.length === 0)) return;
    const pad = { top, right, bottom, left };
    // panTo는 여백을 받지 않는다. 고른 핀 둘레 약 300m 상자를 여백과 함께 맞춰 확대 15~16 정도로 옮긴다.
    const targets = selected
      ? [
          { lat: selected.lat - 0.003, lng: selected.lng - 0.003 },
          { lat: selected.lat + 0.003, lng: selected.lng + 0.003 },
        ]
      : points;
    const bounds = new google.maps.LatLngBounds();
    targets.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, pad);
    if (!selected && points.length === 1) map.setZoom(15);
  }, [map, points, selected, top, right, bottom, left]);

  return null;
}
