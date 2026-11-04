"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { applyChange, sendChat } from "@/app/actions/assistant";
import { extractItems, saveExtractedItems, type SaveExtractedState } from "@/app/actions/extract";
import { CHANGE_FIELD_LABELS, changedFields, type ChangeFields, type ProposalItem } from "@/lib/assistant/proposal";
import { ITEM_KIND_LABELS } from "@/lib/items/types";
import { MAX_CHAT_LENGTH, pasteScore, routeMessage, type Route } from "@/lib/assistant/route";
import { MAX_TEXT_LENGTH, type ExtractedItem } from "@/lib/extract/normalize";
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
import { addSuggestions } from "./suggestions";

// R-04 붙여넣기 → 자동 추출 → 미리보기 → 저장 (02-FRONTEND.md 5-3절)
// F18: 원문에 일차·시각이 없어 AI가 추천한 항목은 미리보기를 거치지 않고 바로 매거진 DAY에 "추천" 카드로 띄운다.
// F19: 붙여넣기 탭이 대화창이 된다. 입력칸 하나에 붙여넣어도 되고 말을 걸어도 된다.
// 보내면 코드(routeMessage)가 붙여넣기(추출)인지 대화인지 고른다. 틀렸으면 결과 아래 버튼으로 다른 쪽으로 다시 보낸다.
// 대화 제안은 미리보기에서 고치고 "저장"을 눌러야 저장된다. ([hyunw0000-f19-ai-planner] 결정 1·4)

const DONE = { error: null, items: null };

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

  async function runExtract(message: string) {
    const form = new FormData();
    form.set("text", message);
    const result = await extractItems(tripId, DONE, form);
    if (!result.items) {
      say({ text: result.error ?? "찾은 항목이 없습니다.", error: true, switchTo: "chat" }, message);
      return;
    }
    // F18: 추천 항목 → 매거진 추천 카드, 나머지 → 미리보기
    const suggested = result.items.filter((i) => i.suggest);
    const rest = result.items.filter((i) => !i.suggest);
    addSuggestions(
      tripId,
      suggested.map(({ suggest, ...item }) => ({ item, suggest: suggest! })),
    );
    // C9 F27: 준비물은 메모 항목이 아니라 BACK 준비물 체크리스트(이 브라우저)에 바로 더한다.
    const packing = result.packing ?? [];
    const parts = result.items.length ? [`항목 ${result.items.length}개를 찾았어요.`] : [];
    if (packing.length) parts.push(packingNote(addToChecklist(tripId, packing)));
    if (suggested.length) parts.push(`일차·시각이 없던 ${suggested.length}개는 매거진 DAY에 추천 카드로 띄웠어요. 카드에서 "넣기"를 눌러야 저장돼요.`);
    if (rest.length) parts.push(`${rest.length}개는 아래에서 확인하고 저장해 주세요.`);
    // F20: 어느 항목에도 붙지 않은 예약번호는 미리보기에서 직접 넣게 알린다(미리보기가 없으면 말로 알린다).
    const unassigned = result.unassigned ?? [];
    if (unassigned.length && !rest.length) parts.push(`어느 항목인지 못 정한 예약번호: ${unassigned.join(", ")} · 일정 카드에서 직접 넣어 주세요.`);
    say(
      { text: parts.join(" "), extract: rest.length ? { items: rest, status: "open", unassigned } : undefined, switchTo: "chat" },
      message,
    );
  }

  async function runChat(message: string) {
    // 이번 말은 이미 대화에 넣었으므로 뺀다. 붙여넣은 원문은 보내지 않는다.
    const before = readChat(tripId).slice(0, -1);
    const history = before
      .filter((e) => !(e.role === "assistant" && e.error))
      .map((e) => ({ role: e.role, text: e.role === "user" && e.pasted ? "(붙여넣기로 일정을 넣음)" : e.text.slice(0, MAX_CHAT_LENGTH) }));
    const open = [...before].reverse().find((e): e is AssistantEntry => e.role === "assistant" && e.proposal?.status === "open");
    const plan = (open?.proposal?.items ?? []).map(({ kind, day, time, name }) => ({ kind, day, time, name }));

    const result = await sendChat(tripId, { message, history, plan });
    const switchTo = pasteScore(message) >= 2 ? ("extract" as const) : undefined;
    if (!result.ok) {
      say({ text: result.error, error: true, switchTo }, message);
      return;
    }
    if (result.items.length) replaceOpenProposals(tripId);
    if (result.changes.length) closeOpenChanges(tripId);
    say(
      {
        text: result.reply,
        quickReplies: result.quickReplies,
        notes: result.notes,
        proposal: result.items.length ? { items: result.items, status: "open" } : undefined,
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
        <p className="text-xs leading-relaxed opacity-55">
          보낸 내용은 Google AI가 처리하며 사람이 볼 수 있습니다. 링크와 “예약번호: …”처럼 적힌 예약번호는 AI에 보내지 않고, 붙여넣기에서는 나만 보는 곳에 저장합니다. 카드번호·주민번호·여권번호·비밀번호는 가려서 보내고 저장하지 않습니다. 사람 이름은 지우고 보내 주세요.
        </p>
        {inputError && <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">{inputError}</p>}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <p className="text-xs opacity-55">{text.length.toLocaleString()}자 · 원문은 저장하지 않습니다.</p>
            {entries.length > 0 && (
              <button type="button" onClick={() => clearChat(tripId)} disabled={pending} className={`${GHOST} px-2 py-1 text-xs`}>
                대화 지우기
              </button>
            )}
          </div>
          <button type="submit" disabled={pending || !text.trim()} className={BUTTON}>
            {pending ? "보내는 중…" : "보내기"}
          </button>
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
}: {
  tripId: string;
  days: TripDay[];
  entry: AssistantEntry;
  canSwitch: boolean;
  onSwitch: (route: Route) => void;
}) {
  const preview = entry.proposal ? { type: "proposal" as const, ...entry.proposal } : entry.extract ? { type: "extract" as const, ...entry.extract } : null;

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
      {entry.changes && entry.changes.length > 0 && (
        <div className="flex flex-col gap-2" aria-label="저장된 일정 고치기·지우기">
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

