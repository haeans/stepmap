"use client";

// C9 F28: 매거진 DAY 안의 "미리보기" 카드. 붙여넣기로 뽑았지만 아직 저장하지 않은 항목이다.
// 모양은 F18 추천 카드와 같은 계열(점선 테두리, 흐리게)이고, 사진도 저장된 장소 카드처럼 보인다.
// 사진 상태를 글로 보여 사용자가 판단하게 한다: 찾는 중 / 사진 있음(출처) / "사진 없음" / "지도에서 찾지 못함". 교통은 로고.
// [빼기][넣기]는 사진 오른쪽 위에 늘 보이고, 누르면 서랍이 열려 자세한 내용과 [고치기]가 나온다. ([hyunw0000-f28-magazine-preview] 결정 1·4·5)

import { useActionState, useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { saveExtractedItems } from "@/app/actions/extract";
import { itemsForm } from "@/lib/items/save-form";
import { formatCost, ITEM_KIND_LABELS } from "@/lib/items/types";
import { parseItemForm, type ItemInput } from "@/lib/items/validation";
import { hasPreviewPhoto, previewPhotoPath, type PreviewPhotoResponse } from "@/lib/places/preview-photo";
import type { TripDay } from "@/lib/trips/days";
import { EDIT_DIALOG, EditHeader } from "./edit-sheet";
import { PRIMARY } from "./form-styles";
import { LogoPhoto } from "./hub-card";
import { ItemFields } from "./item-fields";
import { PhotoInfo } from "./place-card";
import { removePreviews, updatePreview, type PendingPreview } from "./previews";

type Props = { tripId: string; preview: PendingPreview; color: string; days: TripDay[] };

// none: 사진을 찾지 않는 종류(교통·메모), loading: 찾는 중, done: 응답, error: 부르지 못함
type PhotoState = { status: "none" } | { status: "loading" } | { status: "done"; result: PreviewPhotoResponse } | { status: "error" };

// 카드가 화면 가까이 오면 한 번 부른다. 이름·종류가 바뀌면(고치기) 다시 부른다.
function usePreviewPhoto(tripId: string, item: ItemInput) {
  const ref = useRef<HTMLElement>(null);
  const enabled = hasPreviewPhoto(item.kind) && item.name.trim() !== "";
  const path = enabled ? previewPhotoPath(tripId, item.kind, item.name) : null;
  const [state, setState] = useState<{ path: string; value: PhotoState } | null>(null);
  const retried = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!path || !el) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        setState({ path, value: { status: "loading" } });
        fetch(path)
          .then(async (res) => (res.ok ? ((await res.json()) as PreviewPhotoResponse) : null))
          .then((result) => {
            if (!cancelled) setState({ path, value: result ? { status: "done", result } : { status: "error" } });
          })
          .catch(() => {
            if (!cancelled) setState({ path, value: { status: "error" } });
          });
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [path]);

  // Google 사진 주소는 만료될 수 있다. 그림이 깨지면 캐시를 건너뛰고 한 번만 다시 받는다(F22와 같음).
  function onImageError() {
    if (!path || retried.current) return setState(path ? { path, value: { status: "error" } } : null);
    retried.current = true;
    fetch(path, { cache: "reload" })
      .then(async (res) => (res.ok ? ((await res.json()) as PreviewPhotoResponse) : null))
      .then((result) => setState({ path, value: result ? { status: "done", result } : { status: "error" } }))
      .catch(() => setState({ path, value: { status: "error" } }));
  }

  const value: PhotoState = !path ? { status: "none" } : state?.path === path ? state.value : { status: "loading" };
  return { ref, state: value, onImageError };
}

function photoNote(state: PhotoState, kind: ItemInput["kind"]): string | null {
  if (state.status === "none") return kind === "transport" ? "교통은 로고로 보여요" : null;
  if (state.status === "loading") return "사진 찾는 중…";
  if (state.status === "error") return "사진을 불러오지 못했어요";
  if (!state.result.found) return "지도에서 찾지 못함 · 이름을 확인해 주세요";
  return state.result.photo ? null : "사진 없음";
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-3 py-2">
      <dt className="text-xs text-white/55">{label}</dt>
      <dd className="min-w-0 text-sm break-words">{children}</dd>
    </div>
  );
}

export function PreviewCard({ tripId, preview, color, days }: Props) {
  const { item } = preview;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const drawerId = useId();
  const { ref, state, onImageError } = usePreviewPhoto(tripId, item);

  const photo = state.status === "done" ? state.result.photo : null;
  const note = photoNote(state, item.kind);
  const notFound = state.status === "done" && !state.result.found;
  const cost = formatCost(item.costAmount, item.costCurrency);
  const date = days.find((d) => d.day === item.day)?.date;

  function onAccept() {
    startSave(async () => {
      const result = await saveExtractedItems(tripId, { error: null, saved: null }, itemsForm([item]));
      if (result.error) setError(result.error);
      else removePreviews(tripId, [preview.id]);
    });
  }

  // 고치기: DB에 저장하지 않고 미리보기 값만 바꾼다(예약 칸 F20도 폼에 있어 함께 바뀐다).
  async function onEdit(_prev: string | null, form: FormData): Promise<string | null> {
    const parsed = parseItemForm(form);
    if (!parsed.ok) return parsed.error;
    updatePreview(tripId, preview.id, parsed.value);
    dialogRef.current?.close();
    return null;
  }
  const [editError, editAction, editing] = useActionState(onEdit, null);

  return (
    <article
      ref={ref}
      aria-label={`미리보기 일정: ${item.name}`}
      className={`overflow-hidden rounded-2xl border border-dashed bg-white/[0.05] text-white shadow-lg shadow-black/20 backdrop-blur-xl transition duration-300 ease-out motion-reduce:transition-none ${
        open ? "border-sky-200/60 opacity-100" : "border-sky-200/40 opacity-80 hover:-translate-y-1 hover:opacity-95 motion-reduce:hover:translate-y-0"
      }`}
    >
      <div className="relative">
        <button type="button" aria-expanded={open} aria-controls={drawerId} onClick={() => setOpen((v) => !v)} className="group block w-full text-left">
          <div className="relative h-36 overflow-hidden sm:h-40">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- 외부 사진 주소를 그대로 쓴다(B49)
              <img src={photo.url} alt={`${item.name} 사진`} loading="lazy" referrerPolicy="no-referrer" onError={onImageError} className="absolute inset-0 size-full object-cover" />
            ) : item.kind === "transport" ? (
              <LogoPhoto />
            ) : (
              <div
                aria-hidden
                className={`absolute inset-0 ${state.status === "loading" ? "animate-pulse" : ""}`}
                style={{ background: `linear-gradient(135deg, ${color}66, ${color}22 60%, transparent)` }}
              />
            )}
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
            {item.time && <span className="absolute top-3 left-3 rounded-full bg-black/45 px-2.5 py-1 font-mono text-xs backdrop-blur-md">{item.time}</span>}
            <span className={`absolute left-3 rounded-full bg-sky-200/90 px-2.5 py-1 text-xs font-semibold text-zinc-900 ${item.time ? "top-11" : "top-3"}`}>미리보기</span>
            {note && (
              <span
                className={`absolute right-3 bottom-[3.25rem] max-w-[70%] truncate rounded-full px-2.5 py-1 text-xs backdrop-blur-md ${
                  notFound ? "bg-rose-500/80 text-white" : "bg-black/55 text-white/85"
                }`}
              >
                {note}
              </span>
            )}
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
        {/* 빼기·넣기는 서랍을 열지 않아도 사진 오른쪽 위에 늘 보인다. 사진 출처(ⓘ)는 그 아래로 내린다. */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => removePreviews(tripId, [preview.id])}
            disabled={saving}
            aria-label={`${item.name} 미리보기 빼기`}
            className="rounded-full bg-black/55 px-3 py-1.5 font-semibold text-rose-200 backdrop-blur-md transition hover:bg-rose-500/70 hover:text-white active:scale-95 disabled:opacity-50"
          >
            빼기
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={saving}
            aria-label={`${item.name} 일정에 넣기`}
            className="rounded-full bg-white px-3 py-1.5 font-semibold text-zinc-900 shadow transition hover:bg-white/85 active:scale-95 disabled:opacity-50"
          >
            {saving ? "넣는 중…" : "넣기"}
          </button>
        </div>
        {photo && (
          <div className="absolute inset-x-0 top-8">
            <PhotoInfo photo={photo} name={item.name} />
          </div>
        )}
      </div>
      {error && <p className="px-4 pt-2 text-xs text-rose-300">{error}</p>}

      {/* 서랍 */}
      <div
        id={drawerId}
        className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={`px-4 pt-1 pb-4 transition-opacity duration-300 ${open ? "opacity-100 delay-150" : "opacity-0"}`} inert={!open}>
            <dl className="divide-y divide-white/10">
              <Row label="시간">
                {`DAY ${item.day}`}
                {date && ` · ${date}`}
                {" · "}
                {item.time || "시각 미정"}
              </Row>
              {cost && <Row label="비용">{cost}</Row>}
              {item.address && <Row label="주소">{item.address}</Row>}
              {item.booking?.no && <Row label="예약번호">저장하면 나만 볼 수 있게 저장돼요</Row>}
              {item.memo && (
                <Row label="메모">
                  <p className="whitespace-pre-wrap">{item.memo}</p>
                </Row>
              )}
            </dl>
            <p className="mt-2 text-xs text-white/55">아직 저장 전이에요. &ldquo;넣기&rdquo;를 눌러야 일정에 들어가요.</p>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-1 text-sm">
              <button type="button" onClick={() => dialogRef.current?.showModal()} disabled={saving} className="rounded-full px-3 py-1.5 transition hover:bg-white/15 active:scale-95 disabled:opacity-50">
                고치기
              </button>
            </div>
          </div>
        </div>
      </div>

      <dialog ref={dialogRef} aria-label={`${item.name} 미리보기 고치기`} data-tone="dark" className={EDIT_DIALOG}>
        <EditHeader title="미리보기 고치기" sub="저장 전 값만 바꿉니다" onClose={() => dialogRef.current?.close()} closeLabel="고치기 창 닫기" />
        <div className="max-h-[75vh] overflow-y-auto px-5 pb-5">
          <form key={JSON.stringify(item)} action={editAction} className="flex flex-col gap-4">
            <ItemFields days={days} values={item} />
            {editError && <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-500">{editError}</p>}
            <button type="submit" disabled={editing} className={`${PRIMARY} mt-1`}>
              고치기
            </button>
          </form>
        </div>
      </dialog>
    </article>
  );
}
