import { describe, expect, it } from "vitest";
import { routeMessage } from "./route";

const EXTRACT = [
  // 항공권 메일
  `[대한항공] 예약 확인서
여정: KE723 인천(ICN) 2026-12-03 09:10 → 오사카 간사이(KIX) 11:05
KE724 간사이(KIX) 2026-12-06 12:30 → 인천(ICN) 14:20
결제 금액: 412,300원`,
  // 숙소 메일
  `Booking confirmation
Hotel Keihan Namba Grande
Check-in: Thu, Dec 3, 2026 (from 15:00)
Check-out: Sun, Dec 6, 2026 (until 11:00)
Total: JPY 54,000`,
  // 짧은 탑승권
  "7C 1102 김포→제주 12/3 08:30 탑승구 5",
  // 일정 메모 여러 줄
  `12월 3일 도톤보리 저녁
12월 4일 10:00 오사카성, 13:00 구로몬 시장
12월 5일 유니버설 스튜디오 재팬`,
  // 링크와 예약
  "https://www.klook.com/ko/activity/1234 우메다 공중정원 예약 12/4 18:00 2,000엔",
];

const CHAT = [
  "둘째 날 일정 짜 줘",
  "3일차 오후에 갈 만한 곳 추천해 줘",
  "저녁도 넣어 줘",
  "좀 더 여유 있게 바꿔 줄래?",
  "비 오면 뭐 하지?",
  "맛집 위주로",
  "아이랑 가는데 어디가 좋을까?",
  "12월 4일에 할 거 추천해 줘",
  "숙소 근처에서 저녁 먹을 곳 알려줘",
  "오사카성 넣고 나머지는 알아서 짜 줘",
  "고마워",
];

describe("routeMessage", () => {
  it.each(EXTRACT)("정보 덩어리는 추출로 보낸다 %#", (text) => {
    expect(routeMessage(text)).toBe("extract");
  });
  it.each(CHAT)("말을 거는 문장은 대화로 보낸다: %s", (text) => {
    expect(routeMessage(text)).toBe("chat");
  });
  it("애매한 짧은 정보는 대화로 보낸다(대화도 사용자가 준 장소·시각을 그대로 쓴다)", () => {
    expect(routeMessage("이치란 라멘 12시")).toBe("chat");
  });
});
