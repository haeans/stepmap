"use client";

// 1화면 A안 "크게"의 매거진 개편 (F10). 영역 순서는 02-FRONTEND.md 3-1(맨 위 → GO → DAY 1~N → BACK)을 지킨다.
// - 대표 사진이 맨 위 배경으로 들어가고, 사진 톤에 맞춘 배경색이 페이지 아래까지 채운다.
// - DAY는 가운데 기준선을 두고 PC는 좌우 번갈아, 모바일은 기준선 왼쪽에 두고 한쪽으로 정렬한다.
// 대표 이미지(F08)가 들어오기 전에는 목적지로 색을 정한 임시 그림을 쓴다.

import { useEffect, useState, type ReactNode } from "react";
import type { GroupedItems } from "@/lib/items/group";
import type { Item } from "@/lib/items/types";
import { dayColor } from "@/lib/map/places";
import type { TripDay } from "@/lib/trips/days";
import { averageColor, hueBackground, hueFromText, placeholderCover, toneBackground } from "@/lib/trips/tone";
import { formatTripPeriod, type Trip } from "@/lib/trips/types";
import { ItemCard } from "./item-card";
import { CostList } from "./schedule-sections";

type Props = {
  trip: Trip;
  grouped: GroupedItems;
  count: number;
  dayOptions: TripDay[];
  readOnly: boolean;
  coverUrl?: string | null; // F08 머지 후 여행의 대표 이미지 주소를 넘긴다
};

const MUTED = "text-sm text-white/60";
// 사진 배경 위에 놓는 밝은 카드. 항목 카드(ItemCard)의 글자색이 그대로 읽힌다.
const PANEL = "rounded-2xl bg-white/95 text-zinc-900 shadow-lg shadow-black/20 dark:bg-zinc-900/90 dark:text-zinc-100";

// 대표 사진의 평균색으로 배경색을 만든다. 다른 도메인 사진을 읽지 못하면(CORS) null로 두고 기본색을 쓴다.
function usePhotoTone(url: string | null): string | null {
  const [tone, setTone] = useState<{ url: string; color: string } | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        const size = 24;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const avg = averageColor(ctx.getImageData(0, 0, size, size).data);
        if (avg) setTone({ url, color: toneBackground(avg) });
      } catch {
        // 읽을 수 없는 사진이면 기본 배경색을 그대로 쓴다.
      }
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);

  return tone && tone.url === url ? tone.color : null;
}

// 배경을 화면 끝까지 넓히면(100vw) 세로 스크롤바 폭만큼 가로 스크롤이 생긴다. 이 화면에 있는 동안만 가로 넘침을 자른다.
function useClipOverflowX() {
  useEffect(() => {
    const html = document.documentElement;
    const previous = html.style.overflowX;
    html.style.overflowX = "clip";
    return () => {
      html.style.overflowX = previous;
    };
  }, []);
}

function Heading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span aria-hidden className="h-px flex-1 bg-white/30" />
      <h3 id={id} className="text-3xl font-bold tracking-tight md:text-5xl">
        {children}
      </h3>
      <span aria-hidden className="h-px flex-1 bg-white/30" />
    </div>
  );
}

function Cards({ items, empty, days, readOnly }: { items: Item[]; empty: string; days: TripDay[]; readOnly: boolean }) {
  if (items.length === 0) return <p className={MUTED}>{empty}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id} className={PANEL}>
          <ItemCard key={item.updated_at} item={item} days={days} readOnly={readOnly} />
        </li>
      ))}
    </ul>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-24 flex-col gap-0.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-md">
      <span className="text-xs text-white/60">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function MagazineView({ trip, grouped, count, dayOptions, readOnly, coverUrl = null }: Props) {
  const hue = hueFromText(trip.destination || trip.title);
  const photoTone = usePhotoTone(coverUrl);
  const background = photoTone ?? hueBackground(hue);
  const image = coverUrl ?? placeholderCover(hue);
  useClipOverflowX();

  return (
    <div
      className="relative left-1/2 -mb-28 flex min-h-svh w-screen -translate-x-1/2 flex-col text-white transition-colors duration-700"
      style={{ backgroundColor: background }}
    >
      {/* 맨 위: 대표 사진 배경, 여행 제목, 기간, 기록 수 */}
      <section aria-label="여행 개요" className="relative isolate flex min-h-[60svh] flex-col justify-end overflow-hidden md:min-h-[72svh]">
        <div
          role="img"
          aria-label={coverUrl ? "대표 이미지" : "대표 이미지 (임시)"}
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url("${image}")` }}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 35%, ${background} 100%)` }}
        />
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-10">
          {trip.destination && <p className="text-sm tracking-[0.3em] text-white/80 uppercase">{trip.destination}</p>}
          <h2 className="text-5xl font-bold tracking-tight break-keep text-white/90 drop-shadow-lg md:text-8xl">{trip.title}</h2>
          <div className="flex flex-wrap gap-2">
            <Chip label="기간" value={formatTripPeriod(trip)} />
            <Chip label="일정" value={`${grouped.days.length}일`} />
            <Chip label="함께" value={`${trip.companions}명`} />
            <Chip label="기록" value={`${count}개`} />
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-20 px-6 pt-10 pb-32">
        {/* GO: 출발과 머물 곳 */}
        <section aria-labelledby="m-go" className="flex flex-col gap-6">
          <Heading id="m-go">GO</Heading>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-3">
              <p className="font-medium text-white/80">교통</p>
              <Cards items={grouped.transport} empty="아직 교통 항목이 없습니다." days={dayOptions} readOnly={readOnly} />
            </div>
            <div className="flex flex-col gap-3">
              <p className="font-medium text-white/80">숙소</p>
              <Cards items={grouped.lodging} empty="아직 숙소 항목이 없습니다." days={dayOptions} readOnly={readOnly} />
            </div>
          </div>
        </section>

        {/* DAY 1~N: 기준선 */}
        <section aria-labelledby="m-days" className="flex flex-col gap-10">
          <Heading id="m-days">DAY BY DAY</Heading>
          <ol className="relative">
            <span aria-hidden className="absolute top-2 bottom-0 left-3 w-px bg-white/30 md:left-1/2" />
            {grouped.days.map(({ day, places }, index) => {
              // PC: 짝수 번째는 내용이 왼쪽·제목이 오른쪽, 홀수 번째는 반대
              const contentLeft = index % 2 === 0;
              return (
                <li key={day.day} aria-label={`${day.day}일차`} className="relative grid gap-4 pb-14 pl-10 md:grid-cols-2 md:gap-x-16 md:pl-0">
                  <span
                    aria-hidden
                    className="absolute top-2 left-3 size-3.5 -translate-x-1/2 rounded-full ring-4 ring-white/20 md:left-1/2"
                    style={{ backgroundColor: dayColor(day.day) }}
                  />
                  <div className={`md:row-start-1 ${contentLeft ? "md:col-start-2" : "md:col-start-1 md:text-right"}`}>
                    {day.date && <p className={MUTED}>{day.date}</p>}
                    <p className="text-3xl font-bold tracking-tight">DAY {day.day}</p>
                    <p className={MUTED}>장소 {places.length}곳</p>
                  </div>
                  <div className={`md:row-start-1 ${contentLeft ? "md:col-start-1" : "md:col-start-2"}`}>
                    <Cards items={places} empty="아직 장소가 없습니다." days={dayOptions} readOnly={readOnly} />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* BACK: 쓴 돈, 쪽지 */}
        <section aria-labelledby="m-back" className="flex flex-col gap-6">
          <Heading id="m-back">BACK</Heading>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-3">
              <p className="font-medium text-white/80">쓴 돈</p>
              <div className={`${PANEL} p-4`}>
                <CostList items={grouped.costs} companions={trip.companions} />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <p className="font-medium text-white/80">쪽지</p>
              <Cards items={grouped.memos} empty="메모가 없습니다." days={dayOptions} readOnly={readOnly} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
