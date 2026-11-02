"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createItem } from "@/app/actions/items";
import type { TripDay } from "@/lib/trips/days";
import { BUBBLE_IN, BUBBLE_OUT } from "./form-styles";
import { ItemForm } from "./item-form";
import { PasteExtract } from "./paste-extract";
import { Segmented } from "./segmented";

type Mode = "manual" | "paste";

const TABS: { value: Mode; label: string }[] = [
  { value: "paste", label: "붙여넣기" },
  { value: "manual", label: "직접 입력" },
];

// R-03: 평소에는 닫혀 있고 버튼을 누르면 열리는 채팅 모양 입력창.
// F10: 어두운 유리 패널(PC는 오른쪽에 떠 있는 카드, 모바일은 아래에서 올라오는 시트), 열릴 때 미끄러져 들어온다.
// 붙여넣기 추출(R-04)과 직접 입력(R-05)을 탭으로 고른다.
export function InputPanel({ tripId, days, defaultOpen = false }: { tripId: string; days: TripDay[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
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
        <>
          {/* 모바일: 뒤를 살짝 어둡게. 누르면 닫힌다. */}
          <div aria-hidden onClick={() => setOpen(false)} className="fixed inset-0 z-20 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 starting:opacity-0 md:hidden" />
          <section
            id={panelId}
            role="dialog"
            aria-label="입력창"
            data-tone="dark"
            className="fixed inset-x-0 bottom-0 z-20 flex h-[85vh] flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-zinc-950/85 text-white shadow-2xl shadow-black/50 backdrop-blur-2xl [color-scheme:dark] transition duration-300 ease-out starting:translate-y-8 starting:opacity-0 md:inset-y-4 md:right-4 md:left-auto md:h-auto md:w-[26rem] md:rounded-3xl md:starting:translate-x-8 md:starting:translate-y-0"
          >
            <header className="flex items-center justify-between gap-2 px-5 pt-5 pb-3">
              <Segmented label="입력 방식" size="sm" value={mode} options={TABS} onChange={(v) => setMode(v as Mode)} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="입력창 닫기"
                className="flex size-9 items-center justify-center rounded-full text-white/70 transition hover:rotate-90 hover:bg-white/10 hover:text-white active:scale-90"
              >
                ✕
              </button>
            </header>
            <div ref={bodyRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 pt-2 pb-5">
              <p className={BUBBLE_IN}>
                {mode === "manual"
                  ? "항목 하나를 직접 입력하세요. 주소를 비워 두면 이름과 여행 목적지로 위치를 찾습니다."
                  : "티켓, 예약 메일, 메모를 붙여넣으세요. 뽑은 항목은 미리보기에서 확인하고 저장합니다."}
              </p>
              {messages.map((m, i) => (
                <p key={i} role="status" className={`${BUBBLE_OUT} transition duration-300 starting:translate-y-2 starting:opacity-0`}>
                  ✓ {m}
                </p>
              ))}
              {mode === "manual" ? (
                <ItemForm action={createItem.bind(null, tripId)} days={days} submitLabel="저장" onSaved={onItemSaved} />
              ) : (
                <PasteExtract tripId={tripId} days={days} onSaved={onSaved} />
              )}
            </div>
          </section>
        </>
      )}
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={`fixed bottom-6 right-6 z-30 rounded-full bg-zinc-900 px-5 py-3 font-medium text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-zinc-700 hover:shadow-xl active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 [html[data-cover]_&]:bg-white [html[data-cover]_&]:text-zinc-900 [html[data-cover]_&]:shadow-black/40 [html[data-cover]_&]:hover:bg-white/90 ${open ? "max-md:hidden md:right-[28rem]" : ""}`}
      >
        {open ? "입력창 닫기" : "＋ 입력"}
      </button>
    </>
  );
}
