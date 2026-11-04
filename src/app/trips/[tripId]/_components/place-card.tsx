"use client";

// 매거진 DAY 장소 카드 (F10). 사진이 들어간 카드를 누르면 서랍처럼 아래로 펼쳐지며
// 그 일정에 필요한 것(시간, 티켓·입장료와 예약 링크, 주소, 메모, 지도에서 보기)을 보여 준다. 수정·삭제도 여기서 한다.
// 지도로 가는 버튼은 카드 앞면(펼침 버튼 바로 위)에도 있다(C8 F16).
// 사진: 직접 넣은 사진(photoUrl) → 장소 사진(C8 F22: 관광지는 Wikimedia Commons 먼저, 그 밖은 Google Places) → 일차 색 그라데이션.
// 하루의 시작·끝 숙소 카드(role, C9 F26)는 그라데이션 대신 로고.
// 장소 사진은 앞면 오른쪽 위 ⓘ를 누르면 크게 보며 출처(작가·라이선스·원본 링크)를 보인다. Google 사진은 앞면에 "Google Maps"도 둔다.

import Link from "next/link";
import { useId, useRef, useState, useTransition, type MouseEvent, type ReactNode } from "react";
import { deleteItem, updateItem } from "@/app/actions/items";
import { formatCost, formatTime, GEOCODED_KINDS, ITEM_KIND_LABELS, type Item } from "@/lib/items/types";
import type { CardPhoto } from "@/lib/places/types";
import type { TripDay } from "@/lib/trips/days";
import { BookingInfo, BookingLinkButton } from "./booking-info";
import { EDIT_DIALOG, EditHeader } from "./edit-sheet";
import { LogoPhoto } from "./hub-card";
import { ItemForm } from "./item-form";
import { photoVersion, usePlacePhoto } from "./use-place-photo";

// role: 하루의 시작·끝 숙소 카드(C9 F26)이면 "start"·"end". 사진을 못 불러오면 그라데이션 대신 로고를 쓴다.
// 시작 숙소(마지막 날 아침)는 체크인 시각이 전날 것이라 시각을 보이지 않는다.
type Props = { item: Item; photoUrl?: string | null; color: string; days: TripDay[]; readOnly: boolean; role?: "start" | "end" };

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-3 py-2">
      <dt className="text-xs text-white/55">{label}</dt>
      <dd className="min-w-0 text-sm break-words">{children}</dd>
    </div>
  );
}

export function PlaceCard({ item, photoUrl = null, color, days, readOnly, role }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const drawerId = useId();

  const cost = formatCost(item.cost_amount, item.cost_currency);
  const date = days.find((d) => d.day === item.day)?.date;
  const time = formatTime(item.time);
  const onMap = item.lat !== null;
  const lodging = item.kind === "lodging";
  const { ref: photoRef, photo: placePhoto, onError: onPhotoError } = usePlacePhoto(item.trip_id, item.id, photoVersion(item.kind, item.name, item.address), !photoUrl && onMap && GEOCODED_KINDS.includes(item.kind));
  const photo = photoUrl ?? placePhoto?.url ?? null;

  function onDelete() {
    if (!window.confirm(`"${item.name}" 항목을 지울까요?`)) return;
    startDelete(async () => {
      const result = await deleteItem(item.id, item.trip_id);
      setError(result.error);
    });
  }

  return (
    <article
      ref={photoRef}
      className={`overflow-hidden rounded-2xl border bg-white/[0.07] text-white shadow-lg shadow-black/30 backdrop-blur-xl transition duration-300 ease-out motion-reduce:transition-none ${
        open ? "border-white/35 bg-white/[0.12] shadow-2xl" : "border-white/15 hover:-translate-y-1 hover:border-white/35 hover:bg-white/[0.12] hover:shadow-2xl motion-reduce:hover:translate-y-0"
      }`}
    >
      {/* 머리: 사진 + 시각·이름. 누르면 서랍이 열린다. 오른쪽 아래 펼침 버튼 바로 위에 지도로 가는 버튼(F16). */}
      <div className="relative">
        {onMap && (
          <Link
            href={`/trips/${item.trip_id}?view=map&item=${item.id}`}
            aria-label={`${item.name} 지도에서 보기`}
            title="지도에서 보기"
            className="absolute right-3 bottom-[3.25rem] z-10 flex size-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-white/30 active:scale-95"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
              <circle cx="12" cy="9.5" r="2.5" />
            </svg>
          </Link>
        )}
        <button type="button" aria-expanded={open} aria-controls={drawerId} onClick={() => setOpen((v) => !v)} className="group block w-full text-left">
          <div className="relative h-36 overflow-hidden sm:h-40">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- 외부 사진 주소를 그대로 쓴다(이미지 최적화를 쓰지 않음, B49)
              <img
                src={photo}
                alt={`${item.name} 사진`}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={photoUrl ? undefined : onPhotoError}
                className="absolute inset-0 size-full object-cover transition duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none"
              />
            ) : role ? (
              <LogoPhoto />
            ) : (
              <div aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${color}aa, ${color}33 60%, transparent)` }} />
            )}
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
            {time && role !== "start" && <span className="absolute top-3 left-3 rounded-full bg-black/45 px-2.5 py-1 font-mono text-xs backdrop-blur-md">{time}</span>}
            <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-white/70">
                  {ITEM_KIND_LABELS[item.kind]}
                  {item.address && ` · ${item.address}`}
                </p>
                <h4 className="text-lg leading-tight font-semibold break-words drop-shadow">{item.name}</h4>
              </div>
              <span
                aria-hidden
                className={`flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition duration-300 ${open ? "rotate-180 bg-white/30" : "group-hover:bg-white/25"}`}
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </div>
          </div>
        </button>
        {!photoUrl && placePhoto && <PhotoInfo photo={placePhoto} name={item.name} />}
      </div>

      {/* 서랍: grid 행 높이 0fr → 1fr 로 부드럽게 열고 닫는다 */}
      <div
        id={drawerId}
        className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={`px-4 pt-1 pb-4 transition-opacity duration-300 ${open ? "opacity-100 delay-150" : "opacity-0"}`} inert={!open}>
            <dl className="divide-y divide-white/10">
              {/* 숙소는 "체크인" 줄 오른쪽에 예약 링크 버튼 (C9 F26 결정 4) */}
              <Row label={lodging ? "체크인" : "시간"}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{[`DAY ${item.day}`, date, time || "시각 미정"].filter(Boolean).join(" · ")}</span>
                  {lodging && <BookingLinkButton secret={item.secret} tone="dark" />}
                </div>
              </Row>
              <Row label="티켓·입장">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{cost || "비용 정보 없음"}</span>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-900 transition hover:bg-white/85 active:scale-95"
                    >
                      티켓·예약 열기 ↗
                    </a>
                  )}
                </div>
              </Row>
              {item.address && <Row label="주소">{item.address}</Row>}
              {item.memo && <Row label="메모"><p className="whitespace-pre-wrap">{item.memo}</p></Row>}
              {/* 예약번호·예약 링크: 소유자에게만(F20) */}
              {item.secret && (item.secret.booking_no || (!lodging && item.secret.booking_link)) && (
                <Row label="예약">
                  <BookingInfo secret={item.secret} tone="dark" hideLink={lodging} />
                </Row>
              )}
              {!onMap && <Row label="위치"><span className="text-amber-300">위치 없음: 지도에 표시되지 않습니다. 주소를 넣어 다시 저장해 보세요.</span></Row>}
            </dl>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              {onMap && (
                <Link href={`/trips/${item.trip_id}?view=map&item=${item.id}`} className="rounded-full border border-white/25 px-3 py-1.5 transition hover:bg-white/15 active:scale-95">
                  지도에서 보기
                </Link>
              )}
              {!readOnly && (
                <span className="ml-auto flex gap-1">
                  <button type="button" onClick={() => dialogRef.current?.showModal()} className="rounded-full px-3 py-1.5 transition hover:bg-white/15 active:scale-95">
                    수정
                  </button>
                  <button type="button" onClick={onDelete} disabled={deleting} className="rounded-full px-3 py-1.5 text-rose-300 transition hover:bg-rose-500/20 active:scale-95 disabled:opacity-50">
                    {deleting ? "지우는 중…" : "삭제"}
                  </button>
                </span>
              )}
            </div>
            {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
          </div>
        </div>
      </div>

      {!readOnly && (
        <dialog
          ref={dialogRef}
          aria-label={`${item.name} 수정`}
          data-tone="dark"
          className={EDIT_DIALOG}
        >
          <EditHeader title="항목 수정" sub={item.name} onClose={() => dialogRef.current?.close()} closeLabel="수정 창 닫기" />
          <div className="max-h-[75vh] overflow-y-auto px-5 pb-5">
            <ItemForm
              key={item.updated_at}
              action={updateItem.bind(null, item.id, item.trip_id)}
              days={days}
              item={item}
              submitLabel="고치기"
              onSaved={() => dialogRef.current?.close()}
            />
          </div>
        </dialog>
      )}
    </article>
  );
}

// 장소 사진 출처 (C8 F22 결정 7, D안). 카드 앞면은 오른쪽 위 ⓘ 하나만 두고, 누르면 사진을 크게 보며 출처 전체를 보인다.
// Google 문서: 썸네일은 작가 표시를 뺄 수 있다(전체 출처가 있는 큰 사진을 볼 수 있으면). "Google Maps"는 사진과 같은 카드 안에 있어야 해서 앞면에 남긴다.
// Wikimedia(CC): 사진에서 한 번 눌러 작가·라이선스·파일 페이지가 나온다.
function PhotoInfo({ photo, name }: { photo: CardPhoto; name: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const link = "text-white underline underline-offset-2 hover:text-white/80";
  const brand = photo.source === "google" ? "Google Maps" : "Wikimedia Commons";

  // 바깥(배경)을 누르면 닫는다. 창 안을 누른 것은 닫지 않는다.
  function onBackdrop(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) dialogRef.current?.close();
  }

  return (
    <>
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        {photo.source === "google" && (
          <span translate="no" className="rounded-full bg-black/55 px-2 py-0.5 text-xs text-white backdrop-blur-md">
            Google Maps
          </span>
        )}
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          aria-label={`${name} 사진 크게 보기와 출처`}
          title="사진 출처"
          className="flex size-7 items-center justify-center rounded-full bg-black/55 font-serif text-sm text-white italic backdrop-blur-md transition hover:bg-black/75 active:scale-95"
        >
          i
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-label={`${name} 사진`}
        onClick={onBackdrop}
        className="m-auto w-[min(48rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/95 p-0 text-white shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- 외부 사진 주소를 그대로 쓴다(B49) */}
          <img src={photo.url} alt={`${name} 사진`} referrerPolicy="no-referrer" className="block max-h-[70vh] w-full object-contain" />
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="사진 닫기"
            className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md transition hover:bg-black/75 active:scale-90"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4 text-sm">
          <p className="font-semibold">{name}</p>
          <p className="mt-1 text-white/75">
            사진{" "}
            {photo.authors.length ? (
              photo.authors.map((a, i) => (
                <span key={i}>
                  {i > 0 && ", "}
                  {a.uri ? (
                    <a href={a.uri} target="_blank" rel="noopener noreferrer" className={link}>
                      {a.name}
                    </a>
                  ) : (
                    a.name
                  )}
                </span>
              ))
            ) : (
              "작가 미상"
            )}
            {photo.license && ` · ${photo.license}`}
            {" · "}
            {photo.link ? (
              <a href={photo.link} target="_blank" rel="noopener noreferrer" translate="no" className={`whitespace-nowrap ${link}`}>
                {brand}
              </a>
            ) : (
              <span translate="no" className="whitespace-nowrap">{brand}</span>
            )}
          </p>
        </div>
      </dialog>
    </>
  );
}
