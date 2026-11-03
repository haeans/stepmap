import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { ITEM_KINDS } from "@/lib/items/types";
import type { RawItem } from "./normalize";
import { SYSTEM_PROMPT, userMessage, type ExistingItem, type TripContext } from "./prompt";

// AI 공급자를 부르는 곳은 이 파일 하나다. 공급자를 바꾸면 이 파일만 바꾼다. (B14)

// 무료 등급 한도가 가장 넉넉한 두 모델만 쓴다. 한도는 모델마다 따로 센다. (B19)
const MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"] as const;

// 한도 초과(429)나 과부하(503)는 요청을 처리하지 않고 돌려보낸 것이라 다음 모델로 넘긴다.
// 그 밖의 실패는 다른 모델로 바꿔도 같을 가능성이 커서 바로 끝낸다.
function shouldTryNext(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  return status === 429 || status === 503;
}

// Gemini는 숫자 범위나 배열 길이 제한이 붙은 스키마를 거절한다("too many states").
// 그래서 스키마는 단순하게 두고, 일차 범위와 항목 수는 normalize.ts에서 맞춘다.
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
      cost_amount: z.number().nullable(),
      cost_currency: z.string().nullable(),
      // F18 추천 칸
      suggested_day: z.number().nullable(),
      suggested_time: z.string().nullable(),
      reason: z.string(),
    }),
  ),
});

const JSON_SCHEMA = z.toJSONSchema(ExtractSchema);

export type ExtractResult = { ok: true; items: RawItem[] } | { ok: false };

// 첫 모델이 한도·과부하로 거절했을 때만 둘째 모델을 부른다. (B19)
export async function extractWithGemini(trip: TripContext, text: string, existing: ExistingItem[] = []): Promise<ExtractResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false };
  const client = new GoogleGenAI({ apiKey });

  for (const model of MODELS) {
    try {
      const interaction = await client.interactions.create(
        {
          model,
          system_instruction: SYSTEM_PROMPT,
          input: userMessage(trip, text, existing),
          response_format: { type: "text", mime_type: "application/json", schema: JSON_SCHEMA },
          generation_config: { max_output_tokens: 8192, thinking_level: "low" },
          store: false,
        },
        { maxRetries: 0, timeout: 60_000 },
      );
      if (interaction.status !== "completed" || !interaction.output_text) return { ok: false };
      const parsed = ExtractSchema.safeParse(JSON.parse(interaction.output_text));
      return parsed.success ? { ok: true, items: parsed.data.items } : { ok: false };
    } catch (error) {
      // 원문이 섞일 수 있어 모델과 오류 이름만 남긴다. (B15)
      console.error("extract failed:", model, error instanceof Error ? error.name : "unknown");
      if (!shouldTryNext(error)) return { ok: false };
    }
  }
  return { ok: false };
}
