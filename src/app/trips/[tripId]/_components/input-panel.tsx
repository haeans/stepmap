"use client";

import { useEffect, useId, useRef, useState } from "react";

// R-03: 평소에는 닫혀 있고 버튼을 누르면 열리는 채팅 모양 입력창.
// 붙여넣기 추출은 v0.6(R-04), 직접 입력 저장은 v0.5(R-05)에서 연결한다.
export function InputPanel() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const wasOpen = useRef(false);

  // 열리면 입력칸으로, 닫히면 입력 버튼으로 포커스를 옮긴다.
  useEffect(() => {
    if (open) {
      textareaRef.current?.focus();
    } else if (wasOpen.current) {
      toggleRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {open && (
        <section
          id={panelId}
          role="dialog"
          aria-label="입력창"
          className="fixed inset-x-0 bottom-0 z-20 flex h-[70vh] flex-col border-t border-zinc-200 bg-white shadow-xl md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-96 md:border-l md:border-t-0 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="font-semibold">입력</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="입력창 닫기"
              className="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              ✕
            </button>
          </header>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <p className="max-w-[85%] self-start rounded-2xl rounded-tl-sm bg-zinc-100 px-4 py-2 text-sm dark:bg-zinc-900">
              티켓, 예약 메일, 메모를 붙여넣거나 일정을 직접 입력하세요.
            </p>
          </div>
          <form className="flex flex-col gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800" onSubmit={(e) => e.preventDefault()}>
            <textarea
              ref={textareaRef}
              name="text"
              rows={3}
              aria-label="붙여넣거나 입력할 내용"
              placeholder="여기에 붙여넣기"
              className="resize-none rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-zinc-500">보내기는 다음 단계에서 연결됩니다.</p>
              <button type="submit" disabled className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900">
                보내기
              </button>
            </div>
          </form>
        </section>
      )}
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={`fixed bottom-6 right-6 z-30 rounded-full bg-zinc-900 px-5 py-3 font-medium text-white shadow-lg hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 ${open ? "max-md:hidden md:right-[25.5rem]" : ""}`}
      >
        {open ? "입력창 닫기" : "＋ 입력"}
      </button>
    </>
  );
}
