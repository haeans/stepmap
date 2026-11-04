// 예약 정보 보호 (C8 F20). 정보를 네 단계로 나눈다.
// - 공개: items에 저장. 공유받은 사람도 보고 AI에도 간다(항공사·편명·좌석·수하물 등).
// - 소유자만(owner): item_secrets에 저장. 가려서 보여 주고 소유자는 눌러서 본다(예약번호, 로그인이 필요한 예약 링크).
// - 비밀(secret): item_secrets에 저장. 주소를 보여 주지 않고 "열기"만 둔다(토큰이 든 링크).
// - 저장 금지: 저장하지 않고 AI에도 보내지 않는다(주민·외국인등록번호, 카드번호, CVC, 유효기간, 비밀번호, 계좌번호, 여권번호 등).
// 소유자만·비밀은 공유받은 사람에게 서버가 보내지 않는다(RLS). AI에는 자리표시로만 보낸다.

export type SecretLevel = "owner" | "secret";
// 입력 칸에서 고르는 링크 공개 범위. auto는 주소 모양으로 정한다.
export const LINK_LEVELS = ["auto", "owner", "secret", "public"] as const;
export type LinkLevel = (typeof LINK_LEVELS)[number];

export const LINK_LEVEL_LABELS: Record<LinkLevel, string> = {
  auto: "자동 (주소를 보고 정함)",
  owner: "나만 보기",
  secret: "나만 보기 · 주소 숨김",
  public: "공유한 사람도 보기",
};

// 로그인 없이 열리는 개인 링크로 보이는 표시: 쿼리·경로의 키 이름, 긴 무작위 문자열
const TOKEN_KEY_RE = /[?&#;/](?:token|access_?token|key|api_?key|sig|signature|auth|code|hash|session|sid|otp|pnr|confirmation|conf|reservation(?:_?id)?|booking_?(?:id|ref|code)?|ticket(?:_?id)?)=/i;
const RANDOM_RE = /[A-Za-z0-9_-]{20,}/;

// 주소 모양만 본다. 페이지를 열어 보지 않는다(링크 내용 읽어 오기는 확장 단계).
export function classifyLink(url: string): SecretLevel {
  let rest = url;
  try {
    const u = new URL(url);
    rest = `${u.pathname}${u.search}${u.hash}`;
  } catch {
    // 주소가 아니면 전체를 본다
  }
  return TOKEN_KEY_RE.test(rest) || RANDOM_RE.test(rest) ? "secret" : "owner";
}

export function resolveLinkLevel(url: string, chosen: LinkLevel): SecretLevel | "public" {
  return chosen === "auto" ? classifyLink(url) : chosen;
}

// 예약번호 가리기: 앞뒤 두 글자만. 짧으면 앞 한 글자만.
export function maskCode(code: string): string {
  const c = code.trim();
  if (!c) return "";
  if (c.length <= 4) return `${c[0]}•••`;
  return `${c.slice(0, 2)}••••${c.slice(-2)}`;
}

// 링크 가리기: 도메인만
export function maskLink(url: string): string {
  try {
    return `${new URL(url).hostname.replace(/^www\./, "")}/••••`;
  } catch {
    return "••••";
  }
}

// ───────── 저장 금지 ─────────

// 카드번호는 Luhn 검사를 통과할 때만 본다(긴 숫자를 잘못 막지 않게).
function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

// 주민·외국인등록번호: 앞 6자리가 날짜여야 한다. 하이픈 없이 13자리만 있으면 전자항공권 번호와 겹치므로 검증 숫자까지 맞을 때만.
function looksLikeRrn(match: string): boolean {
  const d = match.replace(/\D/g, "");
  const month = Number(d.slice(2, 4));
  const day = Number(d.slice(4, 6));
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  if (/[- ]/.test(match)) return true;
  const w = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  const sum = w.reduce((s, x, i) => s + x * Number(d[i]), 0);
  return (11 - (sum % 11)) % 10 === Number(d[12]);
}

type Rule = { label: string; re: RegExp; test?: (match: string) => boolean };

// 앞에 이름이 붙어야 알 수 있는 값(CVC·유효기간·비밀번호·계좌·인증번호)은 그 말이 바로 앞에 있을 때만 잡는다.
export const FORBIDDEN: Rule[] = [
  { label: "주민등록번호", re: /\b\d{6}[- ]?[1-8]\d{6}\b/g, test: looksLikeRrn },
  { label: "카드번호", re: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{3,4}\b/g, test: (m) => luhn(m.replace(/\D/g, "")) },
  { label: "CVC", re: /(?:CVC|CVV2?|CSC|보안\s*코드|security\s*code)\s*[:：#]?\s*\d{3,4}\b/gi },
  { label: "카드 유효기간", re: /(?:유효\s*기간|만료\s*일?|exp(?:iry|iration)?(?:\s*date)?|valid\s*thru)\s*[:：]?\s*\d{2}\s*\/\s*\d{2,4}/gi },
  // "비밀번호: 1234", "PW 1234"처럼 이름 뒤에 구분(: =)이나 숫자가 올 때만. "비밀번호를 바꾸세요" 같은 글은 잡지 않는다.
  { label: "비밀번호", re: /(?:비밀\s*번호|비번|패스워드|\bpassword|\bpasscode|\bpw|\bpin)(?:\s*[:：=]\s*\S{2,}|\s+\d{3,})/gi },
  { label: "인증번호", re: /(?:인증\s*번호|OTP|verification\s*code)\s*[:：]?\s*\d{4,8}\b/gi },
  { label: "계좌번호", re: /(?:계좌(?:\s*번호)?|account\s*(?:no\.?|number))\s*[:：]?\s*[^\d\n]{0,12}\d[\d-]{7,20}\d/gi },
  { label: "여권번호", re: /\b[A-Z]{1,2}\d{7,8}\b/g },
  { label: "운전면허번호", re: /\b\d{2}-\d{2}-\d{6}-\d{2}\b/g },
];

function matches(rule: Rule, text: string): string[] {
  return [...text.matchAll(rule.re)].map((m) => m[0]).filter((m) => !rule.test || rule.test(m));
}

// 저장 금지 정보가 있으면 그 이름을 돌려준다(직접 입력·수정 검사).
export function findForbidden(text: string): string | null {
  for (const rule of FORBIDDEN) if (matches(rule, text).length) return rule.label;
  return null;
}

// 저장 금지 정보를 "[이름]"으로 바꾼다. AI에 보낼 때(loose)는 카드 모양이면 Luhn 검사 없이 가린다(더 넓게 가림).
export function stripForbidden(text: string, { loose = false } = {}): string {
  return FORBIDDEN.reduce((out, rule) => out.replace(rule.re, (m) => (loose || !rule.test || rule.test(m) ? `[${rule.label}]` : m)), text);
}
