// 준비물 목록 다루기 (C9 F27). 준비물 체크리스트는 브라우저에만 저장한다(B76, B100). 여기는 저장과 상관없는 순수 함수만 둔다.
// - 붙여넣기 추출: AI가 준비물을 메모 항목이 아니라 packing 목록으로 돌려준다 → cleanPackingLabels로 다듬어 체크리스트에 더한다.
// - "준비물: 여권, 충전기"처럼 준비물만 적은 말은 AI를 부르지 않고 packingFromMessage로 바로 나눈다(대화로 가면 준비물을 다루지 않는다, B116).

export type Check = { id: string; label: string; done: boolean };

export const PACKING_LABEL_MAX = 40; // 준비물 입력 칸(maxLength)과 같다
export const PACKING_MAX = 30; // 한 번에 더하는 개수

// 글머리표(-, •, ☐ …)나 "1." "2)" 같은 번호만 뗀다. "110V 어댑터"의 숫자는 그대로 둔다.
const BULLET = /^\s*(?:[-–—•·*▪◦☐☑✓✔□■]+|\d{1,2}[.)])\s*/;
const HEADER = /^\s*(?:준비물|챙길\s?것|가져갈\s?것|짐\s?목록|짐\s?리스트|packing(?:\s?list)?)\s*[:：]?\s*/i;
const NOT_A_LABEL = /https?:\/\/|\b(?:[01]?\d|2[0-3]):[0-5]\d\b|\d{4}[-./]\d{1,2}[-./]\d{1,2}/;

// 앞의 글머리표·번호를 떼고, 빈 것·너무 긴 것을 정리하고, 같은 이름(대소문자·띄어쓰기 무시)은 하나만 둔다.
export function cleanPackingLabels(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    const label = value.replace(BULLET, "").replace(/\s+/g, " ").trim().slice(0, PACKING_LABEL_MAX).trim();
    const key = label.toLowerCase().replace(/\s/g, "");
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= PACKING_MAX) break;
  }
  return out;
}

// 말로 적은 목록: "수영복하고 돼지코랑", "그리고", "음..". 쉼표가 없어 직접 나누면 한 덩어리가 된다.
const SPOKEN = /(?:하고|이랑|랑|그리고|및|이나|or|and)(?:\s|$)|\.\.|…/i;
const MAX_LABEL_WORDS = 3; // "선크림 SPF 50", "110V 어댑터"

// 준비물만 적은 말이면: 짧은 목록이면 그 목록, 말로 적은 문장이면 "ai"(AI 추출이 물건마다 나눈다), 아니면 null.
// 첫 줄이 "준비물:" 같은 제목으로 시작하고, 나머지 줄은 모두 짧은 줄(시각·날짜·주소 링크 없음)이어야 한다.
// 쉼표·줄바꿈으로 나눈다. ([haeans-f27-back-fixes] 결정 2·6)
export function packingFromMessage(text: string): string[] | "ai" | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length || !HEADER.test(lines[0])) return null;
  const body = [lines[0].replace(HEADER, ""), ...lines.slice(1)].filter(Boolean);
  if (body.some((l) => l.length > 80 || NOT_A_LABEL.test(l))) return null;
  const pieces = body.flatMap((l) => l.split(/[,，、]/)).map((p) => p.trim()).filter(Boolean);
  if (pieces.some((p) => SPOKEN.test(p) || p.split(/\s+/).length > MAX_LABEL_WORDS)) return "ai";
  const labels = cleanPackingLabels(pieces);
  return labels.length ? labels : null;
}

// 지금 목록에 없는 것만 뒤에 더한다. added: 새로 더한 개수.
export function mergePacking(checks: Check[], labels: string[], makeId: (i: number) => string): { next: Check[]; added: number } {
  const have = new Set(checks.map((c) => c.label.toLowerCase().replace(/\s/g, "")));
  const fresh = cleanPackingLabels(labels).filter((l) => !have.has(l.toLowerCase().replace(/\s/g, "")));
  return { next: [...checks, ...fresh.map((label, i) => ({ id: makeId(i), label, done: false }))], added: fresh.length };
}
