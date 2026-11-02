"use client";

// 1화면 A안 "크게"의 매거진 개편 (F10). 영역 순서는 02-FRONTEND.md 3-1(맨 위 → GO → DAY 1~N → BACK)을 지킨다.
// - 대표 사진이 페이지 맨 위(머리글·전환 버튼 뒤)부터 제목 영역까지 깔리고, 사진 톤의 배경색이 페이지 전체를 채운다.
// - DAY는 가운데 기준선을 두고 PC는 좌우 번갈아, 모바일은 기준선 왼쪽에 두고 한쪽으로 정렬한다.
// - 카드는 화면에 들어올 때 차례로 떠오르고, 마우스를 올리면 살짝 뜬다(움직임 줄이기 설정이면 움직이지 않음).
// 대표 이미지(F08)가 들어오기 전에는 목적지로 색을 정한 임시 그림을 쓴다.
// 이 화면이 열려 있는 동안 <html data-cover>를 붙인다. 머리글·전환 버튼이 이 표시를 보고 사진 위 글자색(흰색)으로 바뀐다.

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
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
// 사진 톤 배경 위의 어두운 유리 카드(레퍼런스 WHAT'S INCLUDED). 항목 카드(ItemCard)는 바깥 글자색(흰색)을 따른다.
const PANEL =
  "rounded-2xl border border-white/15 bg-white/[0.07] text-white shadow-lg shadow-black/30 backdrop-blur-xl transition duration-300 ease-out hover:-translate-y-1 hover:border-white/35 hover:bg-white/[0.13] hover:shadow-2xl motion-reduce:transition-none motion-reduce:hover:translate-y-0";

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

// 이 화면이 있는 동안 페이지 바탕색을 사진 톤으로 바꾸고 <html data-cover>를 붙인다. 떠나면 되돌린다.
function useCoverPage(background: string) {
  useEffect(() => {
    const html = document.documentElement;
    const previous = html.style.getPropertyValue("--background");
    html.dataset.cover = "";
    html.style.setProperty("--background", background);
    return () => {
      delete html.dataset.cover;
      if (previous) html.style.setProperty("--background", previous);
      else html.style.removeProperty("--background");
    };
  }, [background]);
}

// 대표 사진 층. 페이지 맨 위부터 제목 영역 아래까지 화면 폭 전체에 깐다(머리글·전환 버튼 뒤).
function CoverLayer({ image, background, heroRef }: { image: string; background: string; heroRef: RefObject<HTMLElement | null> }) {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const measure = () => setHeight(Math.round(hero.getBoundingClientRect().bottom + window.scrollY));
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    observer.observe(hero);
    return () => observer.disconnect();
  }, [heroRef]);

  if (height === null) return null;
  return createPortal(
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden" style={{ height }}>
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${image}")` }} />
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 50%, ${background} 100%)` }}
      />
    </div>,
    document.body,
  );
}

// 화면에 들어오면 아래에서 떠오른다. delay(ms)로 차례를 준다.
function Reveal({ children, delay = 0, as: Tag = "div", className = "" }: { children: ReactNode; delay?: number; as?: "div" | "li"; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as RefObject<never>}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
      className={`transition-[opacity,translate] duration-700 ease-out motion-reduce:transition-none ${
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

function Heading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Reveal className="flex items-center gap-4">
      <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-transparent to-white/40" />
      <h3 id={id} className="text-3xl font-bold tracking-tight md:text-5xl">
        {children}
      </h3>
      <span aria-hidden className="h-px flex-1 bg-gradient-to-l from-transparent to-white/40" />
    </Reveal>
  );
}

function Cards({ items, empty, days, readOnly }: { items: Item[]; empty: string; days: TripDay[]; readOnly: boolean }) {
  if (items.length === 0) return <p className={MUTED}>{empty}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <Reveal as="li" key={item.id} delay={i * 80}>
          <div className={PANEL}>
            <ItemCard key={item.updated_at} item={item} days={days} readOnly={readOnly} />
          </div>
        </Reveal>
      ))}
    </ul>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-24 flex-col gap-0.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:bg-white/20 motion-reduce:transition-none">
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
  const heroRef = useRef<HTMLElement>(null);
  useCoverPage(background);

  return (
    <div className="flex flex-col gap-20 pb-16 text-white">
      <CoverLayer image={image} background={background} heroRef={heroRef} />

      {/* 맨 위: 대표 사진(배경 층), 여행 제목, 기간, 기록 수 */}
      <section
        ref={heroRef}
        aria-label={coverUrl ? "여행 개요 (대표 이미지)" : "여행 개요 (임시 대표 그림)"}
        className="flex min-h-[46svh] flex-col justify-end gap-6 pb-4 md:min-h-[58svh]"
      >
        <Reveal className="flex flex-col gap-3">
          {trip.destination && <p className="text-sm tracking-[0.3em] text-white/80 uppercase">{trip.destination}</p>}
          <h2 className="text-5xl font-bold tracking-tight break-keep text-white/95 drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)] md:text-8xl">{trip.title}</h2>
        </Reveal>
        <Reveal delay={150} className="flex flex-wrap gap-2">
          <Chip label="기간" value={formatTripPeriod(trip)} />
          <Chip label="일정" value={`${grouped.days.length}일`} />
          <Chip label="함께" value={`${trip.companions}명`} />
          <Chip label="기록" value={`${count}개`} />
        </Reveal>
      </section>

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
          <span aria-hidden className="absolute top-2 bottom-0 left-3 w-px bg-gradient-to-b from-white/50 via-white/25 to-transparent md:left-1/2" />
          {grouped.days.map(({ day, places }, index) => {
            // PC: 짝수 번째는 내용이 왼쪽·제목이 오른쪽, 홀수 번째는 반대
            const contentLeft = index % 2 === 0;
            const color = dayColor(day.day);
            return (
              <li key={day.day} aria-label={`${day.day}일차`} className="relative grid gap-4 pb-14 pl-10 md:grid-cols-2 md:gap-x-16 md:pl-0">
                <span aria-hidden className="absolute top-2 left-3 flex size-3.5 -translate-x-1/2 md:left-1/2">
                  <span className="absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping" style={{ backgroundColor: color }} />
                  <span className="relative inline-flex size-3.5 rounded-full ring-4 ring-white/20" style={{ backgroundColor: color }} />
                </span>
                <Reveal className={`md:row-start-1 ${contentLeft ? "md:col-start-2" : "md:col-start-1 md:text-right"}`}>
                  {day.date && <p className={MUTED}>{day.date}</p>}
                  <p className="text-3xl font-bold tracking-tight">DAY {day.day}</p>
                  <p className={MUTED}>장소 {places.length}곳</p>
                </Reveal>
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
            <Reveal>
              <div className={`${PANEL} p-4`}>
                <CostList items={grouped.costs} companions={trip.companions} />
              </div>
            </Reveal>
          </div>
          <div className="flex flex-col gap-3">
            <p className="font-medium text-white/80">쪽지</p>
            <Cards items={grouped.memos} empty="메모가 없습니다." days={dayOptions} readOnly={readOnly} />
          </div>
        </div>
      </section>
    </div>
  );
}
