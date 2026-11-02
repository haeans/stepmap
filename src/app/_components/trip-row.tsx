"use client";

import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
import { deleteTrip, renameTrip, type ActionState } from "@/app/actions/trips";
import { cardSubtitle } from "@/lib/trips/card-text";
import { PREVIEW_EMPTY_TEXT, type PreviewDay } from "@/lib/trips/preview";
import type { Trip } from "@/lib/trips/types";

const LONG_PRESS_MS = 500;
const CARD_BUTTON = "rounded-full bg-black/40 px-3 py-1.5 text-xs text-white backdrop-blur-sm hover:bg-black/60 disabled:opacity-50";

// 여행 카드 (F09). 작업 파일 leedaekeon578-f09-trip-cards 결정 1~5.
// shared: 공유받은 여행. "공유받음"을 표시하고 이름 수정·삭제 버튼을 숨긴다. (R-08)
// 미리보기: PC는 마우스를 올리면 오른쪽 절반, 모바일은 길게 누르는 동안 카드 전체. 짧게 탭하면 여행으로 들어간다.
export function TripRow({ trip, shared, preview }: { trip: Trip; shared: boolean; preview: PreviewDay[] }) {
  const [editing, setEditing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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
      <div className="group relative h-[190px] overflow-hidden rounded-3xl bg-linear-to-br from-zinc-700 to-zinc-900 text-white select-none md:h-[280px]">
        {/* 대표 이미지 자리 (F08). 이미지가 생기면 여기에 absolute inset-0, object-cover로 꽉 차게 넣는다. */}

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
            className="absolute inset-0 rounded-3xl [-webkit-touch-callout:none] focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:outline-none focus-visible:ring-inset"
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
              className="min-w-0 flex-1 rounded-md bg-white/90 px-3 py-1.5 text-zinc-900"
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
            <h3 className="text-2xl font-semibold break-words md:text-3xl">{trip.title}</h3>
            {subtitle && <p className="text-sm text-white/80">{subtitle}</p>}
          </div>
        )}

        {!editing && (
          <div
            className={`pointer-events-none absolute z-10 flex-col gap-2 overflow-hidden bg-black/75 p-5 pt-14 text-sm ${
              pressed ? "inset-0 flex" : "inset-y-0 right-0 hidden w-1/2 group-hover:flex"
            }`}
          >
            <p className="text-xs font-semibold tracking-wider text-white/60">미리보기</p>
            {preview.length === 0 ? (
              <p className="text-white/80">{PREVIEW_EMPTY_TEXT}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {preview.map((d) => (
                  <li key={d.day} className="truncate">
                    <span className="mr-2 font-semibold">DAY {d.day}</span>
                    {d.places.join(" · ")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {shared && (
          <span className="pointer-events-none absolute top-4 left-4 z-20 rounded-full bg-black/40 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
            공유받음
          </span>
        )}
        {!shared && !editing && (
          <div className="absolute top-4 right-4 z-20 flex gap-1.5">
            <button type="button" onClick={() => setEditing(true)} className={CARD_BUTTON}>
              이름 수정
            </button>
            <button type="button" onClick={onDelete} disabled={deleting} className={CARD_BUTTON}>
              {deleting ? "지우는 중…" : "삭제"}
            </button>
          </div>
        )}
      </div>
      {(state.error || deleteError) && <p className="text-sm text-red-600">{state.error ?? deleteError}</p>}
    </li>
  );
}
