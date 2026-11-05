"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { applyChange, sendChat } from "@/app/actions/assistant";
import { extractItems, saveExtractedItems, type SaveExtractedState } from "@/app/actions/extract";
import { CHANGE_FIELD_LABELS, changedFields, type ChangeFields, type ProposalItem } from "@/lib/assistant/proposal";
import { ITEM_KIND_LABELS } from "@/lib/items/types";
import { MAX_CHAT_LENGTH, pasteScore, routeMessage, type Route } from "@/lib/assistant/route";
import { MAX_TEXT_LENGTH, type ExtractedItem } from "@/lib/extract/normalize";
import type { ItemInput } from "@/lib/items/validation";
import type { TripDay } from "@/lib/trips/days";
import { packingFromMessage } from "@/lib/trips/packing";
import {
  appendEntry,
  clearChat,
  closeOpenChanges,
  newId,
  readChat,
  replaceOpenProposals,
  updateEntry,
  useChat,
  type AssistantEntry,
  type ChangeCard,
  type PreviewStatus,
} from "./chat-store";
import { BUBBLE_IN, BUBBLE_OUT, FIELD, GHOST, PRIMARY as BUTTON } from "./form-styles";
import { ItemFields } from "./item-fields";
import { addToChecklist } from "./checklist-store";
import { addPreviews, PREVIEWS_ANCHOR, readPreviews, removePreviews, shiftPreviews, showPreviews } from "./previews";
import { setTripPeriod } from "@/app/actions/trips";
import { periodChoices, periodLength, type Period, type PeriodChoice } from "@/lib/extract/period";

const CHOICE_LABELS: Record<PeriodChoice["key"], string> = {
  both: "날짜·기간 모두 원문대로",
  date: "날짜만 원문대로 (기간은 그대로)",
  length: "기간만 원문대로 (시작일은 그대로)",
};

// R-04 붙여넣기 → 자동 추출 → 미리보기 → 저장 (02-FRONTEND.md 5-3절)
// F18: 원문에 일차·시각이 없어 AI가 추천한 항목은 미리보기를 거치지 않고 바로 매거진 DAY에 "추천" 카드로 띄운다.
// F19: 붙여넣기 탭이 대화창이 된다. 입력칸 하나에 붙여넣어도 되고 말을 걸어도 된다.
// 보내면 코드(routeMessage)가 붙여넣기(추출)인지 대화인지 고른다. 틀렸으면 결과 아래 버튼으로 다른 쪽으로 다시 보낸다.
// 대화 제안은 미리보기에서 고치고 "저장"을 눌러야 저장된다. ([hyunw0000-f19-ai-planner] 결정 1·4)
// C10 F33: 대화 제안도 대화창 폼 대신 매거진 DAY BY DAY 미리보기 카드로 띄운다. 추천 이유는 카드 서랍에 보인다. ([hyunw0000-f33-claude-api] 결정 6)
// C9 F28: 붙여넣기 추출 결과는 입력창 미리보기 대신 매거진 DAY BY DAY에 "미리보기" 카드로 띄운다. ([hyunw0000-f28-magazine-preview] 결정 1)
// C10 F33: 원문에서 가져온 항목은 AI가 일차·시각을 채웠어도 추천이 아니라 미리보기다. 채운 값은 카드 서랍에 "(추천)"으로 보인다. ([hyunw0000-f33-claude-api] 결정 5)

const DONE = { error: null, items: null };

// 추천 표시(F18) 칸을 뺀 저장용 값. 추천 표시는 미리보기에 따로 둔다.
function withoutSuggest(extracted: ExtractedItem): ItemInput {
  const item: ItemInput & { suggest?: unknown } = { ...extracted };
  delete item.suggest;
  return item;
}

// 대화 제안(F19)의 추천 이유·지도 확인 칸을 뺀 저장용 값. 이유는 미리보기 추천 표시로 옮긴다.
function withoutProposalFields(proposal: ProposalItem): ItemInput {
  const item: ItemInput & { reason?: unknown; found?: unknown } = { ...proposal };
  delete item.reason;
  delete item.found;
  return item;
}

// "3박 4일(11/20~11/23)". 날짜가 없는 여행은 "날짜 미정".
// withYear: 원문과 여행의 연도가 다르면 연도도 붙인다("2026년 11/20~11/23"), 같은 해의 다른 달과 구분되게.
function describePeriod(p: { startDate: string | null; endDate: string | null } | Period, withYear = false): string {
  if (!p.startDate) return "날짜 미정";
  const end = p.endDate && p.endDate >= p.startDate ? p.endDate : p.startDate;
  const len = periodLength({ startDate: p.startDate, endDate: end });
  const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  const year = withYear ? `${p.startDate.slice(0, 4)}년 ` : "";
  return len === 1 ? `당일(${year}${md(p.startDate)})` : `${len - 1}박 ${len}일(${year}${md(p.startDate)}~${md(end)})`;
}

function differentYear(a: { startDate: string | null }, b: { startDate: string | null }): boolean {
  return !!a.startDate && !!b.startDate && a.startDate.slice(0, 4) !== b.startDate.slice(0, 4);
}

function packingNote(added: number): string {
  return added
    ? `준비물 ${added}개를 매거진 BACK의 준비물에 넣었어요. 준비물은 이 브라우저에만 저장돼요.`
    : "준비물은 이미 매거진 BACK의 준비물에 있어요.";
}

export function PasteExtract({ tripId, days }: { tripId: string; days: TripDay[] }) {
  const entries = useChat(tripId);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [pendingRoute, setPendingRoute] = useState<Route | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  // 다른 쪽으로 다시 보낼 원문. 원문은 저장하지 않으므로(B15) 이 화면 메모리에만 둔다. 도우미 말 id → 원문
  const [originals, setOriginals] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [entries.length, pending]);

  function say(entry: Omit<AssistantEntry, "id" | "role">, original: string) {
    const id = newId();
    setOriginals((o) => ({ ...o, [id]: original }));
    appendEntry(tripId, { id, role: "assistant", ...entry });
  }

  async function runExtract(message: string, { askPeriod = true }: { askPeriod?: boolean } = {}) {
    const form = new FormData();
    form.set("text", message);
    const result = await extractItems(tripId, DONE, form);
    if (!result.items) {
      say({ text: result.error ?? "찾은 항목이 없습니다.", error: true, switchTo: "chat" }, message);
      return;
    }
    // 모든 항목 → 매거진 미리보기 카드(C9 F28). AI가 채운 일차·시각은 카드에 추천 표시로 남긴다(C10 F33).
    const suggested = result.items.filter((i) => i.suggest);
    const rest = result.items;
    const previewIds = addPreviews(
      tripId,
      rest.map((i) => ({ item: withoutSuggest(i), suggest: i.suggest })),
    );
    // C9 F27: 준비물은 메모 항목이 아니라 BACK 준비물 체크리스트(이 브라우저)에 바로 더한다.
    const packing = result.packing ?? [];
    const parts = result.items.length ? [`항목 ${result.items.length}개를 찾았어요.`] : [];
    if (packing.length) parts.push(packingNote(addToChecklist(tripId, packing)));
    if (rest.length) parts.push(`매거진 DAY BY DAY에 미리보기로 띄웠어요. 사진과 함께 확인하고 "넣기"나 "모두 저장"을 눌러 주세요.`);
    if (suggested.length) parts.push(`원문에 일차·시각이 없던 ${suggested.length}개는 AI가 채운 값이에요. 카드를 눌러 "(추천)" 표시와 이유를 확인해 주세요.`);
    // F20: 어느 항목에도 붙지 않은 예약번호는 말로 알린다. 미리보기 카드의 "고치기"나 저장 뒤 일정 카드에서 넣는다.
    const unassigned = result.unassigned ?? [];
    if (unassigned.length) parts.push(`어느 항목인지 못 정한 예약번호: ${unassigned.join(", ")} · 맞는 카드의 "고치기"에서 넣어 주세요.`);
    // C10 F33: 원문 기간이 여행과 다르면 맞출지 묻는다(누르기 전에는 바꾸지 않는다).
    const period = askPeriod && result.period ? { ...result.period, status: "open" as const, previewIds } : undefined;
    say({ text: parts.join(" "), previews: rest.length || undefined, switchTo: "chat", period }, message);
  }

  // C10 F33: "맞추기" → 여행 기간을 바꾸고(저장된 일정은 날짜를 지켜 일차를 옮김), 저장 전 미리보기도 같은 만큼 옮긴다.
  // 원문이 화면 메모리에 남아 있으면 이번 미리보기를 내리고 새 기간으로 다시 뽑는다("마지막 날" 같은 말이 새 기간에 맞게 놓이도록).
  // choice: 날짜·기간 모두 / 날짜만 / 기간만 중 사용자가 고른 기간
  function fitPeriod(entry: AssistantEntry, choice: Period) {
    const period = entry.period;
    if (!period || pending) return;
    const original = originals[entry.id];
    setPendingRoute("extract");
    startTransition(async () => {
      const result = await setTripPeriod(tripId, choice.startDate, choice.endDate);
      if (result.error) {
        updateEntry(tripId, entry.id, (e) => ({ ...e, period: e.period && { ...e.period, error: result.error! } }));
      } else {
        if (result.shift) shiftPreviews(tripId, result.shift);
        updateEntry(tripId, entry.id, (e) => ({ ...e, period: e.period && { ...e.period, status: "done", chosen: choice, error: undefined } }));
        if (original) {
          removePreviews(tripId, period.previewIds);
          // 고른 기간으로 다시 뽑을 때는 기간을 다시 묻지 않는다("기간만"을 골라도 날짜는 원문과 다르므로).
          await runExtract(original, { askPeriod: false });
        }
      }
      setPendingRoute(null);
    });
  }

  function keepPeriod(entry: AssistantEntry) {
    updateEntry(tripId, entry.id, (e) => ({ ...e, period: e.period && { ...e.period, status: "kept" } }));
  }

  async function runChat(message: string) {
    // 이번 말은 이미 대화에 넣었으므로 뺀다. 붙여넣은 원문은 보내지 않는다.
    const before = readChat(tripId).slice(0, -1);
    const history = before
      .filter((e) => !(e.role === "assistant" && e.error))
      .map((e) => ({ role: e.role, text: e.role === "user" && e.pasted ? "(붙여넣기로 일정을 넣음)" : e.text.slice(0, MAX_CHAT_LENGTH) }));
    const open = [...before].reverse().find((e): e is AssistantEntry => e.role === "assistant" && e.proposal?.status === "open");
    // 이어서 고쳐 달라고 할 때 보낼 지금 제안. 매거진에 띄운 제안은 아직 넣지 않은(남아 있는) 카드만, 고친 값으로 보낸다.
    const openIds = open?.proposal?.previewIds;
    const planItems = openIds
      ? readPreviews(tripId)
          .filter((p) => openIds.includes(p.id))
          .map((p) => p.item)
      : (open?.proposal?.items ?? []);
    const plan = planItems.map(({ kind, day, time, name }) => ({ kind, day, time, name }));

    const result = await sendChat(tripId, { message, history, plan });
    const switchTo = pasteScore(message) >= 2 ? ("extract" as const) : undefined;
    if (!result.ok) {
      say({ text: result.error, error: true, switchTo }, message);
      return;
    }
    // 새 제안이 오면 아직 넣지 않은 앞 제안 카드는 매거진에서 내리고 새 제안으로 바꾼다.
    let previewIds: string[] = [];
    if (result.items.length) {
      if (openIds) removePreviews(tripId, openIds);
      replaceOpenProposals(tripId);
      previewIds = addPreviews(
        tripId,
        result.items.map((p) => ({ item: withoutProposalFields(p), suggest: { day: true, time: p.time !== null, reason: p.reason } })),
      );
    }
    if (result.changes.length) closeOpenChanges(tripId);
    say(
      {
        text: result.reply,
        quickReplies: result.quickReplies,
        notes: result.notes,
        proposal: result.items.length ? { items: result.items, status: "open", previewIds } : undefined,
        previews: previewIds.length || undefined,
        changes: result.changes.length ? result.changes.map((c) => ({ ...c, status: "open" as const })) : undefined,
        switchTo,
      },
      message,
    );
  }

  function send(raw: string, forced?: Route) {
    const message = raw.trim();
    if (!message || pending) return;
    // C9 F27: "준비물: 여권, 충전기"처럼 준비물만 적은 짧은 목록은 AI를 부르지 않고 바로 체크리스트에 더한다.
    // "준비물: 수영복하고 돼지코랑 여권"처럼 말로 적었으면 추출로 보내 AI가 물건마다 나눈다(대화로 가면 준비물을 다루지 않는다).
    const packing = forced ? null : packingFromMessage(message);
    if (packing && packing !== "ai") {
      appendEntry(tripId, { id: newId(), role: "user", pasted: false, text: message });
      if (raw === text) setText("");
      setInputError(null);
      say({ text: packingNote(addToChecklist(tripId, packing)) }, message);
      return;
    }
    const route = forced ?? (packing === "ai" ? "extract" : routeMessage(message));
    if (route === "chat" && message.length > MAX_CHAT_LENGTH) {
      setInputError(`말은 ${MAX_CHAT_LENGTH.toLocaleString()}자까지 보낼 수 있습니다. 티켓·예약 메일이라면 "붙여넣기로 뽑기"를 눌러 주세요.`);
      return;
    }
    setInputError(null);
    appendEntry(tripId, {
      id: newId(),
      role: "user",
      pasted: route === "extract",
      text: route === "extract" ? `붙여넣은 내용 · ${message.length.toLocaleString()}자` : message,
    });
    if (raw === text) setText("");
    setPendingRoute(route);
    startTransition(async () => {
      await (route === "extract" ? runExtract(message) : runChat(message));
      setPendingRoute(null);
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter로 보내고 Shift+Enter로 줄을 바꾼다. 한글 조합 중에는 보내지 않는다.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(text);
    }
  }

  const lastAssistant = entries.at(-1)?.role === "assistant" ? (entries.at(-1) as AssistantEntry) : null;

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) =>
        entry.role === "user" ? (
          <p key={entry.id} className={`${BUBBLE_OUT} whitespace-pre-wrap ${entry.pasted ? "italic opacity-80" : ""}`}>
            {entry.text}
          </p>
        ) : (
          <AssistantMessage
            key={entry.id}
            tripId={tripId}
            days={days}
            entry={entry}
            canSwitch={!pending && entry.id in originals}
            onSwitch={(route) => send(originals[entry.id] ?? "", route)}
            busy={pending}
            onFitPeriod={(choice) => fitPeriod(entry, choice)}
            onKeepPeriod={() => keepPeriod(entry)}
          />
        ),
      )}

      {pending && (
        <p role="status" className={`${BUBBLE_IN} animate-pulse`}>
          {pendingRoute === "extract" ? "일정을 추출하고 있습니다…" : "일정을 생각하고 있어요…"}
        </p>
      )}

      {!pending && lastAssistant?.quickReplies && lastAssistant.quickReplies.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="다음 말 추천">
          {lastAssistant.quickReplies.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q, "chat")}
              className="rounded-full border border-current/20 px-3.5 py-1.5 text-sm transition hover:border-current/40 active:scale-95"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div ref={bottomRef} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="sticky bottom-0 -mx-1 flex flex-col gap-2 rounded-2xl bg-surface/95 px-1 pt-2 pb-1 backdrop-blur-xl"
      >
        <textarea
          name="text"
          data-autofocus
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={MAX_TEXT_LENGTH}
          aria-label="붙여넣거나 말 걸기"
          placeholder={'티켓·예약 메일을 붙여넣거나 "둘째 날 일정 짜 줘"처럼 말해 보세요'}
          className={`${FIELD} resize-none leading-relaxed`}
        />
        {inputError && <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">{inputError}</p>}
        <div className="flex items-center justify-between gap-2 pl-3">
          {/* 개인정보 안내(B18, F20 문구). 평소에는 "지침"만 보이고 마우스를 올리거나 누르면(포커스) 전체가 뜬다. */}
          <span tabIndex={0} aria-describedby="paste-guide" className="group relative cursor-help rounded px-1 py-1 text-xs underline decoration-dotted underline-offset-2 opacity-55 outline-none hover:opacity-90 focus-visible:opacity-90">
            지침
            <span
              id="paste-guide"
              role="tooltip"
              className="pointer-events-none invisible absolute bottom-full left-0 z-30 mb-2 w-72 max-w-[calc(100vw-3rem)] rounded-xl bg-zinc-900/95 px-3 py-2 text-xs leading-relaxed text-white no-underline opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100"
            >
              보낸 내용은 AI(Anthropic Claude, 안 되면 Google Gemini)가 처리하며 Google 쪽에서는 사람이 볼 수 있습니다. 링크와 “예약번호: …”처럼 적힌 예약번호는 AI에 보내지 않고, 붙여넣기에서는 나만 보는 곳에 저장합니다. 카드번호·주민번호·여권번호·비밀번호는 가려서 보내고 저장하지 않습니다. 사람 이름은 지우고 보내 주세요. 원문은 저장하지 않습니다.
            </span>
          </span>
          <div className="flex items-center gap-1">
            {entries.length > 0 && (
              <button type="button" onClick={() => clearChat(tripId)} disabled={pending} className={`${GHOST} px-2 py-1 text-xs`}>
                대화 지우기
              </button>
            )}
            <button type="submit" disabled={pending || !text.trim()} className={BUTTON}>
              {pending ? "보내는 중…" : "보내기"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

const STATUS_TEXT: Record<Exclude<PreviewStatus, "open">, string> = {
  saved: "저장했어요",
  closed: "저장하지 않고 닫았어요",
  replaced: "다음 제안으로 바뀌었어요",
};

function AssistantMessage({
  tripId,
  days,
  entry,
  canSwitch,
  onSwitch,
  busy,
  onFitPeriod,
  onKeepPeriod,
}: {
  tripId: string;
  days: TripDay[];
  entry: AssistantEntry;
  canSwitch: boolean;
  onSwitch: (route: Route) => void;
  busy: boolean;
  onFitPeriod: (choice: Period) => void;
  onKeepPeriod: () => void;
}) {
  const router = useRouter();
  const yearShown = !!entry.period && differentYear(entry.period.to, entry.period.current);
  // 예전 대화 기록(대화창 폼으로 보이던 제안·추출)만 여기서 폼으로 그린다. 새 제안은 매거진 미리보기 카드로 간다(C10 F33).
  const preview =
    entry.proposal && !entry.proposal.previewIds
      ? { type: "proposal" as const, ...entry.proposal }
      : entry.extract
        ? { type: "extract" as const, ...entry.extract }
        : null;

  // 미리보기를 저장하거나 닫으면 예약 정보(F20)는 이 브라우저 대화 기록에서도 지운다.
  function setStatus(status: PreviewStatus, saved?: number) {
    updateEntry(tripId, entry.id, (e) =>
      e.proposal
        ? { ...e, proposal: { ...e.proposal, status, saved } }
        : e.extract
          ? { ...e, extract: { items: e.extract.items.map((item) => ({ ...item, booking: undefined })), status, saved } }
          : e,
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className={entry.error ? "max-w-[85%] self-start rounded-2xl rounded-tl-md bg-rose-500/15 px-4 py-2.5 text-sm text-rose-700 dark:text-rose-300" : `${BUBBLE_IN} whitespace-pre-wrap`}>
        {entry.text}
      </p>
      {entry.notes && entry.notes.length > 0 && (
        <ul className="ml-1 flex flex-col gap-0.5 text-xs text-muted">
          {entry.notes.map((n) => (
            <li key={n}>· {n}</li>
          ))}
        </ul>
      )}
      {preview &&
        (preview.status === "open" ? (
          <ItemsPreview
            tripId={tripId}
            days={days}
            type={preview.type}
            items={preview.items}
            unassigned={entry.extract && preview.type === "extract" ? (entry.extract.unassigned ?? []) : []}
            onCancel={() => setStatus("closed")}
            onSaved={(count) => setStatus("saved", count)}
          />
        ) : (
          <p className="ml-1 text-xs text-muted">
            {preview.type === "proposal" ? "제안" : "추출 결과"} {preview.items.length}개 · {STATUS_TEXT[preview.status]}
            {preview.status === "saved" && preview.saved ? ` (${preview.saved}개)` : ""}
          </p>
        ))}
      {entry.proposal?.previewIds && entry.proposal.status === "open" && (
        <p className="ml-1 text-xs leading-relaxed text-muted">AI가 추천한 일정이에요. 영업시간·휴무일·폐업 여부는 틀릴 수 있으니 확인해 주세요. 매거진 카드에서 &ldquo;넣기&rdquo;를 눌러야 저장돼요.</p>
      )}
      {entry.previews && entry.proposal?.status !== "replaced" && (
        <button
          type="button"
          onClick={() => {
            // 입력창을 닫고 미리보기 줄로 스크롤한다. 지도 탭이면 매거진으로 간다(도착하면 미리보기 줄이 #m-previews를 보고 스크롤).
            const onMagazine = document.getElementById(PREVIEWS_ANCHOR) !== null;
            showPreviews();
            if (!onMagazine) router.push(`/trips/${encodeURIComponent(tripId)}#${PREVIEWS_ANCHOR}`);
          }}
          className={`${BUTTON} self-start px-4 py-2 text-xs`}
        >
          매거진에서 보기 ({entry.previews}개)
        </button>
      )}
      {entry.period && (
        <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-current/25 px-4 py-3 text-sm" aria-label="여행 기간 맞추기">
          {entry.period.status === "open" ? (
            <>
              <p className="leading-relaxed">
                원문은 <b>{describePeriod(entry.period.to, yearShown)}</b>인데 여행은 <b>{describePeriod(entry.period.current, yearShown)}</b>이에요. 처음 정한 날짜를 원문에 맞춰 바꿀까요?
              </p>
              <p className="text-xs text-muted">저장된 일정은 날짜를 그대로 지키고, 필요 없는 DAY는 없어져요.</p>
              {entry.period.error && <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">{entry.period.error}</p>}
              <div className="flex flex-col gap-1.5">
                {periodChoices(entry.period.to, entry.period.current).map((c, i) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => onFitPeriod(c.period)}
                    disabled={busy}
                    className={`${i === 0 ? BUTTON : GHOST} flex items-center justify-between gap-3 px-4 py-2 text-left text-xs`}
                  >
                    <span className="font-semibold">{CHOICE_LABELS[c.key]}</span>
                    <span className="font-normal opacity-80">{describePeriod(c.period, yearShown)}</span>
                  </button>
                ))}
                <button type="button" onClick={onKeepPeriod} disabled={busy} className={`${GHOST} px-4 py-2 text-left text-xs`}>
                  그대로 두기 <span className="opacity-70">· {describePeriod(entry.period.current, yearShown)}</span>
                </button>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted">
              {entry.period.status === "done" ? `여행 기간을 ${describePeriod(entry.period.chosen ?? entry.period.to, yearShown)}로 바꿨어요.` : "여행 기간은 그대로 두었어요."}
            </p>
          )}
        </div>
      )}
      {entry.changes && entry.changes.length > 0 && (
        <div className="flex flex-col gap-2" aria-label="저장된 일정 고치기·지우기">
          <ChangeBulkBar tripId={tripId} entryId={entry.id} changes={entry.changes} />
          {entry.changes.map((change) => (
            <ChangeCardView
              key={change.id}
              tripId={tripId}
              change={change}
              onUpdate={(next) =>
                updateEntry(tripId, entry.id, (e) => ({
                  ...e,
                  changes: e.changes?.map((c) => (c.id === change.id ? { ...c, ...next } : c)),
                }))
              }
            />
          ))}
        </div>
      )}
      {canSwitch && entry.switchTo && (
        <button type="button" onClick={() => onSwitch(entry.switchTo!)} className={`${GHOST} self-start px-2 py-1 text-xs`}>
          {entry.switchTo === "chat" ? "대화로 다시 보내기" : "붙여넣기로 뽑기"}
        </button>
      )}
    </div>
  );
}

function fieldText(key: keyof ChangeFields, value: ChangeFields[keyof ChangeFields]): string {
  if (key === "day") return `DAY ${value}`;
  if (value === null || value === "") return "(없음)";
  return String(value);
}

// 저장된 일정 고치기·지우기 카드. 버튼을 눌러야만 반영된다.
// 고치기·지우기 카드가 2개 이상 열려 있으면 한꺼번에 반영·취소한다(C10 F33, [hyunw0000-f33-claude-api] 결정 11).
// 모두 지우기면 "전체 삭제", 고치기가 섞이면 "전체 반영". 지도에서 찾지 못한 고치기는 빼고 반영한다. 지우기는 한 번 더 묻는다.
// 하나씩 차례로 반영하고, 실패한 카드는 열린 채로 오류를 보인다.
function ChangeBulkBar({ tripId, entryId, changes }: { tripId: string; entryId: string; changes: ChangeCard[] }) {
  const [pending, startTransition] = useTransition();
  const open = changes.filter((c) => c.status === "open");
  const ready = open.filter((c) => c.found !== false);
  if (open.length < 2) return null;
  const allDelete = ready.every((c) => c.action === "delete");
  const label = allDelete ? `전체 삭제 (${ready.length}개)` : `전체 반영 (${ready.length}개)`;

  const update = (id: string, next: Partial<ChangeCard>) =>
    updateEntry(tripId, entryId, (e) => ({ ...e, changes: e.changes?.map((c) => (c.id === id ? { ...c, ...next } : c)) }));

  function applyAll() {
    const deletes = ready.filter((c) => c.action === "delete").length;
    if (deletes && !window.confirm(`일정 ${deletes}개를 지울까요? 지운 일정은 되돌릴 수 없어요.`)) return;
    startTransition(async () => {
      for (const c of ready) {
        const result = await applyChange(tripId, { itemId: c.id, action: c.action, after: c.after });
        update(c.id, result.error ? { error: result.error } : { status: "done", error: undefined });
      }
    });
  }

  function closeAll() {
    for (const c of open) update(c.id, { status: "closed" });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-current/[0.04] px-3 py-2 text-xs">
      <span className="text-muted">
        {allDelete ? "지우기" : "고치기·지우기"} {open.length}개{ready.length < open.length ? ` · 지도에서 찾지 못한 ${open.length - ready.length}개는 빼고 반영` : ""}
      </span>
      <div className="flex gap-2">
        <button type="button" onClick={closeAll} disabled={pending} className={`${GHOST} px-3 py-1.5 text-xs`}>
          전체 취소
        </button>
        <button type="button" onClick={applyAll} disabled={pending || ready.length === 0} className={`${BUTTON} px-3 py-1.5 text-xs`}>
          {pending ? "반영 중…" : label}
        </button>
      </div>
    </div>
  );
}

function ChangeCardView({
  tripId,
  change,
  onUpdate,
}: {
  tripId: string;
  change: ChangeCard;
  onUpdate: (next: Partial<ChangeCard>) => void;
}) {
  const [pending, startTransition] = useTransition();
  const isDelete = change.action === "delete";
  const blocked = change.found === false;
  const fields = changedFields(change);
  const when = `DAY ${change.before.day}${change.before.time ? ` ${change.before.time}` : ""}`;

  function apply() {
    startTransition(async () => {
      const result = await applyChange(tripId, { itemId: change.id, action: change.action, after: change.after });
      onUpdate(result.error ? { error: result.error } : { status: "done", error: undefined });
    });
  }

  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-3 text-sm ${
        isDelete ? "border-rose-500/40 bg-rose-500/5" : "border-sky-500/40 bg-sky-500/5"
      } ${change.status === "open" ? "" : "opacity-60"}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            isDelete ? "bg-rose-500/15 text-rose-700 dark:text-rose-300" : "bg-sky-500/15 text-sky-800 dark:text-sky-300"
          }`}
        >
          {isDelete ? "지우기" : "고치기"}
        </span>
        <span className="text-xs text-muted">
          {ITEM_KIND_LABELS[change.kind]} · {when}
        </span>
        <span className="font-semibold">{change.before.name}</span>
        {blocked && (
          <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">지도에서 찾지 못함</span>
        )}
      </div>
      {!isDelete && change.after && (
        <ul className="flex flex-col gap-1">
          {fields.map((k) => (
            <li key={k} className="flex flex-wrap items-baseline gap-x-2 text-xs">
              <span className="w-8 shrink-0 text-muted">{CHANGE_FIELD_LABELS[k]}</span>
              <span className="line-through opacity-60">{fieldText(k, change.before[k])}</span>
              <span aria-hidden>→</span>
              <span className="font-medium">{fieldText(k, change.after![k])}</span>
            </li>
          ))}
        </ul>
      )}
      {change.error && <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">{change.error}</p>}
      {change.status === "open" ? (
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onUpdate({ status: "closed" })} disabled={pending} className={`${GHOST} px-3 py-1.5 text-xs`}>
            취소
          </button>
          <button type="button" onClick={apply} disabled={pending || blocked} className={`${BUTTON} px-3 py-1.5 text-xs`}>
            {pending ? "반영 중…" : isDelete ? "삭제" : "반영"}
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted">{change.status === "done" ? (isDelete ? "지웠어요" : "반영했어요") : "반영하지 않았어요"}</p>
      )}
    </div>
  );
}

type PreviewItem = ExtractedItem | ProposalItem;

function ItemsPreview({
  tripId,
  days,
  type,
  items,
  unassigned,
  onCancel,
  onSaved,
}: {
  tripId: string;
  days: TripDay[];
  type: "extract" | "proposal";
  items: PreviewItem[];
  unassigned: string[];
  onCancel: () => void;
  onSaved: (count: number) => void;
}) {
  const [state, saveAction, saving] = useActionState(saveExtractedItems.bind(null, tripId), { error: null, saved: null });
  const handled = useRef<SaveExtractedState | null>(null);

  useEffect(() => {
    if (state.saved && handled.current !== state) {
      handled.current = state;
      onSaved(state.saved);
    }
  }, [state, onSaved]);

  // 여행 기간보다 뒤 일차로 뽑힌 항목도 고를 수 있게 일차 목록을 늘린다.
  const lastDay = Math.max(days.length, ...items.map((i) => i.day));
  const choices = [...days];
  for (let d = days.length + 1; d <= lastDay; d++) choices.push({ day: d, date: null });

  return (
    <form action={saveAction} className="flex flex-col gap-3" aria-label={type === "proposal" ? "일정 제안 미리보기" : "추출 결과 미리보기"}>
      {type === "proposal" && (
        <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
          AI가 추천한 일정이에요. 영업시간·휴무일·폐업 여부는 틀릴 수 있으니 확인해 주세요. 고른 항목만 저장됩니다.
        </p>
      )}
      {/* F20: AI가 어느 항목에도 붙이지 않은 예약번호. 맞는 항목의 예약번호 칸에 직접 넣는다. */}
      {unassigned.length > 0 && (
        <p className="rounded-xl bg-amber-500/15 px-3 py-2 text-sm">
          어느 항목인지 못 정한 예약번호: <span className="font-mono">{unassigned.join(", ")}</span> · 맞는 항목의 예약번호 칸에 넣어 주세요.
        </p>
      )}
      <input type="hidden" name="count" value={items.length} />
      {items.map((item, i) => {
        const reason = "reason" in item ? item.reason : "";
        const notFound = "found" in item && item.found === false;
        return (
          <fieldset
            key={i}
            className={`flex flex-col gap-4 rounded-2xl border bg-background/40 p-4 transition has-[input[name$='.include']:not(:checked)]:opacity-40 ${
              type === "proposal" ? "border-dashed border-amber-500/60" : "border-line"
            }`}
          >
            <legend className="sr-only">항목 {i + 1}</legend>
            <div className="flex flex-col gap-1">
              <label className="flex items-center justify-between text-sm font-semibold">
                <span className="flex items-center gap-2">
                  항목 {i + 1}
                  {type === "proposal" && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">AI 추천</span>
                  )}
                  {notFound && (
                    <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">지도에서 찾지 못함</span>
                  )}
                </span>
                <span className="flex items-center gap-1 font-normal">
                  <input type="checkbox" name={`items.${i}.include`} defaultChecked={!notFound} className="size-4" />
                  넣기
                </span>
              </label>
              {reason && <p className="text-xs leading-relaxed text-muted">{reason}</p>}
            </div>
            <ItemFields days={choices} values={item} prefix={`items.${i}.`} />
          </fieldset>
        );
      })}
      {state.error && <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={saving} className={GHOST}>
          취소
        </button>
        <button type="submit" disabled={saving} className={BUTTON}>
          {saving ? "저장 중…" : "고른 항목 저장"}
        </button>
      </div>
    </form>
  );
}

