"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { formatTime, ITEM_KIND_LABELS } from "@/lib/items/types";
import { nearestPlaceId } from "@/lib/map/nearest";
import { dayColor, type LatLng, type MapPlace } from "@/lib/map/places";
import type { DayPath } from "@/lib/map/routes";
import { MapMenu } from "./map-menu";
import { RouteMap, type MapPadding } from "./route-map";
import { Segmented } from "./segmented";
import { ViewSwitch } from "./view-switch";

type Props = {
  places: MapPlace[];
  routes: Record<number, DayPath>;
  days: number[];
  missing: number;
  initialId: string | null;
  trip: { id: string; startDate: string | null; endDate: string | null };
  email: string;
  readOnly: boolean;
};

const GAP = 24; // 패널과 핀 사이 여유(px)
const SWIPE = 40; // 모바일 손잡이를 이만큼(px) 넘게 밀면 펼치거나 접는다 (결정 11)

// 2화면(지도). 머리글 없이 화면 전체가 지도이고, 일정과 버튼은 패널에 둔다: PC는 왼쪽, 모바일은 아래 시트 (F14)
export function MapView({ places, routes, days, missing, initialId, trip, email, readOnly }: Props) {
  const initial = places.find((p) => p.id === initialId) ?? null;
  const [day, setDay] = useState<number | "all">(initial?.day ?? "all");
  const [selectedId, setSelectedId] = useState<string | null>(initial?.id ?? null);
  const [expanded, setExpanded] = useState(false); // 모바일 시트에서 목록을 펼쳤는가
  const [collapsed, setCollapsed] = useState(false); // PC 패널을 접었는가 (결정 10)
  const [padding, setPadding] = useState<MapPadding>({ top: GAP, right: GAP, bottom: GAP, left: GAP });
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<number | null>(null); // 손잡이를 누르기 시작한 y

  const visible = useMemo(() => (day === "all" ? places : places.filter((p) => p.day === day)), [places, day]);
  const selectedIndex = visible.findIndex((p) => p.id === selectedId);
  const selected = selectedIndex >= 0 ? visible[selectedIndex] : null;
  // 고른 일차, "전체"면 고른 장소의 일차를 강조한다 (결정 4, B23)
  const focusDay = day === "all" ? (selected?.day ?? null) : day;
  // 지도 범위: 보이는 장소와 그 일차의 거점·숙소. 멀리 떨어진 반대편 공항은 뺀다 (F15 결정 2)
  const framed = useMemo<LatLng[]>(() => {
    const shown = day === "all" ? Object.values(routes) : routes[day] ? [routes[day]] : [];
    return [...visible, ...shown.flatMap((path) => path.stops.filter((s) => s.mark && s.frame))];
  }, [visible, routes, day]);

  // 들어올 때 현재 시각에 가장 가까운 일정의 핀을 고른다. 기기 시각을 써야 해서 화면이 뜬 뒤 한 번 계산한다. (결정 3)
  const startRef = useRef({ places, trip, initialId });
  useEffect(() => {
    const start = startRef.current;
    if (start.initialId) return;
    const id = nearestPlaceId(start.places, start.trip, new Date());
    const place = start.places.find((p) => p.id === id);
    if (!place) return;
    setDay(place.day);
    setSelectedId(place.id);
  }, []);

  // 패널에 가린 만큼 지도 여백을 둔다. PC는 왼쪽(접으면 여유만), 모바일은 아래. 위는 로고, 오른쪽은 확대 버튼 자리.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const wide = window.matchMedia("(min-width: 768px)");
    const measure = () => {
      if (!wide.matches) setCollapsed(false); // 접기는 PC에만 있다
      setPadding(
        wide.matches
          ? { top: GAP + 40, right: GAP + 48, bottom: GAP, left: collapsed ? GAP + 32 : panel.offsetLeft + panel.offsetWidth + GAP }
          : { top: GAP + 48, right: GAP, bottom: panel.offsetHeight + GAP, left: GAP },
      );
    };
    const observer = new ResizeObserver(measure); // 처음 관찰할 때도 한 번 부른다
    observer.observe(panel);
    wide.addEventListener("change", measure);
    return () => {
      observer.disconnect();
      wide.removeEventListener("change", measure);
    };
  }, [collapsed]);

  // 모바일 손잡이: 위·아래로 밀면 펼치고 접고, 그냥 누르면 바꾼다. 키보드(Enter·Space)는 onClick으로 받는다.
  function handleDown(e: PointerEvent<HTMLButtonElement>) {
    dragRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleUp(e: PointerEvent<HTMLButtonElement>) {
    if (dragRef.current === null) return;
    const dy = e.clientY - dragRef.current;
    dragRef.current = null;
    setExpanded((v) => (Math.abs(dy) > SWIPE ? dy < 0 : !v));
  }

  function chooseDay(next: number | "all") {
    setDay(next);
    setSelectedId(null);
  }

  // 목록에서 고르기: 모바일 시트는 펼친 채로 두고 지도만 옮긴다 (결정 11)
  function choosePlace(id: string) {
    setSelectedId(id);
  }

  // 지도에서 핀 고르기: 모바일은 시트를 펼쳐 고른 목록 줄을 보인다 (F14 결정 11).
  // PC는 접힌 패널을 펼친다 (F15 결정 7)
  function choosePin(id: string) {
    setSelectedId(id);
    if (window.matchMedia("(min-width: 768px)").matches) setCollapsed(false);
    else setExpanded(true);
  }

  // 고른 장소의 목록 줄이 보이게 목록을 스크롤한다. 목록이 숨어 있으면(모바일 접힘) 하지 않는다.
  // 이미 고른 핀을 접힌 채로 다시 눌러 펼칠 때도 스크롤하도록 collapsed를 본다.
  useEffect(() => {
    if (!selectedId) return;
    const row = panelRef.current?.querySelector<HTMLElement>(`[data-place="${CSS.escape(selectedId)}"]`);
    if (row?.offsetParent) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId, expanded, collapsed]);

  function step(delta: number) {
    if (visible.length === 0) return;
    const next = selectedIndex < 0 ? 0 : (selectedIndex + delta + visible.length) % visible.length;
    setSelectedId(visible[next].id);
  }

  const shownDays = day === "all" ? days : [day];

  return (
    // 지도 탭에는 머리글이 없어 화면 전체를 덮는다 (결정 6)
    <section aria-label="지도" className="fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0">
        <RouteMap
          places={places}
          framed={framed}
          routes={routes}
          focusDay={focusDay}
          selectedId={selectedId}
          onSelect={choosePin}
          padding={padding}
        />
      </div>

      <MapMenu tripId={trip.id} email={email} readOnly={readOnly} />

      {/* PC에서 패널을 접으면 왼쪽 끝에 다시 펴기 탭만 남는다. 전환 버튼은 패널을 펴야 보인다 (결정 7·10) */}
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="패널 펴기"
          className="absolute top-1/2 left-0 z-10 hidden h-14 w-7 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-zinc-200 bg-white/90 text-lg shadow-lg backdrop-blur-xl transition hover:w-8 md:flex dark:border-zinc-800 dark:bg-zinc-950/90"
        >
          ›
        </button>
      )}

      <div
        ref={panelRef}
        inert={collapsed}
        className={`absolute inset-x-0 bottom-0 z-10 flex max-h-[75%] flex-col rounded-t-3xl border-t border-zinc-200 bg-white/90 shadow-2xl shadow-black/20 backdrop-blur-xl transition-transform duration-300 md:inset-y-4 md:right-auto md:left-4 md:max-h-none md:w-[22rem] md:rounded-3xl md:border dark:border-zinc-800 dark:bg-zinc-950/90 ${collapsed ? "md:-translate-x-[calc(100%+2rem)]" : ""}`}
      >
        {/* PC 여닫이 탭: 패널 오른쪽 가장자리 세로 가운데 (결정 10) */}
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="패널 접기"
          className="absolute top-1/2 left-full hidden h-14 w-6 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-zinc-200 bg-white/90 text-lg shadow-md backdrop-blur-xl transition hover:w-7 md:flex dark:border-zinc-800 dark:bg-zinc-950/90"
        >
          ‹
        </button>

        {/* 모바일 손잡이: 누르거나 위·아래로 민다. 누르는 곳 128×44px (결정 2·11) */}
        <button
          type="button"
          onPointerDown={handleDown}
          onPointerUp={handleUp}
          onPointerCancel={() => (dragRef.current = null)}
          onClick={(e) => e.detail === 0 && setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? "목록 접기" : "목록 펼치기"}
          className="mx-auto flex h-11 w-32 shrink-0 touch-none items-center justify-center md:hidden"
        >
          <span aria-hidden className="h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </button>

        {/* 모바일은 시트를 펼쳤을 때만 제목 줄·전환 버튼·일차 고르기가 보인다. 접으면 손잡이만 남는다 (결정 7·11) */}
        <div className={`flex flex-col gap-3 px-4 pt-0 pb-3 md:pt-3 ${expanded ? "" : "max-md:hidden"}`}>
          {/* 맨 윗줄 오른쪽에 전환 버튼 (결정 7) */}
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">ROUTE</h2>
            <span className="text-xs text-zinc-500">장소 {visible.length}곳</span>
            <div className="ml-auto">
              <ViewSwitch tripId={trip.id} current="map" />
            </div>
          </div>
          {/* 일차 고르기: 미끄러지는 알약 버튼. 일차가 많으면 옆으로 넘긴다. */}
          <div className="-mx-1 overflow-x-auto px-1 py-1">
            <div className="w-max">
              <Segmented
                label="일차"
                size="sm"
                value={String(day)}
                options={(["all", ...days] as const).map((d) => ({ value: String(d), label: d === "all" ? "전체" : `DAY ${d}` }))}
                onChange={(v) => chooseDay(v === "all" ? "all" : Number(v))}
              />
            </div>
          </div>
        </div>

        {/* 모바일 펼침은 목록만 한 줄로 쭉 (결정 11). 지도 탭에는 "+ 입력" 버튼이 없다 (F25) */}
        <ol
          className={`${expanded ? "flex" : "hidden"} min-h-0 flex-1 flex-col gap-6 overflow-y-auto border-t border-zinc-200 px-3 py-4 md:flex dark:border-zinc-800`}
        >
          {shownDays.map((d) => {
            const dayPlaces = places.filter((p) => p.day === d);
            return (
              <li key={d} className="flex flex-col gap-1.5">
                <div className="flex items-baseline gap-2 px-1">
                  <p className="text-xl font-bold tracking-tight" style={{ color: dayColor(d) }}>
                    DAY {d}
                  </p>
                  <span className="text-xs text-zinc-500">장소 {dayPlaces.length}곳</span>
                </div>
                {dayPlaces.length === 0 && <p className="px-1 text-xs text-zinc-500">지도에 올릴 장소가 없습니다.</p>}
                {dayPlaces.map((p) => {
                  const active = p.id === selectedId;
                  return (
                    <div key={p.id} data-place={p.id} className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => choosePlace(p.id)}
                        aria-current={active ? "true" : undefined}
                        className={`group flex items-center gap-3 rounded-2xl p-2 text-left transition duration-200 hover:translate-x-0.5 hover:bg-zinc-100 active:scale-[0.98] dark:hover:bg-zinc-900 ${active ? "bg-zinc-100 shadow-sm ring-2 dark:bg-zinc-900" : ""}`}
                        style={active ? ({ "--tw-ring-color": dayColor(p.day) } as CSSProperties) : undefined}
                      >
                        <span
                          className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-md transition group-hover:scale-110"
                          style={{ background: dayColor(p.day) }}
                        >
                          {p.order}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold break-words">{p.name}</span>
                          <span className="block truncate text-xs text-zinc-500">
                            {[ITEM_KIND_LABELS[p.kind], formatTime(p.time), p.address].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </button>
                    </div>
                  );
                })}
              </li>
            );
          })}
          {missing > 0 && <li className="rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">위치를 찾지 못한 장소 {missing}개는 지도에 없습니다.</li>}
        </ol>

        {/* 이전/다음. PC에만 있다 (결정 11). 핀 세부 카드는 F25에서 뺐다 */}
        <div className="hidden items-center gap-3 border-t border-zinc-200 p-4 md:flex dark:border-zinc-800">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={visible.length === 0}
            aria-label="이전 장소"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 transition hover:-translate-x-0.5 hover:bg-zinc-100 active:scale-90 disabled:opacity-40 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            ←
          </button>
          <p className="min-w-0 flex-1 text-center text-sm text-zinc-500">{visible.length ? "핀이나 장소를 누르거나 화살표로 넘겨 보세요." : "지도에 올릴 장소가 없습니다."}</p>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={visible.length === 0}
            aria-label="다음 장소"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:translate-x-0.5 hover:bg-zinc-700 active:scale-90 disabled:opacity-40 dark:bg-white dark:text-zinc-900"
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}
