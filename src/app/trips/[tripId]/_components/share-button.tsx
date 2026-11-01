"use client";

import { useRef, useState, useTransition } from "react";
import { getOrCreateShareLink } from "@/app/actions/share";

// 공유 창 (R-08). 소유자에게만 보인다. 링크를 만들거나 있던 링크를 보여 주고 복사한다.
export function ShareButton({ tripId }: { tripId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, startLoading] = useTransition();

  function open() {
    setCopied(false);
    dialogRef.current?.showModal();
    if (url) return;
    startLoading(async () => {
      const result = await getOrCreateShareLink(tripId);
      setError(result.error);
      if (result.token) setUrl(`${window.location.origin}/share/${result.token}`);
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("복사하지 못했습니다. 링크를 직접 선택해 복사해 주세요.");
    }
  }

  return (
    <>
      <button type="button" onClick={open} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
        공유
      </button>
      <dialog
        ref={dialogRef}
        aria-label="공유"
        className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-lg p-0 backdrop:bg-black/40 dark:bg-zinc-950 dark:text-zinc-100"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="font-semibold">공유 링크</h2>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="공유 창 닫기" className="rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-3 p-4 text-sm">
          <p>이 링크를 받은 사람은 자기 구글 계정으로 로그인한 뒤 이 여행을 볼 수 있습니다. 고칠 수는 없습니다.</p>
          <p className="rounded-md bg-amber-50 p-3 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            링크를 아는 구글 사용자는 누구나 볼 수 있습니다. 지금은 공유를 취소하거나 링크를 바꿀 수 없으니, 보여 줄 사람에게만 보내 주세요.
          </p>
          {loading && <p className="text-zinc-500">링크를 준비하고 있습니다…</p>}
          {url && (
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                aria-label="공유 링크"
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button type="button" onClick={copy} className="shrink-0 rounded-md bg-zinc-900 px-3 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
                {copied ? "복사됨" : "복사"}
              </button>
            </div>
          )}
          {error && <p className="text-red-600">{error}</p>}
        </div>
      </dialog>
    </>
  );
}
