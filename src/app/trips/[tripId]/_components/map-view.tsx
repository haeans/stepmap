"use client";

import { useMemo, useState } from "react";
import { formatTime, ITEM_KIND_LABELS } from "@/lib/items/types";
import { dayColor, formatDistance, type MapPlace } from "@/lib/map/places";
import type { RouteLeg, RouteMode } from "@/lib/map/routes";
import { RouteMap } from "./route-map";

const MODE_LABELS: Record<RouteMode, string> = { drive: "자동차", transit: "대중교통", straight: "직선" };

type Props = {
  places: MapPlace[];
  routes: Record<number, RouteLeg[]>;
  days: number[];
  missing: number;
  initialId: string | null;
};

// 2화면(지도). 왼쪽 장소 목록, 오른쪽 지도, 아래쪽 일차 탭과 장소 카드 (02-FRONTEND.md 3-3)
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
    <section aria-label="지도" className="flex flex-col gap-3">
      <div className="grid gap-3 md:grid-cols-[18rem_1fr]">
        <ol className="order-2 flex max-h-[28rem] flex-col gap-3 overflow-y-auto rounded-lg border border-zinc-200 p-3 md:order-1 dark:border-zinc-800">
          {shownDays.map((d) => {
            const dayPlaces = places.filter((p) => p.day === d);
            return (
              <li key={d} className="flex flex-col gap-1">
                <p className="text-sm font-semibold" style={{ color: dayColor(d) }}>
                  DAY {d}
                </p>
                {dayPlaces.length === 0 && <p className="text-xs text-zinc-500">지도에 올릴 장소가 없습니다.</p>}
                {dayPlaces.map((p, i) => {
                  const leg = i > 0 ? routes[d]?.[i - 1] : undefined;
                  return (
                    <div key={p.id} className="flex flex-col gap-1">
                      {leg && (
                        <p className="pl-8 text-xs text-zinc-500">
                          ↓ {formatDistance(leg.meters)} · {MODE_LABELS[leg.mode]}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        aria-current={p.id === selectedId ? "true" : undefined}
                        className={`flex items-start gap-2 rounded-md p-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 ${p.id === selectedId ? "bg-zinc-100 dark:bg-zinc-900" : ""}`}
                      >
                        <span
                          className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ background: dayColor(p.day) }}
                        >
                          {p.order}
                        </span>
                        <span className="min-w-0">
                          <span className="block break-words font-medium">{p.name}</span>
                          <span className="block truncate text-xs text-zinc-500">
                            {[ITEM_KIND_LABELS[p.kind], p.address].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </button>
                    </div>
                  );
                })}
              </li>
            );
          })}
          {missing > 0 && <li className="text-xs text-amber-600">위치를 찾지 못한 장소 {missing}개는 지도에 없습니다.</li>}
        </ol>
        <div className="order-1 h-[22rem] overflow-hidden rounded-lg border border-zinc-200 md:order-2 md:h-[28rem] dark:border-zinc-800">
          <RouteMap places={visible} routes={routes} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </div>

      <div role="tablist" aria-label="일차" className="flex gap-1 overflow-x-auto text-sm">
        {(["all", ...days] as const).map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={day === d}
            onClick={() => chooseDay(d)}
            className={`shrink-0 rounded-full border px-3 py-1 ${day === d ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "border-zinc-300 dark:border-zinc-700"}`}
          >
            {d === "all" ? "전체" : `DAY ${d}`}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <button type="button" onClick={() => step(-1)} disabled={visible.length === 0} aria-label="이전 장소" className="rounded px-2 py-1 hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-900">
          ←
        </button>
        <div className="min-w-0 flex-1 text-sm" aria-live="polite">
          {selected ? (
            <>
              <p className="font-medium break-words">
                <span style={{ color: dayColor(selected.day) }}>
                  DAY {selected.day} · {selected.order}.
                </span>{" "}
                {selected.name}
              </p>
              <p className="text-xs text-zinc-500 break-words">
                {[ITEM_KIND_LABELS[selected.kind], formatTime(selected.time), selected.address].filter(Boolean).join(" · ")}
              </p>
            </>
          ) : (
            <p className="text-zinc-500">{visible.length ? "장소를 누르거나 화살표로 넘겨 보세요." : "지도에 올릴 장소가 없습니다."}</p>
          )}
        </div>
        <button type="button" onClick={() => step(1)} disabled={visible.length === 0} aria-label="다음 장소" className="rounded px-2 py-1 hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-900">
          →
        </button>
      </div>
    </section>
  );
}
