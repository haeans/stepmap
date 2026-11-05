"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Logo } from "@/app/_components/app-header";
import { ProfileMenu } from "@/app/_components/profile-menu";
import { formatTime, ITEM_KIND_LABELS } from "@/lib/items/types";
import { nearestPlaceId } from "@/lib/map/nearest";
import { dayColor, hubLabel, type MapPlace } from "@/lib/map/places";
import { RouteMap, type MapPadding } from "./route-map";
import { Segmented } from "./segmented";
import { ViewSwitch } from "./view-switch";

type Props = {
  places: MapPlace[];
  days: number[];
  initialId: string | null;
  trip: { id: string; startDate: string | null; endDate: string | null };
  email: string;
  readOnly: boolean;
};

const GAP = 24; // 패널과 핀 사이 여유(px)
const SWIPE = 40; // 모바일 손잡이를 이만큼(px) 넘게 밀면 펼치거나 접는다 (결정 11)

// 2화면(지도). 머리글 없이 화면 전체가 지도이고, 일정과 버튼은 패널에 둔다: PC는 왼쪽, 모바일은 아래 시트 (F14)
export function MapView({ places, days, initialId, trip, email, readOnly }: Props) {
  // ?item=은 일정 항목 id다. 같은 숙소 핀이 둘이면 앞 일차 핀을 고른다 (F25)
  const initial = places.find((p) => p.itemId === initialId) ?? null;
  const [day, setDay] = useState<number | "all">(initial?.day ?? "all");
  const [selectedId, setSelectedId] = useState<string | null>(initial?.id ?? null);
  // 핀 위 팝업 (F25, F32). 핀·목록 줄을 누르거나 ?item= 링크로 들어오면 연다. 일차 바꾸기·자동 고르기로는 열지 않는다.
  const [popupOpen, setPopupOpen] = useState(initial !== null);
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
  // 지도 범위: 보이는 핀. 첫날·마지막 날의 거점·숙소도 핀이라 따로 더하지 않는다 (F25)
  const framed = visible;

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

  // 패널에 가린 만큼 지도 여백을 둔다. PC는 왼쪽(접으면 여유만), 모바일은 아래. 위는 프로필 버튼, 오른쪽은 확대 버튼 자리.
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
    setPopupOpen(false);
  }

  // 목록에서 고르기: 모바일 시트는 펼친 채로 두고 지도를 옮기며 핀 위 팝업을 연다 (F32, F25 결정 5를 고침).
  // 시트를 펼친 채 열면 위에 남은 지도에서 팝업이 잘릴 수 있어 모바일 시트 높이(F32 ⑨)로 푼다.
  function choosePlace(id: string) {
    setSelectedId(id);
    setPopupOpen(true);
  }

  // 지도에서 핀 고르기: 핀 위 팝업을 연다. 모바일 시트와 PC 패널은 그대로 둔다 (F25).
  // 전에는 패널 세부를 보이려고 펼쳤지만(F14 결정 11, F15 결정 7) 세부를 없앴고, 펼친 모바일 시트는 팝업을 가린다.
  function choosePin(id: string) {
    setSelectedId(id);
    setPopupOpen(true);
  }

  // 고른 장소의 목록 줄이 보이게 목록을 스크롤한다. 목록이 숨어 있으면(모바일 접힘) 하지 않는다.
  // 핀을 고른 뒤 접힌 시트·패널을 펼칠 때도 스크롤하도록 expanded·collapsed를 본다.
  useEffect(() => {
    if (!selectedId) return;
    const row = panelRef.current?.querySelector<HTMLElement>(`[data-place="${CSS.escape(selectedId)}"]`);
    if (row?.offsetParent) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId, expanded, collapsed]);

  const shownDays = day === "all" ? days : [day];

  return (
    // 지도 탭에는 머리글이 없어 화면 전체를 덮는다 (결정 6)
    <section aria-label="지도" className="fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0">
        <RouteMap
          places={places}
          framed={framed}
          focusDay={focusDay}
          selectedId={selectedId}
          onSelect={choosePin}
          popupId={popupOpen ? (selected?.id ?? null) : null}
          onClosePopup={() => setPopupOpen(false)}
          padding={padding}
        />
      </div>

      {/* 일정/지도 전환과 프로필: 일정 화면 상단바와 같은 자리(오른쪽 위 16px). 패널·시트를 접어도 보인다 (C9 F23) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* 반투명 바탕 + 아주 약한 흐림: 지도가 비쳐 보이면서도 글자는 읽히게.
            Segmented 자체의 흐림(backdrop-blur-md)이 겹치면 불투명해 보여서 끈다. */}
        <div className="rounded-full bg-white/35 shadow-md shadow-black/10 backdrop-blur-[3px] dark:bg-zinc-950/40 [&>div]:backdrop-blur-none">
          <ViewSwitch tripId={trip.id} current="map" />
        </div>
        <ProfileMenu email={email} trip={{ id: trip.id, readOnly }} />
      </div>

      {/* PC에서 패널을 접으면 왼쪽 끝에 다시 펴기 탭만 남는다 (결정 10) */}
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

      {/* 모바일 시트는 화면 절반까지만(max-h-[50%], F32 ⑨): 목록 줄을 눌러 연 팝업이 시트에 가리지 않게 한다. PC 패널은 높이 제한 없음 */}
      <div
        ref={panelRef}
        inert={collapsed}
        className={`absolute inset-x-0 bottom-0 z-10 flex max-h-[50%] flex-col rounded-t-3xl border-t border-zinc-200 bg-white/90 shadow-2xl shadow-black/20 backdrop-blur-xl transition-transform duration-300 md:inset-y-4 md:right-auto md:left-4 md:max-h-none md:w-[22rem] md:rounded-3xl md:border dark:border-zinc-800 dark:bg-zinc-950/90 ${collapsed ? "md:-translate-x-[calc(100%+2rem)]" : ""}`}
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

        {/* 모바일은 시트를 펼쳤을 때만 제목 줄·일차 고르기가 보인다. 접으면 손잡이만 남는다 (결정 11) */}
        <div className={`flex flex-col gap-3 px-4 pt-0 pb-3 md:pt-3 ${expanded ? "" : "max-md:hidden"}`}>
          {/* 맨 윗줄: 로고 그림 · PINS (C9 F23) */}
          <div className="flex items-center gap-2">
            <Link href="/" aria-label="Stepmap 여행 목록" className="shrink-0">
              <Logo className="h-8" />
            </Link>
            <h2 className="text-2xl font-bold tracking-tight">PINS</h2>
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
                {dayPlaces.map((p, i) => {
                  const active = p.id === selectedId;
                  return (
                    <div key={p.id} data-place={p.id} className="relative flex flex-col gap-1.5">
                      {/* 같은 일차 안에서 번호 원 가운데끼리 잇는 세로 점선 (F32). 마지막 줄에는 없다. 원이 위에 올라 선 끝을 가린다. */}
                      {i < dayPlaces.length - 1 && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute top-1/2 left-[22px] h-[calc(100%+0.375rem)] -translate-x-1/2 border-l-2 border-dotted opacity-60"
                          style={{ borderColor: dayColor(p.day) }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => choosePlace(p.id)}
                        aria-current={active ? "true" : undefined}
                        className={`group flex items-center gap-3 rounded-2xl p-2 text-left transition duration-200 hover:translate-x-0.5 hover:bg-zinc-100 active:scale-[0.98] dark:hover:bg-zinc-900 ${active ? "bg-zinc-100 shadow-sm ring-2 dark:bg-zinc-900" : ""}`}
                        style={active ? ({ "--tw-ring-color": dayColor(p.day) } as CSSProperties) : undefined}
                      >
                        <span
                          className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-md transition group-hover:scale-110"
                          style={{ background: dayColor(p.day) }}
                        >
                          {p.order}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold break-words">{p.name}</span>
                          <span className="block truncate text-xs text-zinc-500">
                            {[p.hub ? hubLabel(p.hub) : ITEM_KIND_LABELS[p.kind], formatTime(p.time)].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </button>
                    </div>
                  );
                })}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
