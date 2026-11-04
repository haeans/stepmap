import { describe, expect, it } from "vitest";
import { hideForAi, revealOne, stripPlaceholders } from "./vault";

describe("hideForAi", () => {
  it("링크와 예약번호를 자리표시로 바꾸고, 편명·날짜·시각·좌석은 그대로 둔다", () => {
    const { text, vault } = hideForAi(
      "대한항공 KE1101 2026-11-08 09:00 김포→김해\n예약번호: K7Q2XM 좌석 12A\n관리: https://air.example.com/m?pnr=K7Q2XM",
    );
    expect(text).toBe("대한항공 KE1101 2026-11-08 09:00 김포→김해\n예약번호: [예약번호1] 좌석 12A\n관리: [링크1]");
    expect(vault).toEqual({ links: ["https://air.example.com/m?pnr=K7Q2XM"], bookings: ["K7Q2XM"] });
  });

  it("영문 메일 문구도 잡는다", () => {
    const { text, vault } = hideForAi("Booking reference: ABCDEF\nConfirmation No. 1234-5678\nPNR XYZ12");
    expect(vault.bookings).toEqual(["ABCDEF", "1234-5678", "XYZ12"]);
    expect(text).not.toMatch(/ABCDEF|1234-5678|XYZ12/);
  });

  it("이름 없이 적힌 숫자나 코드가 아닌 말은 건드리지 않는다", () => {
    const src = "KE1101 09:00 확인 번호: 필요 없음";
    expect(hideForAi(src)).toEqual({ text: src, vault: { links: [], bookings: [] } });
  });
});

describe("되돌리기", () => {
  const vault = { links: ["https://a.com/x"], bookings: ["K7Q2XM"] };

  it("자리표시를 원래 값으로", () => {
    expect(revealOne("[예약번호1]", vault, "예약번호")).toEqual({ value: "K7Q2XM", index: 0 });
    expect(revealOne("[링크1]", vault, "링크")).toEqual({ value: "https://a.com/x", index: 0 });
  });

  it("없는 번호나 지어낸 값은 비운다", () => {
    expect(revealOne("[예약번호2]", vault, "예약번호").value).toBe("");
    expect(revealOne("K7Q2XM", vault, "예약번호").value).toBe("");
    expect(revealOne("https://evil.example", vault, "링크").value).toBe("");
  });

  it("메모에 남은 자리표시는 지우고 알려 준다", () => {
    expect(stripPlaceholders("터미널 2, 예약번호 [예약번호1]")).toEqual({ text: "터미널 2,", found: [{ kind: "예약번호", index: 0 }] });
  });
});
