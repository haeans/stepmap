"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { formatTime, ITEM_KIND_LABELS } from "@/lib/items/types";
import { dayColor, formatDistance, type MapPlace } from "@/lib/map/places";
import type { RouteLeg, RouteMode } from "@/lib/map/routes";
import { RouteMap } from "./route-map";
import { Segmented } from "./segmented";

const MODE_LABELS: Record<RouteMode, string> = { drive: "자동차", transit: "대중교통", straight: "직선" };

type Props = {
  places: MapPlace[];
  routes: Record<number, RouteLeg[]>;
  days: number[];
  missing: number;
  initialId: string | null;
};

// 2화면(지도). 왼쪽 장소 목록, 오른쪽 지도, 아래쪽 일차 탭과 장소 카드 (02-FRONTEND.md 3-3)
// F11: 매거진처럼 큰 제목·둥근 카드·알약 버튼으로 꾸민다. 바탕색은 밝은 그대로.
export function MapView({ places, routes, days, missing, initialId }: Props) {
  const initial = places.find((p) => p.id === initialId) ?? null;
  const [day, setDay] = useState<number | "all">(initial?.day ?? "all");
  const [selectedId, setSelectedId] = useState<string | null>(initial?.id ?? null);

  const visible = useMemo(() => (day === "all" ? places : places.filter((p) => p.day === day)), [places, day]);
  const selectedIndex = visible.findIndex((p) => p.id === selectedId);
  const selected = selectedIndex >= 0 ? visible[selectedIndex] : null;

  function chooseDay(next: number | "all") {
    setDay(next);
    setSelectedId(null);
  }

  function step(delta: number) {
    if (visible.length === 0) return;
    const next = selectedIndex < 0 ? 0 : (selectedIndex + delta + visible.length) % visible.length;
    setSelectedId(visible[next].id);
  }

  const shownDays = day === "all" ? days : [day];

  return (
    <section aria-label="지도" className="flex flex-col gap-5">
      {/* 매거진처럼 큰 제목 (F11). 바탕색은 따르지 않는다. */}
      <div className="flex items-center gap-4">
        <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-transparent to-zinc-300 dark:to-zinc-700" />
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">ROUTE</h2>
        <span aria-hidden className="h-px flex-1 bg-gradient-to-l from-transparent to-zinc-300 dark:to-zinc-700" />
      </div>

      <div className="grid gap-4 md:grid-cols-[20rem_1fr]">
        <ol className="order-2 flex max-h-[32rem] flex-col gap-6 overflow-y-auto rounded-3xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur md:order-1 dark:border-zinc-800 dark:bg-zinc-950/80">
          {shownDays.map((d) => {
            const dayPlaces = places.filter((p) => p.day === d);
            return (
              <li key={d} className="flex flex-col gap-1.5">
                <div className="flex items-baseline gap-2 px-1">
                  <p className="text-2xl font-bold tracking-tight" style={{ color: dayColor(d) }}>
                    DAY {d}
                  </p>
                  <span className="text-xs text-zinc-500">장소 {dayPlaces.length}곳</span>
                </div>
                {dayPlaces.length === 0 && <p className="px-1 text-xs text-zinc-500">지도에 올릴 장소가 없습니다.</p>}
                {dayPlaces.map((p, i) => {
                  const leg = i > 0 ? routes[d]?.[i - 1] : undefined;
                  const active = p.id === selectedId;
                  return (
                    <div key={p.id} className="flex flex-col gap-1.5">
                      {leg && (
                        <p className="ml-[1.35rem] flex items-center gap-2 border-l-2 border-dashed border-zinc-200 py-1 pl-4 text-[11px] text-zinc-500 dark:border-zinc-800">
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-900">
                            {formatDistance(leg.meters)} · {MODE_LABELS[leg.mode]}
                          </span>
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.id)}
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
        <div className="order-1 h-[22rem] overflow-hidden rounded-3xl shadow-xl ring-1 ring-black/5 md:order-2 md:h-[32rem] dark:ring-white/10">
          <RouteMap places={visible} routes={routes} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </div>

      {/* 일차 고르기: 미끄러지는 알약 버튼. 일차가 많으면 옆으로 넘긴다. */}
      <div className="-mx-1 overflow-x-auto px-1 py-1">
        <div className="w-max">
          <Segmented
            label="일차"
            value={String(day)}
            options={(["all", ...days] as const).map((d) => ({ value: String(d), label: d === "all" ? "전체" : `DAY ${d}` }))}
            onChange={(v) => chooseDay(v === "all" ? "all" : Number(v))}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-3xl border border-zinc-200 bg-white p-4 shadow-lg shadow-black/5 dark:border-zinc-800 dark:bg-zinc-950">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={visible.length === 0}
          aria-label="이전 장소"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 transition hover:-translate-x-0.5 hover:bg-zinc-100 active:scale-90 disabled:opacity-40 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          ←
        </button>
        <div key={selected?.id ?? "none"} className="min-w-0 flex-1 transition duration-300 starting:translate-y-1 starting:opacity-0" aria-live="polite">
          {selected ? (
            <>
              <p className="text-xs font-semibold tracking-wide" style={{ color: dayColor(selected.day) }}>
                DAY {selected.day} · {selected.order}번째
              </p>
              <p className="text-xl leading-tight font-bold tracking-tight break-words">{selected.name}</p>
              <p className="mt-0.5 text-xs break-words text-zinc-500">
                {[ITEM_KIND_LABELS[selected.kind], formatTime(selected.time), selected.address].filter(Boolean).join(" · ")}
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">{visible.length ? "장소를 누르거나 화살표로 넘겨 보세요." : "지도에 올릴 장소가 없습니다."}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={visible.length === 0}
          aria-label="다음 장소"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:translate-x-0.5 hover:bg-zinc-700 active:scale-90 disabled:opacity-40 dark:bg-white dark:text-zinc-900"
        >
          →
        </button>
      </div>
    </section>
  );
}
