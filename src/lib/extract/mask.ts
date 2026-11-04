// AI에 보내기 전에 원문 속 개인정보를 가린다. (B18)
// Gemini 무료 등급은 보낸 내용을 서비스 개선에 쓰고 사람이 볼 수 있다.
// 링크·예약번호는 vault.ts가 먼저 자리표시로 바꾼다(C8 F20). 여기서는 저장 금지 정보(sensitive.ts)와 이메일·전화번호를 가린다.
// 이름은 가릴 수 없으므로 화면에서 안내한다.

import { stripForbidden } from "@/lib/items/sensitive";

const EMAIL_RE = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
const PHONE_RE = /(\+\d{1,3}[- .]?)?\(?0?\d{1,3}\)?[- .]\d{3,4}[- .]\d{4}\b/g;

export function maskPersonal(text: string): string {
  return stripForbidden(text.replace(EMAIL_RE, "[이메일]"), { loose: true }).replace(PHONE_RE, "[전화번호]");
}
