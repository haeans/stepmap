import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { CallOptions } from "./ai";

// Gemini 호출. 입구는 ai.ts이고, Claude가 실패하거나 키가 없을 때 여기로 온다. (B14, C10 F33)

// 무료 등급 한도가 가장 넉넉한 두 모델만 쓴다. 한도는 모델마다 따로 센다. (B19)
const MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"] as const;

// 한도 초과(429)나 과부하(503)는 요청을 처리하지 않고 돌려보낸 것이라 다음 모델로 넘긴다.
// 그 밖의 실패는 다른 모델로 바꿔도 같을 가능성이 커서 바로 끝낸다.
function shouldTryNext(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  return status === 429 || status === 503;
}

// 첫 모델이 한도·과부하로 거절했을 때만 둘째 모델을 부른다. 같은 모델로 다시 부르지 않는다. (B17, B19)
export async function callGemini<T>({ label, system, input, schema, maxOutputTokens }: CallOptions<T>): Promise<T | null> {
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
