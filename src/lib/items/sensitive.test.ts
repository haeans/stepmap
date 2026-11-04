import { describe, expect, it } from "vitest";
import { classifyLink, findForbidden, maskCode, maskLink, resolveLinkLevel, stripForbidden } from "./sensitive";

describe("classifyLink", () => {
  it("토큰·키·서명이 든 링크는 비밀", () => {
    expect(classifyLink("https://www.booking.com/mybooking.html?auth_key=x&token=abc")).toBe("secret");
    expect(classifyLink("https://air.example.com/manage?pnr=K7Q2XM&last=HONG")).toBe("secret");
    expect(classifyLink("https://hotel.example.com/r/9fA3kLmP0qRsTuVwXyZ12345")).toBe("secret");
  });

  it("그 밖의 예약 링크는 소유자만", () => {
    expect(classifyLink("https://www.koreanair.com/booking/my-trips")).toBe("owner");
    expect(classifyLink("https://www.agoda.com/account/bookings")).toBe("owner");
  });

  it("직접 고른 범위가 자동보다 앞선다", () => {
    expect(resolveLinkLevel("https://x.com/a?token=1", "public")).toBe("public");
    expect(resolveLinkLevel("https://x.com/a?token=1", "auto")).toBe("secret");
  });
});

describe("가리기", () => {
  it("예약번호는 앞뒤 두 글자만", () => {
    expect(maskCode("K7Q2XM")).toBe("K7••••XM");
    expect(maskCode("AB12")).toBe("A•••");
  });
  it("링크는 도메인만", () => {
    expect(maskLink("https://www.booking.com/x?token=1")).toBe("booking.com/••••");
  });
});

describe("저장 금지", () => {
  it("주민·외국인등록번호, 카드번호(Luhn), CVC, 유효기간, 비밀번호, 계좌, 여권, 인증번호를 찾는다", () => {
    expect(findForbidden("900101-1234567")).toBe("주민등록번호");
    expect(findForbidden("900101-5234567")).toBe("주민등록번호");
    expect(findForbidden("카드 4111 1111 1111 1111")).toBe("카드번호");
    expect(findForbidden("CVC: 123")).toBe("CVC");
    expect(findForbidden("유효기간 12/28")).toBe("카드 유효기간");
    expect(findForbidden("현관 비밀번호: 1234*")).toBe("비밀번호");
    expect(findForbidden("PW 0000")).toBe("비밀번호");
    expect(findForbidden("환불 계좌 국민 123456-01-234567")).toBe("계좌번호");
    expect(findForbidden("여권 M12345678")).toBe("여권번호");
    expect(findForbidden("인증번호 482913")).toBe("인증번호");
  });

  it("일정에 필요한 값과 평범한 글은 막지 않는다", () => {
    for (const ok of [
      "KE1101 김포→김해 09:00 좌석 12A 수하물 23kg",
      "예약번호 K7Q2XM",
      "전자항공권 1802345678901",
      "체크인 15:00, 조식 포함, 1,280.50 HKD",
      "비밀번호를 잊으면 프런트에 문의",
      "핀볼 카페, pinned 장소",
      "1234-5678-9012-3456", // Luhn에 맞지 않는 숫자
    ]) {
      expect(findForbidden(ok), ok).toBeNull();
    }
  });

  it("AI에 보낼 때는 카드 모양이면 모두 가린다", () => {
    expect(stripForbidden("카드 1234-5678-9012-3456", { loose: true })).toBe("카드 [카드번호]");
    expect(stripForbidden("카드 1234-5678-9012-3456")).toBe("카드 1234-5678-9012-3456");
  });
});
