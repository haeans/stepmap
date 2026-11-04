"use client";

// C9 F28: 매거진 DAY BY DAY 제목 아래 미리보기 줄. 저장 전 미리보기 개수와 [모두 빼기][모두 저장].
// 입력창의 "매거진에서 보기"(SHOW_PREVIEWS_EVENT)나 주소의 #m-previews로 오면 이 줄로 스크롤한다. ([hyunw0000-f28-magazine-preview] 결정 3)

import { useEffect, useRef, useState, useTransition } from "react";
import { saveExtractedItems } from "@/app/actions/extract";
import { itemsForm } from "@/lib/items/save-form";
import { PREVIEWS_ANCHOR, removePreviews, SHOW_PREVIEWS_EVENT, type PendingPreview } from "./previews";

export function PreviewBar({ tripId, previews }: { tripId: string; previews: PendingPreview[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const days = [...new Set(previews.map((p) => p.item.day))].sort((a, b) => a - b);

  useEffect(() => {
    const scroll = () => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (window.location.hash === `#${PREVIEWS_ANCHOR}`) scroll();
    window.addEventListener(SHOW_PREVIEWS_EVENT, scroll);
    return () => window.removeEventListener(SHOW_PREVIEWS_EVENT, scroll);
  }, []);

  function onSaveAll() {
    startSave(async () => {
      const result = await saveExtractedItems(tripId, { error: null, saved: null }, itemsForm(previews.map((p) => p.item)));
      setError(result.error);
      if (!result.error) removePreviews(tripId, previews.map((p) => p.id));
    });
  }

  function onRemoveAll() {
    if (!window.confirm(`미리보기 ${previews.length}개를 저장하지 않고 뺄까요?`)) return;
    removePreviews(tripId, previews.map((p) => p.id));
  }

  if (previews.length === 0) return null;
  return (
    <div
      ref={ref}
      id={PREVIEWS_ANCHOR}
      role="region"
      aria-label="붙여넣기 미리보기"
      className="flex scroll-mt-24 flex-col gap-3 rounded-2xl border border-dashed border-sky-200/50 bg-sky-200/[0.08] p-4 text-white shadow-lg shadow-black/20 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p className="font-semibold">
          <span className="mr-2 rounded-full bg-sky-200/90 px-2.5 py-0.5 text-xs text-zinc-900">미리보기</span>
          붙여넣은 일정 {previews.length}개 · {days.map((d) => `DAY ${d}`).join(", ")}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-white/65">
          아직 저장 전이에요. 사진과 &ldquo;지도에서 찾지 못함&rdquo; 표시를 보고 고치거나 빼 주세요. 카드마다 넣거나 한꺼번에 저장할 수 있어요.
        </p>
        {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1 text-sm">
        <button type="button" onClick={onRemoveAll} disabled={saving} className="rounded-full px-3 py-1.5 text-rose-300 transition hover:bg-rose-500/20 active:scale-95 disabled:opacity-50">
          모두 빼기
        </button>
        <button type="button" onClick={onSaveAll} disabled={saving} className="rounded-full bg-white px-4 py-1.5 font-semibold text-zinc-900 transition hover:bg-white/85 active:scale-95 disabled:opacity-50">
          {saving ? "저장 중…" : "모두 저장"}
        </button>
      </div>
    </div>
  );
}
