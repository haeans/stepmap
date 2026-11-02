import { describe, expect, it } from "vitest";
import { parsePlaceInfo } from "./place-info-parse";

describe("parsePlaceInfo", () => {
  it("첫 장소의 사진·작가·영업시간·지도 링크·평점을 뽑는다", () => {
    expect(
      parsePlaceInfo({
        places: [
          {
            photos: [{ name: "places/a/photos/b", authorAttributions: [{ displayName: "홍길동" }] }],
            regularOpeningHours: { weekdayDescriptions: ["월요일: 오전 8:00~오후 6:00"] },
            googleMapsUri: "https://maps.google.com/?cid=1",
            rating: 4.5,
          },
        ],
      }),
    ).toEqual({
      photoName: "places/a/photos/b",
      photoUrl: null,
      photoCredit: "홍길동",
      hours: ["월요일: 오전 8:00~오후 6:00"],
      mapsUrl: "https://maps.google.com/?cid=1",
      rating: 4.5,
    });
  });

  it("찾은 곳이 없으면 null, 값이 없으면 빈 값", () => {
    expect(parsePlaceInfo({})).toBeNull();
    expect(parsePlaceInfo({ places: [] })).toBeNull();
    expect(parsePlaceInfo({ places: [{}] })).toEqual({ photoName: null, photoUrl: null, photoCredit: null, hours: [], mapsUrl: null, rating: null });
  });
});
