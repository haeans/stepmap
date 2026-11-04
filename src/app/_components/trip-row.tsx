"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { deleteTrip, renameTrip, type ActionState } from "@/app/actions/trips";
import { authorLink, coverSrc, UNSPLASH_HOME } from "@/lib/cover/cover";
import { useCoverUpload } from "./cover-upload";
import { cardSubtitle } from "@/lib/trips/card-text";
import { PREVIEW_EMPTY_TEXT, type PreviewDay } from "@/lib/trips/preview";
import type { Trip } from "@/lib/trips/types";

const LONG_PRESS_MS = 500;
const CARD_BUTTON = "rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur-md hover:bg-white/25 disabled:opacity-50";
const MENU_ITEM = "w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/15 focus-visible:bg-white/15 focus-visible:outline-none disabled:opacity-50";

// 여행 카드 (F09). 작업 파일 leedaekeon578-f09-trip-cards 결정 1~5.
// shared: 공유받은 여행. "공유받음"을 표시하고 ⋯ 메뉴(대표 이미지·이름 수정·삭제)를 숨긴다. (R-08)
// 미리보기: PC는 마우스를 올리면 오른쪽 절반, 모바일은 길게 누르는 동안 카드 전체. 짧게 탭하면 여행으로 들어간다.
export function TripRow({ trip, shared, preview }: { trip: Trip; shared: boolean; preview: PreviewDay[] }) {
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const cover = useCoverUpload(trip.id, setDeleteError);
  const [deleting, startDelete] = useTransition();
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (prev, form) => {
      const result = await renameTrip(trip.id, prev, form);
      if (!result.error) setEditing(false);
      return result;
    },
    { error: null },
  );

  const [pressed, setPressed] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    longPressed.current = false;
    if (e.pointerType === "mouse") return;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      setPressed(true);
    }, LONG_PRESS_MS);
  }

  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
    setPressed(false);
  }

  // 길게 누른 뒤 손을 떼면 미리보기만 닫고 여행으로 이동하지 않는다.
  function onClick(e: React.MouseEvent) {
    if (longPressed.current) e.preventDefault();
  }

  // 길게 누를 때 휴대폰 메뉴(링크 열기·복사)를 막는다. PC 오른쪽 클릭 메뉴는 그대로 둔다.
  function onContextMenu(e: React.MouseEvent) {
    if (pressTimer.current || longPressed.current) e.preventDefault();
  }

  function onDelete() {
    if (!window.confirm(`"${trip.title}" 여행을 지울까요? 지운 여행은 되돌릴 수 없습니다.`)) return;
    startDelete(async () => {
      const result = await deleteTrip(trip.id);
      setDeleteError(result.error);
    });
  }

  const subtitle = cardSubtitle(trip);

  return (
    <li className="flex flex-col gap-2">
      <div className="group relative h-[190px] overflow-hidden rounded-[1.75rem] bg-linear-to-br from-zinc-600 via-zinc-800 to-zinc-950 text-white shadow-md transition duration-300 select-none hover:-translate-y-0.5 hover:shadow-xl md:h-[280px]">
        {/* 대표 이미지 (F08). 없으면 어두운 기본 카드. Next.js 이미지 최적화 대신 주소 파라미터로 크기를 줄인다(결정 3). */}
        {trip.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverSrc(trip.cover_url, 1200)}
            alt=""
            draggable={false}
            loading="lazy"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            style={trip.cover_color ? { backgroundColor: trip.cover_color } : undefined}
          />
        )}

        {!editing && (
          <Link
            href={`/trips/${trip.id}`}
            aria-label={trip.title}
            draggable={false}
            onPointerDown={onPointerDown}
            onPointerUp={endPress}
            onPointerCancel={endPress}
            onPointerLeave={endPress}
            onClick={onClick}
            onContextMenu={onContextMenu}
            className="absolute inset-0 rounded-[1.75rem] [-webkit-touch-callout:none] focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:outline-none focus-visible:ring-inset"
          />
        )}

        {/* 글씨가 보이게 카드 아래쪽만 어둡게 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/70 to-transparent" />

        {editing ? (
          <form action={action} className="absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center gap-2 p-5">
            <input
              name="title"
              defaultValue={trip.title}
              required
              maxLength={100}
              autoFocus
              aria-label="여행 이름"
              className="min-w-0 flex-1 rounded-full bg-white/90 px-4 py-1.5 text-zinc-900"
            />
            <button type="submit" disabled={pending} className={CARD_BUTTON}>
              저장
            </button>
            <button type="button" onClick={() => setEditing(false)} className={CARD_BUTTON}>
              취소
            </button>
          </form>
        ) : (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5">
            <h3 className="text-2xl break-words md:text-[2rem]">{trip.title}</h3>
            {subtitle && <p className="text-sm text-white/80">{subtitle}</p>}
          </div>
        )}

        {/* 미리보기: DAY마다 첫 관광지(없으면 첫 일정) 하나, 더 있으면 가운데 점 "•••" (C9 F24). PC는 오른쪽 2/5. ⋯ 메뉴가 열려 있으면 숨긴다. */}
        {!editing && !menuOpen && (
          <div
            className={`pointer-events-none absolute z-10 flex-col gap-2 overflow-hidden bg-black/70 p-5 pt-14 text-sm backdrop-blur-md ${
              pressed ? "inset-0 flex" : "inset-y-0 right-0 hidden w-2/5 group-hover:flex"
            }`}
          >
            <p className="text-xs font-semibold tracking-wider text-white/60">미리보기</p>
            {preview.length === 0 ? (
              <p className="text-white/80">{PREVIEW_EMPTY_TEXT}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {preview.map((d) => (
                  <li key={d.day} className="flex min-w-0 items-center">
                    <span className="mr-2 shrink-0 font-semibold">DAY {d.day}</span>
                    <span className="truncate">{d.name}</span>
                    {/* 이름이 길어 잘려도 점은 보이게 따로 둔다 */}
                    {d.more && <span aria-hidden className="ml-1.5 shrink-0 text-[0.6rem] tracking-[0.15em] text-white/60">•••</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {shared && (
          <span className="pointer-events-none absolute top-4 left-4 z-20 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur-md">
            공유받음
          </span>
        )}
        {/* Unsplash 작가 표시 (결정 4) */}
        {trip.cover_source === "unsplash" && trip.cover_author_name && !editing && (
          <p className="absolute right-3 bottom-1.5 z-20 text-[10px] text-white/70">
            Photo by{" "}
            {trip.cover_author_url ? (
              <a href={authorLink(trip.cover_author_url)} target="_blank" rel="noopener noreferrer" className="underline">
                {trip.cover_author_name}
              </a>
            ) : (
              trip.cover_author_name
            )}{" "}
            on{" "}
            <a href={UNSPLASH_HOME} target="_blank" rel="noopener noreferrer" className="underline">
              Unsplash
            </a>
          </p>
        )}

        {!shared && !editing && (
          <TripMenu
            title={trip.title}
            open={menuOpen}
            setOpen={setMenuOpen}
            busy={cover.pending ? "올리는 중…" : deleting ? "지우는 중…" : null}
            onCover={cover.pick}
            onRename={() => setEditing(true)}
            onDelete={onDelete}
          />
        )}
        {!shared && cover.input}
      </div>
      {(state.error || deleteError) && <p className="text-sm text-red-600">{state.error ?? deleteError}</p>}
    </li>
  );
}

// 카드 오른쪽 위 반투명 ⋯ 버튼과 메뉴 (C9 F24, B53 고침). 대표 이미지 바꾸기 → 이름 수정 → 삭제.
// 지도 메뉴(MapMenu)처럼 바깥을 누르거나 Esc로 닫는다. 열면 첫 항목에, Esc로 닫으면 ⋯ 버튼에 포커스.
// 카드 링크와 겹치지 않는 형제 요소라 메뉴를 눌러도 여행으로 들어가지 않는다.
function TripMenu({ title, open, setOpen, busy, onCover, onRename, onDelete }: {
  title: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  busy: string | null;
  onCover: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    root?.querySelector<HTMLButtonElement>("[data-menu-item]")?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!root?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  // 항목을 고르면 메뉴를 닫고 그 일을 한다.
  const choose = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <div ref={rootRef} className="absolute top-4 right-4 z-30">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        disabled={busy !== null}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${title} 메뉴`}
        className={busy ? CARD_BUTTON : `${CARD_BUTTON} flex size-9 items-center justify-center p-0 text-lg leading-none`}
      >
        {busy ?? <span aria-hidden>⋯</span>}
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute top-11 right-0 flex w-44 flex-col gap-0.5 rounded-2xl bg-black/60 p-1.5 text-white shadow-xl ring-1 ring-white/20 backdrop-blur-xl transition duration-200 starting:-translate-y-1 starting:opacity-0"
        >
          <button type="button" data-menu-item onClick={choose(onCover)} className={MENU_ITEM}>
            대표 이미지 바꾸기
          </button>
          <button type="button" data-menu-item onClick={choose(onRename)} className={MENU_ITEM}>
            이름 수정
          </button>
          <button type="button" data-menu-item onClick={choose(onDelete)} className={`${MENU_ITEM} text-red-300`}>
            삭제
          </button>
        </div>
      )}
    </div>
  );
}
