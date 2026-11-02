"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createItem } from "@/app/actions/items";
import type { TripDay } from "@/lib/trips/days";
import { ItemForm } from "./item-form";
import { PasteExtract } from "./paste-extract";

type Mode = "manual" | "paste";

const TABS: { mode: Mode; label: string }[] = [
  { mode: "paste", label: "붙여넣기" },
  { mode: "manual", label: "직접 입력" },
];

// R-03: 평소에는 닫혀 있고 버튼을 누르면 열리는 채팅 모양 입력창.
// 붙여넣기 추출(R-04)과 직접 입력(R-05)을 탭으로 고른다.
export function InputPanel({ tripId, days }: { tripId: string; days: TripDay[] }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("manual");
  const [messages, setMessages] = useState<string[]>([]);
  const panelId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // 열리면 첫 입력칸으로, 닫히면 입력 버튼으로 포커스를 옮긴다.
  useEffect(() => {
    if (open) {
      bodyRef.current?.querySelector<HTMLElement>("textarea, input[name=name]")?.focus();
    } else if (wasOpen.current) {
      toggleRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const onItemSaved = useCallback((name: string) => {
    setMessages((m) => [...m, `"${name}" 항목을 저장했습니다.`]);
  }, []);
  const onSaved = useCallback((message: string) => {
    setMessages((m) => [...m, message]);
  }, []);

  return (
    <>
      {open && (
        <section
          id={panelId}
          role="dialog"
          aria-label="입력창"
          className="fixed inset-x-0 bottom-0 z-20 flex h-[80vh] flex-col border-t border-zinc-200 bg-white shadow-xl md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-96 md:border-l md:border-t-0 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <header className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div role="tablist" aria-label="입력 방식" className="flex gap-1 rounded-md bg-zinc-100 p-1 text-sm dark:bg-zinc-900">
              {TABS.map((tab) => (
                <button
                  key={tab.mode}
                  type="button"
                  role="tab"
                  aria-selected={mode === tab.mode}
                  onClick={() => setMode(tab.mode)}
                  className={`rounded px-3 py-1 ${mode === tab.mode ? "bg-white font-medium shadow-sm dark:bg-zinc-700" : "text-zinc-600 dark:text-zinc-400"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="입력창 닫기"
              className="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              ✕
            </button>
          </header>
          <div ref={bodyRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <p className="max-w-[85%] self-start rounded-2xl rounded-tl-sm bg-zinc-100 px-4 py-2 text-sm dark:bg-zinc-900">
              {mode === "manual"
                ? "항목 하나를 직접 입력하세요. 주소를 비워 두면 이름과 여행 목적지로 위치를 찾습니다."
                : "티켓, 예약 메일, 메모를 붙여넣으세요. 뽑은 항목은 미리보기에서 확인하고 저장합니다."}
            </p>
            {messages.map((m, i) => (
              <p key={i} role="status" className="max-w-[85%] self-end rounded-2xl rounded-tr-sm bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
                {m}
              </p>
            ))}
            {mode === "manual" ? (
              <ItemForm action={createItem.bind(null, tripId)} days={days} submitLabel="저장" onSaved={onItemSaved} />
            ) : (
              <PasteExtract tripId={tripId} days={days} onSaved={onSaved} />
            )}
          </div>
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
