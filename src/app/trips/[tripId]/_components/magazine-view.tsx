"use client";

// 1화면 매거진 (F10). C8에서 "종이"를 지워 1화면은 이 형식 하나다(F13). 영역 순서는 02-FRONTEND.md 3-1(맨 위 → GO → DAY 1~N → BACK)을 지킨다.
// GO(교통·숙소)는 제목 바로 아래 예약 카드 줄로 올렸다. 카드를 누르면 팝업으로 자세히 보고 고친다.
// - 대표 사진이 페이지 맨 위(머리글·전환 버튼 뒤)부터 제목 영역까지 깔리고, 사진 톤의 배경색이 페이지 전체를 채운다.
// - DAY는 가운데 기준선을 두고 PC는 좌우 번갈아, 모바일은 기준선 왼쪽에 두고 한쪽으로 정렬한다.
// - 카드는 화면에 들어올 때 차례로 떠오르고, 마우스를 올리면 살짝 뜬다(움직임 줄이기 설정이면 움직이지 않음).
// 대표 이미지(F08)가 들어오기 전에는 목적지로 색을 정한 임시 그림을 쓴다.
// 이 화면이 열려 있는 동안 <html data-cover>를 붙인다. 머리글·전환 버튼이 이 표시를 보고 사진 위 글자색(흰색)으로 바뀐다.

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { GroupedItems } from "@/lib/items/group";
import type { Item } from "@/lib/items/types";
import { dayColor } from "@/lib/map/places";
import type { TripDay } from "@/lib/trips/days";
import { dayAreas } from "@/lib/trips/areas";
import { averageColor, hueBackground, hueFromText, placeholderCover, toneBackground } from "@/lib/trips/tone";
import type { Trip } from "@/lib/trips/types";
import type { TripWeather } from "@/lib/weather/codes";
import { ItemCard } from "./item-card";
import { NoteComposer } from "./note-composer";
import { PlaceCard } from "./place-card";
import { CostSection } from "./cost-section";
import { TicketStrip } from "./ticket-strip";

type Props = {
  trip: Trip;
  grouped: GroupedItems;
  count: number;
  dayOptions: TripDay[];
  readOnly: boolean;
  coverUrl?: string | null; // F08 머지 후 여행의 대표 이미지 주소를 넘긴다
  weather?: TripWeather | null; // GO 패널 날씨 (서버에서 구함)
  photos?: Record<string, string>; // 항목 id → 직접 넣은 사진 주소. 없으면 일차 색 그라데이션
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

// DAY 한 칸 (F10). 제목 아래에 그날의 지역만 짧게 보이고, DAY를 누르면 서랍처럼 장소 카드들이 펼쳐진다.
// PC: 짝수 번째는 내용이 왼쪽·제목이 오른쪽, 홀수 번째는 반대. 모바일: 기준선 왼쪽, 한쪽 정렬.
function DayBlock({
  day,
  places,
  destination,
  contentLeft,
  photos,
  dayOptions,
  readOnly,
}: {
  day: TripDay;
  places: Item[];
  destination: string;
  contentLeft: boolean;
  photos: Record<string, string>;
  dayOptions: TripDay[];
  readOnly: boolean;
}) {
  const [open, setOpen] = useState(false);
  const drawerId = useId();
  const color = dayColor(day.day);
  const { areas, more } = dayAreas(places.map((p) => p.address), destination);
  const toggle = () => setOpen((v) => !v);
  const empty = places.length === 0;

  return (
    <li aria-label={`${day.day}일차`} className="relative grid gap-4 pb-12 pl-10 md:grid-cols-2 md:gap-x-16 md:pl-0">
      <span aria-hidden className="absolute top-2 left-3 flex size-3.5 -translate-x-1/2 md:left-1/2">
        <span className="absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping" style={{ backgroundColor: color }} />
        <span className="relative inline-flex size-3.5 rounded-full ring-4 ring-white/20" style={{ backgroundColor: color }} />
      </span>

      {/* 제목: 누르면 펼치고 접는다 */}
      <Reveal className={`md:row-start-1 ${contentLeft ? "md:col-start-2" : "md:col-start-1 md:text-right"}`}>
        <button type="button" onClick={toggle} disabled={empty} aria-expanded={open} aria-controls={drawerId} className={`group inline-block text-left disabled:cursor-default ${contentLeft ? "" : "md:text-right"}`}>
          {day.date && <p className={MUTED}>{day.date}</p>}
          <p className="text-3xl font-bold tracking-tight transition group-hover:opacity-80">DAY {day.day}</p>
          {areas.length > 0 && (
            <p className="mt-1 text-base font-medium text-white/85">
              {areas.join(" · ")}
              {more > 0 && <span className="text-white/55"> 외 {more}곳</span>}
            </p>
          )}
          <p className={`mt-1 ${MUTED}`}>{empty ? "아직 장소가 없습니다" : `장소 ${places.length}곳 · ${open ? "접기 ↑" : "펼치기 ↓"}`}</p>
        </button>
      </Reveal>

      <div className={`md:row-start-1 ${contentLeft ? "md:col-start-1" : "md:col-start-2"}`}>
        {empty ? null : (
          <>
            {/* 서랍: 그날의 장소 카드들 */}
            <div
              id={drawerId}
              className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="min-h-0 overflow-hidden" inert={!open}>
                <ul className="flex flex-col gap-3">
                  {places.map((item, i) => (
                    <Reveal as="li" key={item.id} delay={i * 80}>
                      <PlaceCard key={item.updated_at} item={item} photoUrl={photos[item.id]} color={color} days={dayOptions} readOnly={readOnly} />
                    </Reveal>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </li>
  );
}

export function MagazineView({ trip, grouped, dayOptions, readOnly, coverUrl = null, photos = {}, weather = null }: Props) {
  const hue = hueFromText(trip.destination || trip.title);
  const photoTone = usePhotoTone(coverUrl);
  const background = photoTone ?? hueBackground(hue);
  const image = coverUrl ?? placeholderCover(hue);
  const heroRef = useRef<HTMLElement>(null);
  useCoverPage(background);

  return (
    <div className="flex flex-col gap-20 pb-16 text-white">
      <CoverLayer image={image} background={background} heroRef={heroRef} />

      {/* 맨 위: 대표 사진(배경 층), 여행 제목, GO(교통·숙소 예약 카드, 누르면 자세히) */}
      <section
        ref={heroRef}
        aria-label={coverUrl ? "여행 개요 (대표 이미지)" : "여행 개요 (임시 대표 그림)"}
        className="flex min-h-[46svh] flex-col justify-end gap-6 pb-4 md:min-h-[58svh]"
      >
        <Reveal className="flex flex-col gap-3">
          {trip.destination && <p className="text-sm tracking-[0.3em] text-white/80 uppercase">{trip.destination}</p>}
          <h2 className="text-5xl font-bold tracking-tight break-keep text-white/95 drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)] md:text-8xl">{trip.title}</h2>
        </Reveal>
        <Reveal delay={150}>
          <TicketStrip
            tripId={trip.id}
            items={[...grouped.transport, ...grouped.lodging]}
            days={dayOptions}
            readOnly={readOnly}
            weather={weather}
            coverImage={image}
            companions={trip.companions}
            startDate={trip.start_date}
          />
        </Reveal>
      </section>

      {/* DAY 1~N: 기준선 */}
      <section aria-labelledby="m-days" className="flex flex-col gap-10">
        <Heading id="m-days">DAY BY DAY</Heading>
        <ol className="relative">
          <span aria-hidden className="absolute top-2 bottom-0 left-3 w-px bg-gradient-to-b from-white/50 via-white/25 to-transparent md:left-1/2" />
          {grouped.days.map(({ day, places: dayPlaces }, index) => (
            <DayBlock key={day.day} day={day} places={dayPlaces} destination={trip.destination} contentLeft={index % 2 === 0} photos={photos} dayOptions={dayOptions} readOnly={readOnly} />
          ))}
        </ol>
      </section>

      {/* BACK: 쓴 돈, 쪽지 */}
      <section aria-labelledby="m-back" className="flex flex-col gap-6">
        <Heading id="m-back">BACK</Heading>
        <div className="grid gap-6 sm:grid-cols-2">
          <Reveal>
            <CostSection
              items={grouped.costs}
              companions={trip.companions}
              readOnly={readOnly}
              title={<p className="font-medium text-white/80">쓴 돈</p>}
              panelClassName={PANEL}
            />
          </Reveal>
          {readOnly ? (
            <div className="flex flex-col gap-3">
              <p className="font-medium text-white/80">쪽지</p>
              <Cards items={grouped.memos} empty="메모가 없습니다." days={dayOptions} readOnly={readOnly} />
            </div>
          ) : (
            <NoteComposer tripId={trip.id} title={<p className="font-medium text-white/80">쪽지</p>}>
              <Cards items={grouped.memos} empty="메모가 없습니다." days={dayOptions} readOnly={readOnly} />
            </NoteComposer>
          )}
        </div>
      </section>
    </div>
  );
}
