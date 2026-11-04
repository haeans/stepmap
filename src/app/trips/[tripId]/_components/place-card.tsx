"use client";

// 매거진 DAY 장소 카드 (F10). 사진이 들어간 카드를 누르면 서랍처럼 아래로 펼쳐지며
// 그 일정에 필요한 것(시간, 티켓·입장료와 예약 링크, 주소, 메모, 지도에서 보기)을 보여 준다. 수정·삭제도 여기서 한다.
// 지도로 가는 버튼은 카드 앞면(펼침 버튼 바로 위)에도 있다(C8 F16).
// 사진: 직접 넣은 사진(photoUrl) → 장소 사진(C8 F22: 관광지는 Wikimedia Commons 먼저, 그 밖은 Google Places) → 일차 색 그라데이션.
// 장소 사진은 출처(작가·라이선스, Google Maps)를 사진 위에 같이 보인다.

import Link from "next/link";
import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import { deleteItem, updateItem } from "@/app/actions/items";
import { formatCost, formatTime, GEOCODED_KINDS, ITEM_KIND_LABELS, type Item } from "@/lib/items/types";
import type { CardPhoto } from "@/lib/places/types";
import type { TripDay } from "@/lib/trips/days";
import { BookingInfo } from "./booking-info";
import { EDIT_DIALOG, EditHeader } from "./edit-sheet";
import { ItemForm } from "./item-form";
import { usePlacePhoto } from "./use-place-photo";

type Props = { item: Item; photoUrl?: string | null; color: string; days: TripDay[]; readOnly: boolean };

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-3 py-2">
      <dt className="text-xs text-white/55">{label}</dt>
      <dd className="min-w-0 text-sm break-words">{children}</dd>
    </div>
  );
}

export function PlaceCard({ item, photoUrl = null, color, days, readOnly }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const drawerId = useId();

  const cost = formatCost(item.cost_amount, item.cost_currency);
  const date = days.find((d) => d.day === item.day)?.date;
  const time = formatTime(item.time);
  const onMap = item.lat !== null;
  const { ref: photoRef, photo: placePhoto, onError: onPhotoError } = usePlacePhoto(item.trip_id, item.id, item.updated_at, !photoUrl && onMap && GEOCODED_KINDS.includes(item.kind));
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
            ) : (
              <div aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${color}aa, ${color}33 60%, transparent)` }} />
            )}
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
            {time && <span className="absolute top-3 left-3 rounded-full bg-black/45 px-2.5 py-1 font-mono text-xs backdrop-blur-md">{time}</span>}
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
        {!photoUrl && placePhoto && <PhotoCredit photo={placePhoto} />}
      </div>

      {/* 서랍: grid 행 높이 0fr → 1fr 로 부드럽게 열고 닫는다 */}
      <div
        id={drawerId}
        className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={`px-4 pt-1 pb-4 transition-opacity duration-300 ${open ? "opacity-100 delay-150" : "opacity-0"}`} inert={!open}>
            <dl className="divide-y divide-white/10">
              <Row label="시간">{[`DAY ${item.day}`, date, time || "시각 미정"].filter(Boolean).join(" · ")}</Row>
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
              {item.secret && (item.secret.booking_no || item.secret.booking_link) && (
                <Row label="예약">
                  <BookingInfo secret={item.secret} tone="dark" />
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

// 장소 사진 출처 (C8 F22). 사진과 같은 카드 안, 오른쪽 위.
// Google: 작가 이름(링크)과 "Google Maps"(번역하지 않음, 원본 사진 링크). Wikimedia: 작가 · 라이선스 · Wikimedia Commons(파일 페이지 링크).
function PhotoCredit({ photo }: { photo: CardPhoto }) {
  const link = "underline-offset-2 hover:underline";
  const brand = photo.source === "google" ? "Google Maps" : "Wikimedia Commons";
  return (
    <p className="absolute top-3 right-3 z-10 flex max-w-[65%] items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white backdrop-blur-md">
      <span className="truncate">
        사진{" "}
        {photo.authors.map((a, i) => (
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
        ))}
        {photo.license && ` · ${photo.license}`}
      </span>
      <span aria-hidden>·</span>
      {photo.link ? (
        <a href={photo.link} target="_blank" rel="noopener noreferrer" translate="no" className={`shrink-0 ${link}`}>
          {brand}
        </a>
      ) : (
        <span translate="no" className="shrink-0">
          {brand}
        </span>
      )}
    </p>
  );
}
