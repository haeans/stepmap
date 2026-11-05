"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createItem } from "@/app/actions/items";
import type { TripDay } from "@/lib/trips/days";
import { BUBBLE_IN, BUBBLE_OUT } from "./form-styles";
import { ItemForm } from "./item-form";
import { PasteExtract } from "./paste-extract";
import { PawIcon } from "./paw-icon";
import { SHOW_PREVIEWS_EVENT } from "./previews";

// R-03: 평소에는 닫혀 있고 버튼을 누르면 열리는 채팅 모양 입력창.
// F17: 밝은 한지 톤 패널(PC는 오른쪽에 떠 있는 카드, 모바일은 아래에서 올라오는 시트), 곰발바닥 버튼으로 연다.
// "일정 넣기" 제목 아래 탭 두 개(왼쪽 "붙여넣기" R-04, 오른쪽 "직접 입력" R-05)로 고르고, 고른 탭의 화면만 보인다.
// 탭마다 안내·저장 알림·쓰던 내용을 따로 갖는다. 다른 탭으로 가거나 창을 닫아도 지우지 않고 숨겨 두어 돌아오면 남아 있다.
type Tab = "paste" | "manual";

const TABS: { value: Tab; label: string }[] = [
  { value: "paste", label: "붙여넣기" },
  { value: "manual", label: "직접 입력" },
];

export function InputPanel({ tripId, days, defaultOpen = false }: { tripId: string; days: TripDay[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState<Tab>("paste");
  const panelId = useId();
  const tabsId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // 열리면(또는 탭을 바꾸면) 고른 탭의 첫 입력칸으로, 닫히면 곰발바닥 버튼으로 포커스를 옮긴다.
  useEffect(() => {
    if (open) {
      // F19: 붙여넣기 탭은 대화 아래의 입력칸(data-autofocus)으로. 미리보기 안의 칸으로 가지 않게 먼저 찾는다.
      const panel = panelRef.current;
      (
        panel?.querySelector<HTMLElement>(`[data-tab="${tab}"] [data-autofocus]`) ??
        panel?.querySelector<HTMLElement>(`[data-tab="${tab}"] :is(textarea, input:not([type=hidden]):not([type=radio]))`)
      )?.focus();
    } else if (wasOpen.current) {
      toggleRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open, tab]);

  // C9 F28: 붙여넣기 결과의 "매거진에서 보기"를 누르면 닫아 매거진 미리보기가 보이게 한다.
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener(SHOW_PREVIEWS_EVENT, close);
    return () => window.removeEventListener(SHOW_PREVIEWS_EVENT, close);
  }, []);

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
        // 모바일: 뒤를 살짝 어둡게. 누르면 닫힌다.
        <div aria-hidden onClick={() => setOpen(false)} className="fixed inset-0 z-20 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 starting:opacity-0 md:hidden" />
      )}
      <section
        ref={panelRef}
        id={panelId}
        hidden={!open}
        role="dialog"
        aria-label="입력창"
        className="fixed inset-x-0 bottom-0 z-20 flex h-[85vh] flex-col overflow-hidden rounded-t-3xl border border-line bg-surface/95 text-foreground shadow-2xl shadow-black/25 backdrop-blur-2xl transition duration-300 ease-out starting:translate-y-8 starting:opacity-0 md:inset-y-4 md:right-4 md:left-auto md:h-auto md:w-[26rem] md:rounded-3xl md:starting:translate-x-8 md:starting:translate-y-0"
      >
        <header className="flex items-center justify-between gap-2 px-5 pt-5 pb-3">
          <h2 className="text-xl font-bold tracking-tight">일정 넣기</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="입력창 닫기"
            className="flex size-9 items-center justify-center rounded-full text-muted transition hover:rotate-90 hover:bg-foreground/5 hover:text-foreground active:scale-90"
          >
            ✕
          </button>
        </header>
        <div role="tablist" aria-label="입력 방식" className="relative mx-5 grid grid-cols-2 rounded-full bg-foreground/[0.06] p-1 ring-1 ring-line">
          {/* 고른 탭 뒤로 알약이 미끄러져 간다. */}
          <span
            aria-hidden
            className={`absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-zinc-900 shadow-md transition-transform duration-300 ease-out motion-reduce:transition-none dark:bg-white ${tab === "manual" ? "translate-x-full" : ""}`}
          />
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              id={`${tabsId}-${t.value}`}
              aria-selected={tab === t.value}
              aria-controls={`${tabsId}-${t.value}-panel`}
              onClick={() => setTab(t.value)}
              className={`relative z-10 rounded-full py-2 text-sm transition-colors duration-300 active:scale-95 ${tab === t.value ? "font-semibold text-white dark:text-zinc-900" : "text-muted hover:text-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto px-5 pt-4 pb-5">
          <div role="tabpanel" id={`${tabsId}-paste-panel`} aria-labelledby={`${tabsId}-paste`} data-tab="paste" hidden={tab !== "paste"}>
            <PasteSection tripId={tripId} days={days} />
          </div>
          <div role="tabpanel" id={`${tabsId}-manual-panel`} aria-labelledby={`${tabsId}-manual`} data-tab="manual" hidden={tab !== "manual"}>
            <ManualSection tripId={tripId} days={days} />
          </div>
        </div>
      </section>

      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "입력창 닫기" : "입력창 열기"}
        aria-expanded={open}
        aria-controls={panelId}
        className={`fixed right-6 bottom-6 z-30 flex size-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-zinc-700 hover:shadow-xl active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 [html[data-cover]_&]:bg-white [html[data-cover]_&]:text-zinc-900 [html[data-cover]_&]:shadow-black/40 [html[data-cover]_&]:hover:bg-white/90 ${open ? "max-md:hidden md:right-[28rem]" : ""}`}
      >
        <PawIcon className={`size-7 transition duration-300 ${open ? "-rotate-12" : ""}`} />
      </button>
    </>
  );
}

// 저장 알림 목록을 칸마다 따로 갖는다.
function useMessages() {
  const [messages, setMessages] = useState<string[]>([]);
  const push = useCallback((m: string) => setMessages((list) => [...list, m]), []);
  return [messages, push] as const;
}

function SectionHead({ hint, messages }: { hint: string; messages: string[] }) {
  return (
    <>
      <p className={BUBBLE_IN}>{hint}</p>
      {messages.map((m, i) => (
        <p key={i} role="status" className={`${BUBBLE_OUT} transition duration-300 starting:translate-y-2 starting:opacity-0`}>
          ✓ {m}
        </p>
      ))}
    </>
  );
}

// F19: 붙여넣기 탭은 대화창이다. 알림도 대화 안에 쌓이므로 따로 알림 목록을 두지 않는다.
function PasteSection({ tripId, days }: { tripId: string; days: TripDay[] }) {
  return (
    <section className="flex flex-col gap-3">
      <p className={BUBBLE_IN}>
        티켓·예약 메일·메모를 붙여넣으면 일정을 뽑아 드려요. &ldquo;둘째 날 일정 짜 줘&rdquo;처럼 말을 걸면 새 일정을 함께 짜요. 무엇이든 확인하고 저장하기
        전에는 넣지 않아요.
      </p>
      <PasteExtract tripId={tripId} days={days} />
    </section>
  );
}

function ManualSection({ tripId, days }: { tripId: string; days: TripDay[] }) {
  const [messages, push] = useMessages();
  const onItemSaved = useCallback((name: string) => push(`"${name}" 항목을 저장했습니다.`), [push]);
  return (
    <section className="flex flex-col gap-3">
      <SectionHead hint="항목 하나를 직접 입력하세요. 주소를 비워 두면 이름과 여행 목적지로 위치를 찾습니다." messages={messages} />
      <ItemForm action={createItem.bind(null, tripId)} days={days} submitLabel="저장" onSaved={onItemSaved} />
    </section>
  );
}
