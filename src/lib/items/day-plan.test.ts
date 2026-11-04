import { describe, expect, it } from "vitest";
import { dayHub, daySchedule, type DayEntry } from "./day-plan";
import type { Item } from "./types";

let seq = 0;
function item(over: Partial<Item>): Item {
  seq += 1;
  return {
    id: over.name ?? `i${seq}`, trip_id: "t", day: 1, time: null, position: seq, kind: "sight", name: `i${seq}`, address: "", lat: null, lng: null,
    memo: "", link: "", cost_amount: null, cost_currency: null, source: "manual", created_at: "", updated_at: "", ...over,
  };
}

const show = (entries: DayEntry[]) => entries.map((e) => `${e.role}:${e.item.name}${e.side ? `(${e.side})` : ""}`);

// 오사카·교토 4일: 1일차 도착, 3일차 신칸센으로 교토 이동, 4일차 귀국
const trip = [
  item({ day: 1, time: "09:00:00", kind: "transport", name: "KE723 인천 → 간사이" }),
  item({ day: 1, time: "12:00:00", kind: "transport", name: "JR 하루카 간사이공항 → 신오사카" }),
  item({ day: 1, time: "14:00:00", name: "오사카성" }),
  item({ day: 1, time: "15:00:00", kind: "lodging", name: "오사카 호텔" }),
  item({ day: 1, time: "19:00:00", kind: "food", name: "도톤보리 라멘" }),
  item({ day: 2, time: "10:00:00", name: "USJ" }),
  item({ day: 2, kind: "transport", name: "간사이 레일패스" }),
  item({ day: 3, time: "09:00:00", kind: "transport", name: "신칸센 신오사카 → 교토" }),
  item({ day: 3, time: "11:00:00", name: "기요미즈데라" }),
  item({ day: 3, time: "15:00:00", kind: "lodging", name: "교토 료칸" }),
  item({ day: 4, time: "09:00:00", name: "후시미 이나리" }),
  item({ day: 4, time: "18:00:00", kind: "transport", name: "KE724 간사이 → 인천" }),
  item({ day: 4, kind: "memo", name: "환전" }),
];

describe("daySchedule", () => {
  it("첫날: 도착 공항에서 시작해 그날 숙소로 끝난다. 중간 교통(하루카)은 빠진다", () => {
    expect(show(daySchedule(1, trip))).toEqual(["start:KE723 인천 → 간사이(to)", "place:오사카성", "place:도톤보리 라멘", "end:오사카 호텔"]);
  });
  it("가운데 날: 관광지·식당만. 숙소·교통 패스는 넣지 않는다", () => {
    expect(show(daySchedule(2, trip))).toEqual(["place:USJ"]);
  });
  it("도시를 옮기는 가운데 날도 신칸센·새 숙소 없이 장소만", () => {
    expect(show(daySchedule(3, trip))).toEqual(["place:기요미즈데라"]);
  });
  it("마지막 날: 전날 숙소에서 시작해 출발 공항으로 끝난다. 메모는 빠진다", () => {
    expect(show(daySchedule(4, trip))).toEqual(["start:교토 료칸", "place:후시미 이나리", "end:KE724 간사이 → 인천(from)"]);
  });
  it("그날 일정이 없으면 빈 목록", () => {
    expect(daySchedule(5, trip)).toEqual([]);
  });
  it("교통·숙소가 없으면 장소만", () => {
    const only = [item({ day: 1, name: "A" }), item({ day: 2, kind: "food", name: "B" })];
    expect(show(daySchedule(1, only))).toEqual(["place:A"]);
    expect(show(daySchedule(2, only))).toEqual(["place:B"]);
  });
  it("첫날·마지막 날은 일정이 있는 처음·마지막 일차다", () => {
    const items = [
      item({ day: 2, time: "09:00:00", kind: "transport", name: "KTX 101 서울 → 부산" }),
      item({ day: 2, time: "15:00:00", kind: "lodging", name: "해운대 호텔" }),
      item({ day: 3, name: "해동용궁사" }),
      item({ day: 3, time: "18:00:00", kind: "transport", name: "KTX 120 부산 → 서울" }),
    ];
    expect(show(daySchedule(2, items))).toEqual(["start:KTX 101 서울 → 부산(to)", "end:해운대 호텔"]);
    expect(show(daySchedule(3, items))).toEqual(["start:해운대 호텔", "place:해동용궁사", "end:KTX 120 부산 → 서울(from)"]);
  });
  it("하루짜리 여행: 도착 거점으로 시작해 출발 거점으로 끝난다", () => {
    const items = [
      item({ day: 1, time: "08:00:00", kind: "transport", name: "KE1101 김포 → 제주" }),
      item({ day: 1, time: "12:00:00", name: "성산일출봉" }),
      item({ day: 1, time: "20:00:00", kind: "transport", name: "KE1120 제주 → 김포" }),
    ];
    expect(show(daySchedule(1, items))).toEqual(["start:KE1101 김포 → 제주(to)", "place:성산일출봉", "end:KE1120 제주 → 김포(from)"]);
  });
  it("거점 이름이 없는 교통(화살표 없음)은 시작·끝이 되지 않는다", () => {
    const items = [item({ day: 1, kind: "transport", name: "KE723" }), item({ day: 1, name: "A" })];
    expect(show(daySchedule(1, items))).toEqual(["place:A"]);
  });
});

describe("dayHub", () => {
  it("비행기는 공항 이름, 기차는 역, 버스는 터미널", () => {
    expect(dayHub(item({ kind: "transport", name: "KE723 ICN → KIX" }), "to")).toEqual({ kind: "airport", name: "간사이 공항" });
    expect(dayHub(item({ kind: "transport", name: "KE723 인천 → 간사이" }), "from")).toEqual({ kind: "airport", name: "인천 공항" });
    expect(dayHub(item({ kind: "transport", name: "KTX 101 서울 → 부산" }), "to")).toEqual({ kind: "station", name: "부산 역" });
    expect(dayHub(item({ kind: "transport", name: "동서울 -> 속초 고속버스" }), "from")).toEqual({ kind: "terminal", name: "동서울 터미널" });
    expect(dayHub(item({ kind: "transport", name: "간사이 레일패스" }), "to")).toBeNull();
    expect(dayHub(item({ kind: "lodging", name: "호텔" }), "to")).toBeNull();
  });
});
