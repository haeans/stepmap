// F19: 입력칸 하나에서 붙여넣기(추출)와 대화를 나눈다. 모델이 아니라 코드가 고른다. ([hyunw0000-f19-ai-planner] 결정 1)
// 티켓·예약 메일처럼 정보 덩어리면 추출, 말을 거는 문장이면 대화. 애매하면 대화로 보낸다.

export type Route = "extract" | "chat";

// 대화로 보낼 수 있는 말의 길이(붙여넣기는 MAX_TEXT_LENGTH 5,000자). [hyunw0000-f19-ai-planner] 결정 6
export const MAX_CHAT_LENGTH = 1000;

const FLIGHT_RE = /\b(?:[A-Z]{2}|[A-Z]\d|\d[A-Z])\s?\d{2,4}\b/; // KE723, 7C 1102, OZ 102
const DATE_RE = /\d{4}[-./]\s?\d{1,2}[-./]\s?\d{1,2}|\d{1,2}\s?월\s?\d{1,2}\s?일|\b\d{1,2}\/\d{1,2}\b/;
const TIME_RE = /\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g;
const BOOKING_RE =
  /예약|확인서|확정|체크\s?인|체크\s?아웃|check-?in|check-?out|booking|reservation|confirmation|itinerary|탑승|출발|도착|결제|영수증|승객|객실|투숙|좌석|편명|terminal|터미널|gate|게이트/i;
const MONEY_RE = /[₩$¥€£]\s?\d|\d[\d,]*(?:\.\d+)?\s?(?:원|엔|달러|위안|유로|KRW|JPY|USD|HKD|EUR|TWD|THB)\b/;
const URL_RE = /https?:\/\//;
// 말을 거는 끝맺음: "~줘", "~할까?", "~어때", "~싶어", 물음표
const ASK_END_RE = /(?:줘|주세요|줄래|할까|볼까|갈까|어때|어떨까|싶어|싶어요|알려|추천|해요|하자|\?|？)[.!~\s]*$/;
const ASK_WORD_RE = /짜\s?줘|짜\s?주|추천|넣어\s?줘|바꿔|여유|일정\s?좀|뭐\s?하|어디\s?가|어때|도와/;

export function pasteScore(text: string): number {
  let score = 0;
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).length;
  if (text.length >= 150) score += 1;
  if (text.length >= 400) score += 1;
  if (lines >= 3) score += 1;
  if (FLIGHT_RE.test(text)) score += 2;
  if (DATE_RE.test(text)) score += 1;
  if ((text.match(TIME_RE)?.length ?? 0) >= 2) score += 1;
  if (BOOKING_RE.test(text)) score += 2;
  if (MONEY_RE.test(text)) score += 1;
  if (URL_RE.test(text)) score += 1;
  return score;
}

export function chatScore(text: string): number {
  let score = 0;
  const trimmed = text.trim();
  if (ASK_END_RE.test(trimmed)) score += 2;
  if (ASK_WORD_RE.test(trimmed)) score += 2;
  if (trimmed.length < 80) score += 1;
  return score;
}

export function routeMessage(text: string): Route {
  const paste = pasteScore(text);
  return paste >= 3 && paste > chatScore(text) ? "extract" : "chat";
}
