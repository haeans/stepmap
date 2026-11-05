import "server-only";
import { z } from "zod";
import { CHAT_SYSTEM_PROMPT } from "@/lib/assistant/prompt";
import type { RawChange, RawProposalItem } from "@/lib/assistant/proposal";
import { ITEM_KINDS } from "@/lib/items/types";
import { callClaude } from "./claude";
import { callGemini } from "./gemini";
import type { RawItem } from "./normalize";
import { SYSTEM_PROMPT, userMessage, type ExistingItem, type TripContext } from "./prompt";

// AI를 부르는 입구는 이 파일 하나다. 공급자별 호출은 claude.ts·gemini.ts에 둔다. (B14, C10 F33)
// 붙여넣기 추출(R-04, F18)과 대화 도우미(F19)가 같은 호출 함수를 쓴다.
// 지시문·스키마·가리기·정리 규칙은 두 공급자가 똑같이 쓴다.

export type CallOptions<T> = { label: string; system: string; input: string; schema: z.ZodType<T>; maxOutputTokens: number };

// 키가 있으면 Claude 먼저, 실패하거나 키가 없으면 Gemini. (C10 F33)
async function callAi<T>(options: CallOptions<T>): Promise<T | null> {
  return (await callClaude(options)) ?? (await callGemini(options));
}

// Gemini는 숫자 범위나 배열 길이 제한이 붙은 스키마를 거절한다("too many states").
// 그래서 스키마는 단순하게 두고, 범위와 항목 수는 normalize.ts·proposal.ts에서 맞춘다.
const ExtractSchema = z.object({
  items: z.array(
    z.object({
      kind: z.enum(ITEM_KINDS),
      date: z.string().nullable(),
      day: z.number().nullable(),
      time: z.string().nullable(),
      name: z.string(),
      address: z.string(),
      memo: z.string(),
      link: z.string(),
      // F20: 원문의 "[예약번호N]" 자리표시 중 이 항목의 것. 없으면 빈 문자열.
      booking_ref: z.string(),
      cost_amount: z.number().nullable(),
      cost_currency: z.string().nullable(),
      // F18 추천 칸
      suggested_day: z.number().nullable(),
      suggested_time: z.string().nullable(),
      reason: z.string(),
    }),
  ),
  // C9 F27: 준비물은 메모 항목이 아니라 이 목록으로 받아 체크리스트(브라우저)에 더한다.
  packing: z.array(z.string()),
});

export type ExtractResult = { ok: true; items: RawItem[]; packing: string[] } | { ok: false };

export async function extractWithAi(trip: TripContext, text: string, existing: ExistingItem[] = []): Promise<ExtractResult> {
  const data = await callAi({
    label: "extract",
    system: SYSTEM_PROMPT,
    input: userMessage(trip, text, existing),
    schema: ExtractSchema,
    maxOutputTokens: 8192,
  });
  return data ? { ok: true, items: data.items, packing: data.packing } : { ok: false };
}

// F19 대화 한 턴. 모드 없이 답장·제안·다음 말 추천을 한 번에 받는다. ([hyunw0000-f19-ai-planner] 결정 3)
const ChatSchema = z.object({
  reply: z.string(),
  items: z.array(
    z.object({
      kind: z.enum(ITEM_KINDS),
      day: z.number().nullable(),
      time: z.string().nullable(),
      name: z.string(),
      address: z.string(),
      area: z.string(),
      duration_min: z.number().nullable(),
      memo: z.string(),
      reason: z.string(),
    }),
  ),
  // 저장된 일정 고치기·지우기. ref는 <existing>의 "#번호"
  changes: z.array(
    z.object({
      ref: z.string(),
      action: z.enum(["update", "delete"]),
      day: z.number().nullable(),
      time: z.string().nullable(),
      name: z.string().nullable(),
      address: z.string().nullable(),
      memo: z.string().nullable(),
    }),
  ),
  quick_replies: z.array(z.string()),
});

export type ChatResult =
  | { ok: true; reply: string; items: RawProposalItem[]; changes: RawChange[]; quickReplies: string[] }
  | { ok: false };

export async function chatWithAi(input: string): Promise<ChatResult> {
  const data = await callAi({ label: "chat", system: CHAT_SYSTEM_PROMPT, input, schema: ChatSchema, maxOutputTokens: 4096 });
  return data
    ? { ok: true, reply: data.reply, items: data.items, changes: data.changes, quickReplies: data.quick_replies }
    : { ok: false };
}
