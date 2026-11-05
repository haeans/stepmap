import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { CallOptions } from "./ai";

// C10 F33: 배포 받은 Claude 키로 부른다. 키가 없으면 null을 돌려 Gemini로 넘어간다.
const MODEL = "claude-sonnet-5-5";

// Claude는 max_tokens 안에 생각(thinking) 토큰도 들어간다. Gemini와 같은 답 길이를 받으려고 두 배로 둔다.
const THINKING_HEADROOM = 2;

// 실패하면 다시 부르지 않고 null을 돌려 Gemini에 넘긴다. (B17과 같은 이유로 같은 모델 재시도 없음)
export async function callClaude<T>({ label, system, input, schema, maxOutputTokens }: CallOptions<T>): Promise<T | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 60_000 });

  try {
    const message = await client.messages.parse({
      model: MODEL,
      max_tokens: maxOutputTokens * THINKING_HEADROOM,
      system,
      messages: [{ role: "user", content: input }],
      // Gemini의 thinking_level "low"와 맞춘다.
      output_config: { effort: "low", format: zodOutputFormat(schema) },
    });
    // 거절(refusal)·길이 초과(max_tokens)는 답이 온전하지 않아 버린다.
    if (message.stop_reason !== "end_turn" || message.parsed_output == null) {
      console.error(`${label} failed:`, MODEL, message.stop_reason ?? "no_output");
      return null;
    }
    // 앱 쪽 스키마로 한 번 더 확인한다(Gemini와 같은 기준).
    const parsed = schema.safeParse(message.parsed_output);
    return parsed.success ? parsed.data : null;
  } catch (error) {
    // 원문·대화가 섞일 수 있어 모델과 오류 이름·상태만 남긴다. (B15)
    const status = error instanceof Anthropic.APIError ? error.status : undefined;
    console.error(`${label} failed:`, MODEL, error instanceof Error ? error.name : "unknown", status ?? "");
    return null;
  }
}
