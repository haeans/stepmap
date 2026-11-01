"use client";

import { AdvancedMarker, APIProvider, Map, Pin, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect } from "react";
import { dayColor, type MapPlace } from "@/lib/map/places";
import type { RouteLeg } from "@/lib/map/routes";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

type Props = {
  places: MapPlace[]; // 지금 보이는 장소
  routes: Record<number, RouteLeg[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
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
        className="h-full w-full"
      >
        {props.places.map((p) => (
          <AdvancedMarker
            key={p.id}
            position={p}
            title={`DAY ${p.day} · ${p.order}. ${p.name}`}
            onClick={() => props.onSelect(p.id)}
            zIndex={p.id === props.selectedId ? 1000 : p.order}
          >
            <Pin
              background={dayColor(p.day)}
              borderColor={p.id === props.selectedId ? "#18181b" : "#ffffff"}
              glyphColor="#ffffff"
              glyphText={String(p.order)}
              scale={p.id === props.selectedId ? 1.3 : 1}
            />
          </AdvancedMarker>
        ))}
        <RouteLines places={props.places} routes={props.routes} selectedId={props.selectedId} />
        <CameraControl places={props.places} selectedId={props.selectedId} />
      </Map>
    </APIProvider>
  );
}

// 경로 선. 실제 경로는 실선, 경로를 못 찾은 구간은 직선 점선이다. (B20)
// 여러 일차를 함께 보면 같은 길에서 선이 겹친다. 앞 일차일수록 굵게 아래에, 뒤 일차일수록 가늘게 위에 그려
// 겹친 구간에서도 두 색이 다 보이게 한다. 고른 장소의 일차는 맨 위에 진하게 그린다. (B23)
function RouteLines({ places, routes, selectedId }: Pick<Props, "places" | "routes" | "selectedId">) {
  const map = useMap();
  const geometry = useMapsLibrary("geometry");
  const maps = useMapsLibrary("maps");

  useEffect(() => {
    if (!map || !geometry || !maps) return;
    const lines: google.maps.Polyline[] = [];
    const byDay = new globalThis.Map<number, MapPlace[]>();
    for (const p of places) byDay.set(p.day, [...(byDay.get(p.day) ?? []), p]);
    const days = [...byDay.keys()].sort((x, y) => x - y);
    const focusDay = places.find((p) => p.id === selectedId)?.day ?? null;

    days.forEach((day, rank) => {
      const dayPlaces = byDay.get(day) ?? [];
      const legs = routes[day] ?? [];
      const color = dayColor(day);
      const weight = Math.min(4 + 3 * (days.length - 1 - rank), 16);
      const dimmed = focusDay !== null && focusDay !== day;
      const zIndex = day === focusDay ? 1000 : rank;
      const opacity = dimmed ? 0.45 : 0.9;

      dayPlaces.slice(0, -1).forEach((from, i) => {
        const to = dayPlaces[i + 1];
        const leg = legs[i];
        if (leg?.polyline) {
          lines.push(
            new maps.Polyline({ map, path: geometry.encoding.decodePath(leg.polyline), strokeColor: color, strokeOpacity: opacity, strokeWeight: weight, zIndex }),
          );
        } else {
          lines.push(
            new maps.Polyline({
              map,
              path: [from, to],
              strokeOpacity: 0,
              zIndex,
              icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: opacity, strokeColor: color, scale: Math.max(weight - 1, 3) }, offset: "0", repeat: "12px" }],
            }),
          );
        }
      });
    });
    return () => lines.forEach((l) => l.setMap(null));
  }, [map, geometry, maps, places, routes, selectedId]);

  return null;
}

// 고른 장소가 있으면 그 핀으로, 없으면 보이는 핀이 모두 들어오게 지도를 옮긴다. (R-07)
function CameraControl({ places, selectedId }: Pick<Props, "places" | "selectedId">) {
  const map = useMap();

  useEffect(() => {
    if (!map || places.length === 0) return;
    const selected = places.find((p) => p.id === selectedId);
    if (selected) {
      map.panTo(selected);
      if ((map.getZoom() ?? 0) < 15) map.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    places.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 48);
    if (places.length === 1) map.setZoom(15);
  }, [map, places, selectedId]);

  return null;
}
