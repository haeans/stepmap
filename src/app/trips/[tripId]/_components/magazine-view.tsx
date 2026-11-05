"use client";

// 1화면 매거진 (F10). C8에서 "종이"를 지워 1화면은 이 형식 하나다(F13). 영역 순서는 02-FRONTEND.md 3-1(맨 위 → GO → DAY 1~N → BACK)을 지킨다.
// GO(교통·숙소)는 제목 바로 아래 예약 카드 줄로 올렸다. 카드를 누르면 팝업으로 자세히 보고 고친다.
// - 대표 사진이 화면 전체 뒤에 고정되어 깔리고(C9 F21), 아래로 내려가면 사진 톤의 막이 짙어진다.
// - DAY는 가운데 기준선을 두고 PC는 좌우 번갈아, 모바일은 기준선 왼쪽에 두고 한쪽으로 정렬한다.
// - 카드는 화면에 들어올 때 차례로 떠오르고, 마우스를 올리면 살짝 뜬다(움직임 줄이기 설정이면 움직이지 않음).
// 대표 이미지(F08)가 들어오기 전에는 목적지로 색을 정한 임시 그림을 쓴다.
// 이 화면이 열려 있는 동안 <html data-cover>를 붙인다. 머리글·전환 버튼이 이 표시를 보고 사진 위 글자색(흰색)으로 바뀐다.

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { GroupedItems } from "@/lib/items/group";
import { daySchedule, type DayEntry } from "@/lib/items/day-plan";
import { mergeByTime, type Merged } from "@/lib/items/merge-by-time";
import type { Item } from "@/lib/items/types";
import { dayColor } from "@/lib/map/places";
import type { TripDay } from "@/lib/trips/days";
import type { Check } from "@/lib/trips/packing";
import { dayAreas } from "@/lib/trips/areas";
import { averageColor, hueBackground, hueFromText, placeholderCover, toneBackground } from "@/lib/trips/tone";
import type { Trip } from "@/lib/trips/types";
import type { TripWeather } from "@/lib/weather/codes";
import { HubCard } from "./hub-card";
import { ItemCard } from "./item-card";
import { NoteComposer } from "./note-composer";
import { PlaceCard } from "./place-card";
import { PreviewBar } from "./preview-bar";
import { PreviewActions, PreviewCard } from "./preview-card";
import { previewAsItem, usePreviews, type PendingPreview } from "./previews";

// 저장 전 교통 미리보기가 그날의 시작·끝 거점이 될 때(C10 F33). item은 하루 일정 규칙에 넣은 모양.
type PreviewHub = { preview: PendingPreview; item: Item; side: "from" | "to" };
import { SuggestionCard } from "./suggestion-card";
import { useSuggestions, type PendingSuggestion } from "./suggestions";
import { CostSection } from "./cost-section";
import { Checklist, TicketStrip, WeatherBadge } from "./ticket-strip";

type Props = {
  trip: Trip;
  grouped: GroupedItems;
  count: number;
  dayOptions: TripDay[];
  readOnly: boolean;
  checks: Check[]; // 준비물 (C10 F31, 서버에서 읽음)
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

const noSubscribe = () => () => {};

// 대표 사진 층 (C9 F21: 대표 사진 전체를 배경으로, B61·B64 고침). 사진을 화면 전체 뒤에 고정해 깔고(머리글·전환 버튼 뒤),
// 제목 영역에서는 사진이 잘 보이게 막을 옅게, 아래로 내려 DAY·BACK 카드가 올라오면 사진 톤 막을 짙게 해 글자가 읽히게 한다.
function CoverLayer({ image, background, heroRef }: { image: string; background: string; heroRef: RefObject<HTMLElement | null> }) {
  // 서버 렌더링에서는 document가 없으므로 브라우저에서만 그린다.
  const mounted = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  // 0: 맨 위(제목 영역), 1: 제목 영역을 다 지나 내려감
  const [depth, setDepth] = useState(0);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const height = Math.max(1, hero.offsetHeight);
      setDepth(Math.min(1, Math.max(0, window.scrollY / height)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [heroRef]);

  if (!mounted) return null;
  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${image}")` }} />
      {/* 위쪽 머리글 자리만 살짝 어둡게(흰 글씨 로고·버튼이 보이게) */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 28%)" }} />
      {/* 사진 톤 막: 맨 위 25% → 내려가면 80% */}
      <div className="absolute inset-0" style={{ background, opacity: 0.25 + 0.55 * depth }} />
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
// 카드는 하루 일정 규칙(C9 F26, daySchedule)을 따른다: 시작(전날 숙소 또는 도착 거점) → 관광지·식당 → 끝(그날 숙소 또는 출발 거점).
// PC: 짝수 번째는 내용이 왼쪽·제목이 오른쪽, 홀수 번째는 반대. 모바일: 기준선 왼쪽, 한쪽 정렬.
function DayBlock({
  day,
  places,
  entries,
  destination,
  contentLeft,
  photos,
  dayOptions,
  readOnly,
  tripId,
  suggestions,
  previews,
  hubs,
}: {
  day: TripDay;
  places: Item[]; // 그날의 관광지·식당 (지역 이름과 개수)
  entries: DayEntry[]; // 하루 일정: 시작 + 장소 + 끝
  hubs: { start?: PreviewHub; end?: PreviewHub }; // C10 F33: 저장 전 교통이 그날의 시작·끝 거점이면(첫날 도착 공항 등)
  destination: string;
  contentLeft: boolean;
  photos: Record<string, string>;
  dayOptions: TripDay[];
  readOnly: boolean;
  tripId: string;
  suggestions: PendingSuggestion[]; // F18: 아직 저장 안 한 추천 일정
  previews: PendingPreview[]; // C9 F28: 붙여넣기로 뽑았지만 아직 저장 안 한 일정
}) {
  const [open, setOpen] = useState(false);
  // F18·F28: 추천·미리보기가 새로 들어오면 서랍을 연다(렌더 중에 이전 개수와 비교).
  const pendingCount = suggestions.length + previews.length + (hubs.start ? 1 : 0) + (hubs.end ? 1 : 0);
  const [seen, setSeen] = useState(pendingCount);
  if (seen !== pendingCount) {
    setSeen(pendingCount);
    if (pendingCount > seen) setOpen(true);
  }
  const drawerId = useId();
  const color = dayColor(day.day);
  const { areas, more } = dayAreas(places.map((p) => p.address), destination);
  const toggle = () => setOpen((v) => !v);
  const empty = entries.length === 0 && pendingCount === 0;
  const end = entries.at(-1)?.role === "end" ? entries.at(-1) : undefined;
  const body = end ? entries.slice(0, -1) : entries;
  const startEntry = body[0]?.role === "start" ? body[0] : undefined;
  const placeEntries = startEntry ? body.slice(1) : body;
  const lodgingPreviews = previews.filter((p) => p.item.kind === "lodging");
  const rows: Merged<DayEntry, PendingPreview>[] = [
    ...(startEntry ? [{ kind: "saved" as const, value: startEntry }] : []),
    ...mergeByTime(
      placeEntries,
      previews.filter((p) => p.item.kind !== "lodging"),
      (e) => e.item.time,
      (p) => p.item.time,
    ),
  ];
  const card = (e: DayEntry) =>
    e.role !== "place" && e.side ? (
      <HubCard item={e.item} side={e.side} tripId={tripId} />
    ) : (
      <PlaceCard key={e.item.updated_at} item={e.item} photoUrl={photos[e.item.id]} color={color} days={dayOptions} readOnly={readOnly} role={e.role === "place" ? undefined : e.role} />
    );

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
          <p className={`mt-1 ${MUTED}`}>{empty ? "아직 일정이 없습니다" : `장소 ${places.length}곳${previews.length ? ` · 미리보기 ${previews.length}` : ""}${suggestions.length ? ` · 추천 ${suggestions.length}` : ""} · ${open ? "접기 ↑" : "펼치기 ↓"}`}</p>
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
                  {/* 시작(전날 숙소·도착 거점)은 맨 위. 그 아래 저장된 장소와 F28 미리보기를 시각순으로 섞는다.
                      그래서 미리보기를 "넣기"로 저장해도 카드가 그 자리에 남는다(fix-day-lodging). 미리보기는 저장 전이라
                      하루 일정 규칙(F26)을 적용하지 않지만, 숙소 미리보기는 저장 후처럼 그날 끝(출발 거점·숙소) 바로 앞에 둔다. */}
                  {hubs.start && (
                    <li key={`hub-start:${hubs.start.preview.id}`}>
                      <HubCard item={hubs.start.item} side={hubs.start.side} preview tripId={tripId} actions={<PreviewActions tripId={tripId} preview={hubs.start.preview} />} />
                    </li>
                  )}
                  {rows.map((r, i) =>
                    r.kind === "saved" ? (
                      <Reveal as="li" key={`${r.value.role}:${r.value.item.id}`} delay={i * 80}>
                        {card(r.value)}
                      </Reveal>
                    ) : (
                      <li key={r.value.id}>
                        <PreviewCard tripId={tripId} preview={r.value} color={color} days={dayOptions} />
                      </li>
                    ),
                  )}
                  {lodgingPreviews.map((p) => (
                    <li key={p.id}>
                      <PreviewCard tripId={tripId} preview={p} color={color} days={dayOptions} />
                    </li>
                  ))}
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <SuggestionCard tripId={tripId} suggestion={s} color={color} days={dayOptions} />
                    </li>
                  ))}
                  {end && (
                    <Reveal as="li" key={`end:${end.item.id}`} delay={body.length * 80}>
                      {card(end)}
                    </Reveal>
                  )}
                  {hubs.end && (
                    <li key={`hub-end:${hubs.end.preview.id}`}>
                      <HubCard item={hubs.end.item} side={hubs.end.side} preview tripId={tripId} actions={<PreviewActions tripId={tripId} preview={hubs.end.preview} />} />
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </li>
  );
}

export function MagazineView({ trip, grouped, dayOptions, readOnly, checks, coverUrl = null, photos = {}, weather = null }: Props) {
  const hue = hueFromText(trip.destination || trip.title);
  const photoTone = usePhotoTone(coverUrl);
  const background = photoTone ?? hueBackground(hue);
  const image = coverUrl ?? placeholderCover(hue);
  const heroRef = useRef<HTMLElement>(null);
  useCoverPage(background);
  // F18: 추천 일정(이 브라우저에만 있음). 공유받은 사람에게는 보이지 않는다.
  const stored = useSuggestions(trip.id);
  const suggestions = readOnly ? [] : stored;
  // C9 F28: 붙여넣기 미리보기(이 브라우저에만 있음). 공유받은 사람에게는 보이지 않는다.
  const storedPreviews = usePreviews(trip.id);
  const previews = readOnly ? [] : storedPreviews;
  // C10 F33: 미리보기에도 하루 일정 규칙(F26)을 쓴다. 교통 미리보기는 DAY 카드로 넣지 않고,
  // 첫날 도착 거점·마지막 날 출발 거점이 되는 교통만 거점 카드(미리보기)로 보인다. 나머지 교통은 미리보기 줄에 이름만 보인다(GO에 들어감).
  const previewItems = previews.map((p) => previewAsItem(p, trip.id));
  const previewById = new Map(previews.map((p) => [p.id, p]));
  const hubPreviews = new Map<number, { start?: PreviewHub; end?: PreviewHub }>();
  // 추천·미리보기가 여행 기간 뒤 일차에 있으면 그 일차까지 늘려 보인다.
  const days = [...grouped.days];
  // 하루 일정 규칙(C9 F26)은 다른 날의 숙소(전날 밤)와 교통도 봐야 해서 전체 항목으로 계산한다. 메모는 쓰지 않는다.
  const allItems = [...grouped.transport, ...grouped.lodging, ...grouped.days.flatMap((d) => d.places)];
  // 미리보기가 있는 일차도 첫날·마지막 날 계산에 넣는다(일부만 저장했을 때 마지막 날 숙소가 사라지지 않게, fix-day-lodging)
  const previewDays = [...new Set(previews.map((p) => p.item.day))];
  const lastSuggested = Math.max(0, ...suggestions.map((s) => s.item.day), ...previews.map((p) => p.item.day));
  for (let d = days.length + 1; d <= lastSuggested; d++) days.push({ day: { day: d, date: null }, places: [] });
  const schedules = new Map(days.map(({ day }) => [day.day, daySchedule(day.day, allItems, previewDays)]));
  for (const { day } of days) {
    const saved = schedules.get(day.day) ?? [];
    const withPreviews = daySchedule(day.day, [...allItems, ...previewItems]);
    const pick = (e: DayEntry | undefined, role: "start" | "end"): PreviewHub | undefined => {
      const p = e && e.role === role && e.side ? previewById.get(e.item.id) : undefined;
      return p && e?.side && !saved.some((s) => s.role === role) ? { preview: p, item: e.item, side: e.side } : undefined;
    };
    const start = pick(withPreviews[0], "start");
    const end = pick(withPreviews.at(-1), "end");
    if (start || end) hubPreviews.set(day.day, { start, end });
  }
  const hubIds = new Set([...hubPreviews.values()].flatMap((h) => [h.start?.preview.id, h.end?.preview.id]).filter((id): id is string => !!id));

  return (
    <div className="flex flex-col gap-20 pb-16 text-white">
      <CoverLayer image={image} background={background} heroRef={heroRef} />

      {/* 맨 위: 대표 사진(배경 층), 여행 제목, GO(교통·숙소 예약 카드, 누르면 자세히) */}
      <section
        ref={heroRef}
        aria-label={coverUrl ? "여행 개요 (대표 이미지)" : "여행 개요 (임시 대표 그림)"}
        className="flex min-h-[46svh] flex-col justify-end gap-6 pb-4 md:min-h-[58svh]"
      >
        {/* 제목 오른쪽에 날씨 투명 패널(F16). 좁은 화면에서는 제목 오른쪽 위에 작게 붙는다. */}
        <Reveal className="flex items-start justify-between gap-3 md:items-end md:gap-6">
          {/* 제목 위의 작은 목적지 글씨는 빼기로 했다 (C10 F30, 합의) */}
          <div className="flex min-w-0 flex-col gap-3">
            <h2 className="text-5xl font-bold tracking-tight break-keep text-white/95 drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)] md:text-8xl">{trip.title}</h2>
          </div>
          {weather && <WeatherBadge weather={weather} />}
        </Reveal>
        <Reveal delay={150}>
          <TicketStrip items={[...grouped.transport, ...grouped.lodging]} days={dayOptions} readOnly={readOnly} coverImage={image} companions={trip.companions} photos={photos} />
        </Reveal>
      </section>

      {/* DAY 1~N: 기준선 */}
      {/* GO 카드와 DAY BY DAY 제목 사이는 40px로 다른 칸 사이보다 좁게 (C10 F30) */}
      <section aria-labelledby="m-days" className="-mt-18 flex flex-col gap-10">
        <Heading id="m-days">DAY BY DAY</Heading>
        <PreviewBar tripId={trip.id} previews={previews} goOnly={previews.filter((p) => p.item.kind === "transport" && !hubIds.has(p.id))} />
        <ol className="relative">
          <span aria-hidden className="absolute top-2 bottom-0 left-3 w-px bg-gradient-to-b from-white/50 via-white/25 to-transparent md:left-1/2" />
          {days.map(({ day, places: dayPlaces }, index) => (
            <DayBlock
              key={day.day}
              day={day}
              places={dayPlaces}
              entries={schedules.get(day.day) ?? []}
              hubs={hubPreviews.get(day.day) ?? {}}
              destination={trip.destination}
              contentLeft={index % 2 === 0}
              photos={photos}
              dayOptions={dayOptions}
              readOnly={readOnly}
              tripId={trip.id}
              suggestions={suggestions.filter((s) => s.item.day === day.day)}
              previews={previews.filter((p) => p.item.day === day.day && p.item.kind !== "transport")}
            />
          ))}
        </ol>
      </section>

      {/* BACK: 쓴 돈, 쪽지, 준비물(F16. C10 F31부터 공유받은 사람도 보기만) */}
      <section aria-labelledby="m-back" className="flex flex-col gap-6">
        <Heading id="m-back">BACK</Heading>
        <div className="grid gap-6 sm:grid-cols-2">
          <Reveal>
            <CostSection
              tripId={trip.id}
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
          {(!readOnly || checks.length > 0) && (
            <Reveal>
              <Checklist
                tripId={trip.id}
                initialChecks={checks}
                readOnly={readOnly}
                startDate={trip.start_date}
                weather={weather}
                title={<p className="font-medium text-white/80">준비물</p>}
                panelClassName={PANEL}
              />
            </Reveal>
          )}
        </div>
      </section>
    </div>
  );
}
