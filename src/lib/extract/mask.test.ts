import { describe, expect, it } from "vitest";
import { maskPersonal } from "./mask";

describe("maskPersonal", () => {
  it("이메일, 전화번호, 카드 번호, 주민등록번호, 여권번호를 가린다", () => {
    expect(maskPersonal("문의 hong.gd+trip@example.co.kr")).toBe("문의 [이메일]");
    expect(maskPersonal("연락처 010-1234-5678")).toBe("연락처 [전화번호]");
    expect(maskPersonal("Tel +852 2345 6789")).toBe("Tel [전화번호]");
    expect(maskPersonal("카드 1234-5678-9012-3456")).toBe("카드 [카드번호]");
    expect(maskPersonal("900101-1234567")).toBe("[주민등록번호]");
    expect(maskPersonal("여권 M12345678")).toBe("여권 [여권번호]");
  });

  it("일정에 필요한 날짜, 시각, 편명, 금액은 그대로 둔다", () => {
    const text = "2026-12-01 09:35 KE123 인천→홍콩 HKD 1,280.50 2026.12.03";
    expect(maskPersonal(text)).toBe(text);
  });
});
