"use client";

import { AdvancedMarker, APIProvider, ControlPosition, Map, Pin, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect } from "react";
import { dayColor, type LatLng, type MapPlace } from "@/lib/map/places";
import type { DayPath } from "@/lib/map/routes";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

// 패널에 가린 만큼 지도 가장자리에서 띄울 거리(px)
export type MapPadding = { top: number; right: number; bottom: number; left: number };

type Props = {
  places: MapPlace[]; // 모든 장소. 강조하지 않는 일차는 흐리게 그린다.
  framed: LatLng[]; // 지도 범위를 맞출 점 (고른 일차 또는 전체의 장소와 거점, F15 결정 2)
  routes: Record<number, DayPath>;
  focusDay: number | null; // 강조할 일차 (F14 결정 4)
  selectedId: string | null;
  onSelect: (id: string) => void;
  padding: MapPadding;
};

// 2화면의 구글맵. 일차별 색 번호 핀과 경로 선을 그린다. (R-06)
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
        // 오른쪽 위는 로고 메뉴, 오른쪽 아래는 "+ 입력" 버튼과 모바일 시트 자리다 (F14 결정 9)
        zoomControlOptions={{ position: ControlPosition.RIGHT_CENTER }}
        className="h-full w-full"
      >
        {props.places.map((p) => {
          const selected = p.id === props.selectedId;
          const dimmed = props.focusDay !== null && p.day !== props.focusDay;
          return (
            <AdvancedMarker
              key={p.id}
              position={p}
              title={`DAY ${p.day} · ${p.order}. ${p.name}`}
              onClick={() => props.onSelect(p.id)}
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
          );
        })}
        {Object.entries(props.routes).flatMap(([key, path]) => {
          const day = Number(key);
          const dimmed = props.focusDay !== null && day !== props.focusDay;
          return path.stops.map((s, i) =>
            s.mark === "airport" ? (
              // 공항 거점에만 ✈ 표시. 역·터미널·전날 숙소는 선의 점으로만 쓰고, 누르는 기능은 없다 (F15 결정 5)
              <AdvancedMarker key={`${day}-${i}`} position={s} title={s.name} zIndex={dimmed ? 0 : 50} style={{ opacity: dimmed ? 0.35 : 1, transition: "opacity 200ms", pointerEvents: "none" }}>
                <span
                  aria-hidden
                  className="flex size-6 items-center justify-center rounded-full border-2 bg-white text-xs shadow-md"
                  style={{ borderColor: dayColor(day) }}
                >
                  ✈
                </span>
              </AdvancedMarker>
            ) : null,
          );
        })}
        <CameraControl points={props.framed} selected={props.places.find((p) => p.id === props.selectedId) ?? null} padding={props.padding} />
      </Map>
    </APIProvider>
  );
}

// 경로 선. 실제 경로는 실선, 경로를 못 찾은 구간은 대시, 비행기·교통 구간은 둥근 점선이다. (B20, F15 결정 6)
// 여러 일차를 함께 보면 같은 길에서 선이 겹친다. 앞 일차일수록 굵게 아래에, 뒤 일차일수록 가늘게 위에 그려
// 겹친 구간에서도 두 색이 다 보이게 한다. 강조한 일차는 맨 위에 진하게, 나머지는 흐리게 그린다. (B23, F14 결정 4)
function RouteLines({ routes, focusDay }: Pick<Props, "routes" | "focusDay">) {
  const map = useMap();
  const geometry = useMapsLibrary("geometry");
  const maps = useMapsLibrary("maps");

  useEffect(() => {
    if (!map || !geometry || !maps) return;
    const lines: google.maps.Polyline[] = [];
    const days = Object.keys(routes)
      .map(Number)
      .filter((day) => routes[day].legs.length > 0)
      .sort((x, y) => x - y);

    days.forEach((day, rank) => {
      const { stops, legs } = routes[day];
      const color = dayColor(day);
      const weight = Math.min(4 + 3 * (days.length - 1 - rank), 16);
      const dimmed = focusDay !== null && focusDay !== day;
      const zIndex = day === focusDay ? 1000 : rank;
      const opacity = dimmed ? 0.25 : 0.9;

      legs.forEach((leg, i) => {
        const path = [stops[i], stops[i + 1]];
        if (leg.polyline) {
          lines.push(
            new maps.Polyline({ map, path: geometry.encoding.decodePath(leg.polyline), strokeColor: color, strokeOpacity: opacity, strokeWeight: weight, zIndex }),
          );
        } else if (leg.mode === "flight" || leg.mode === "transport") {
          const dot = { path: google.maps.SymbolPath.CIRCLE, fillColor: color, fillOpacity: opacity, strokeOpacity: 0, scale: Math.max(weight / 2, 2.5) };
          lines.push(new maps.Polyline({ map, path, strokeOpacity: 0, zIndex, icons: [{ icon: dot, offset: "0", repeat: `${Math.max(weight * 3, 14)}px` }] }));
        } else {
          lines.push(
            new maps.Polyline({
              map,
              path,
              strokeOpacity: 0,
              zIndex,
              icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: opacity, strokeColor: color, scale: Math.max(weight - 1, 3) }, offset: "0", repeat: "12px" }],
            }),
          );
        }
      });
    });
    return () => lines.forEach((l) => l.setMap(null));
  }, [map, geometry, maps, routes, focusDay]);

  return null;
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
