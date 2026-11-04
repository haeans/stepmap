// AI에 보내기 전에 원문의 링크와 예약번호를 자리표시로 바꾸고, 결과가 돌아오면 원래 값으로 되돌린다. (C8 F20, B18 고침)
// AI는 "[링크1]", "[예약번호1]"만 보고 어느 항목의 것인지 정한다. 원래 값은 서버에만 있다.

// "예약번호·확인번호·PNR·Booking ref" 같은 말 바로 뒤의 값만 예약번호로 본다(편명·시각을 잘못 가리지 않게).
const BOOKING_RE =
  /((?:예약|예매|확인|발권|승차권|항공권|티켓|전자\s*티켓)\s*(?:번호|코드)|\bPNR|\bbooking\s*(?:no\.?|number|ref(?:erence)?|code|id)|\bconfirmation\s*(?:no\.?|number|code|#)?|\breservation\s*(?:no\.?|number|code|id)|\be-?ticket\s*(?:no\.?|number))(\s*[:：#]?\s*)([A-Za-z0-9][A-Za-z0-9-]{3,29})/gi;
const URL_RE = /https?:\/\/[^\s<>"'）)\]]+/gi;
const PLACEHOLDER_RE = /\[(링크|예약번호)(\d+)\]/g;

export type Vault = { links: string[]; bookings: string[] };

// 숫자가 있거나, 대문자 5~8자(항공 PNR 모양)인 값만 예약번호로 본다. "확인 번호: 필요" 같은 글은 빼고.
function looksLikeCode(value: string): boolean {
  return /\d/.test(value) || /^[A-Z]{5,8}$/.test(value);
}

export function hideForAi(text: string): { text: string; vault: Vault } {
  const vault: Vault = { links: [], bookings: [] };
  const withoutLinks = text.replace(URL_RE, (url) => {
    vault.links.push(url);
    return `[링크${vault.links.length}]`;
  });
  const out = withoutLinks.replace(BOOKING_RE, (all, label: string, sep: string, code: string) => {
    if (!looksLikeCode(code)) return all;
    vault.bookings.push(code);
    return `${label}${sep}[예약번호${vault.bookings.length}]`;
  });
  return { text: out, vault };
}

// 자리표시 하나를 원래 값으로. 없는 번호나 다른 글이면 빈 문자열.
export function revealOne(value: string, vault: Vault, kind: "링크" | "예약번호"): { value: string; index: number | null } {
  const m = value.trim().match(/^\[(링크|예약번호)(\d+)\]$/);
  if (!m || m[1] !== kind) return { value: "", index: null };
  const index = Number(m[2]) - 1;
  const list = kind === "링크" ? vault.links : vault.bookings;
  return index >= 0 && index < list.length ? { value: list[index], index } : { value: "", index: null };
}

// 이름·주소·메모에 남은 자리표시를 지우고, 어떤 것이 있었는지 알려 준다(공개 칸에 원래 값이 들어가지 않게).
export function stripPlaceholders(text: string): { text: string; found: { kind: "링크" | "예약번호"; index: number }[] } {
  const found: { kind: "링크" | "예약번호"; index: number }[] = [];
  const out = text.replace(PLACEHOLDER_RE, (_all, kind: "링크" | "예약번호", n: string) => {
    found.push({ kind, index: Number(n) - 1 });
    return "";
  });
  return { text: out.replace(/[ \t]{2,}/g, " ").replace(/(예약|확인)\s*번호\s*[:：]?\s*(?=\n|$)/g, "").trim(), found };
}
