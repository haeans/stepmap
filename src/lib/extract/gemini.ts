import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { CHAT_SYSTEM_PROMPT } from "@/lib/assistant/prompt";
import type { RawChange, RawProposalItem } from "@/lib/assistant/proposal";
import { ITEM_KINDS } from "@/lib/items/types";
import type { RawItem } from "./normalize";
import { SYSTEM_PROMPT, userMessage, type ExistingItem, type TripContext } from "./prompt";

// AI 공급자를 부르는 곳은 이 파일 하나다. 공급자를 바꾸면 이 파일만 바꾼다. (B14)
// 붙여넣기 추출(R-04, F18)과 대화 도우미(F19)가 같은 호출 함수를 쓴다.

// 무료 등급 한도가 가장 넉넉한 두 모델만 쓴다. 한도는 모델마다 따로 센다. (B19)
const MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"] as const;

// 한도 초과(429)나 과부하(503)는 요청을 처리하지 않고 돌려보낸 것이라 다음 모델로 넘긴다.
// 그 밖의 실패는 다른 모델로 바꿔도 같을 가능성이 커서 바로 끝낸다.
function shouldTryNext(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  return status === 429 || status === 503;
}

type CallOptions<T> = { label: string; system: string; input: string; schema: z.ZodType<T>; maxOutputTokens: number };

// 첫 모델이 한도·과부하로 거절했을 때만 둘째 모델을 부른다. 같은 모델로 다시 부르지 않는다. (B17, B19)
async function callGemini<T>({ label, system, input, schema, maxOutputTokens }: CallOptions<T>): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const client = new GoogleGenAI({ apiKey });
  const jsonSchema = z.toJSONSchema(schema);

  for (const model of MODELS) {
    try {
      const interaction = await client.interactions.create(
        {
          model,
          system_instruction: system,
          input,
          response_format: { type: "text", mime_type: "application/json", schema: jsonSchema },
          generation_config: { max_output_tokens: maxOutputTokens, thinking_level: "low" },
          store: false,
        },
        { maxRetries: 0, timeout: 60_000 },
      );
      if (interaction.status !== "completed" || !interaction.output_text) return null;
      const parsed = schema.safeParse(JSON.parse(interaction.output_text));
      return parsed.success ? parsed.data : null;
    } catch (error) {
      // 원문·대화가 섞일 수 있어 모델과 오류 이름만 남긴다. (B15)
      console.error(`${label} failed:`, model, error instanceof Error ? error.name : "unknown");
      if (!shouldTryNext(error)) return null;
    }
  }
  return null;
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

export async function extractWithGemini(trip: TripContext, text: string, existing: ExistingItem[] = []): Promise<ExtractResult> {
  const data = await callGemini({
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

export async function chatWithGemini(input: string): Promise<ChatResult> {
  const data = await callGemini({ label: "chat", system: CHAT_SYSTEM_PROMPT, input, schema: ChatSchema, maxOutputTokens: 4096 });
  return data
    ? { ok: true, reply: data.reply, items: data.items, changes: data.changes, quickReplies: data.quick_replies }
    : { ok: false };
}
