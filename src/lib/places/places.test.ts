import { describe, expect, it } from "vitest";
import { distanceMeters, SAME_PLACE_METERS } from "./distance";
import { photoAuthors, pickPhoto } from "./photo";
import { pickPageImage, stripHtml, toWikimediaPhoto } from "./wikimedia";

describe("pickPhoto (Google)", () => {
  it("가로 사진 첫 장을 고른다", () => {
    const photos = [
      { name: "p/1", widthPx: 600, heightPx: 900 },
      { name: "p/2", widthPx: 1200, heightPx: 800 },
      { name: "p/3", widthPx: 1600, heightPx: 900 },
    ];
    expect(pickPhoto(photos)?.name).toBe("p/2");
  });

  it("가로 사진이 없거나 사진이 없으면 null", () => {
    expect(pickPhoto([{ name: "p/1", widthPx: 600, heightPx: 900 }])).toBeNull();
    expect(pickPhoto(undefined)).toBeNull();
    expect(pickPhoto([{ widthPx: 1200, heightPx: 800 }])).toBeNull();
  });
});

describe("photoAuthors (Google)", () => {
  it("이름이 있는 작가만, 링크는 https만", () => {
    expect(
      photoAuthors({
        authorAttributions: [{ displayName: "김여행", uri: "https://maps.google.com/maps/contrib/1" }, { displayName: "Lee", uri: "javascript:x" }, { uri: "https://x" }],
      }),
    ).toEqual([
      { name: "김여행", uri: "https://maps.google.com/maps/contrib/1" },
      { name: "Lee", uri: null },
    ]);
  });
});

describe("pickPageImage (Wikimedia)", () => {
  const osakaCastle = { lat: 34.6873, lng: 135.5262 };

  it("좌표가 가까운 문서의 대표 사진", () => {
    const pages = [
      { index: 2, pageimage: "Far.jpg", coordinates: [{ lat: 35.0, lon: 135.7 }] },
      { index: 1, pageimage: "Osaka_Castle.jpg", coordinates: [{ lat: 34.6872, lon: 135.5258 }] },
    ];
    expect(pickPageImage(pages, osakaCastle)).toBe("Osaka_Castle.jpg");
  });

  it("좌표가 없거나 멀면 같은 장소로 보지 않는다", () => {
    expect(pickPageImage([{ index: 1, pageimage: "A.jpg" }], osakaCastle)).toBeNull();
    expect(pickPageImage([{ index: 1, pageimage: "A.jpg", coordinates: [{ lat: 34.7, lon: 135.55 }] }], osakaCastle)).toBeNull();
    expect(pickPageImage(undefined, osakaCastle)).toBeNull();
  });
});

describe("toWikimediaPhoto", () => {
  const info = {
    thumburl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Osaka_Castle.jpg/960px-Osaka_Castle.jpg?utm_source=commons.wikimedia.org",
    thumbwidth: 800,
    thumbheight: 533,
    descriptionurl: "https://commons.wikimedia.org/wiki/File:Osaka_Castle.jpg",
    extmetadata: { Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Kim">Kim &amp; Lee</a>' }, LicenseShortName: { value: "CC BY-SA 4.0" } },
  };

  it("주소·작가·라이선스·파일 페이지", () => {
    expect(toWikimediaPhoto(info)).toEqual({
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Osaka_Castle.jpg/960px-Osaka_Castle.jpg",
      credit: "Kim & Lee · CC BY-SA 4.0",
      page: "https://commons.wikimedia.org/wiki/File:Osaka_Castle.jpg",
    });
  });

  it("세로 사진, Commons 밖 주소는 쓰지 않는다", () => {
    expect(toWikimediaPhoto({ ...info, thumbwidth: 500, thumbheight: 800 })).toBeNull();
    expect(toWikimediaPhoto({ ...info, thumburl: "https://example.com/a.jpg" })).toBeNull();
    expect(toWikimediaPhoto({ ...info, descriptionurl: "https://ko.wikipedia.org/wiki/파일:A.jpg" })).toBeNull();
    expect(toWikimediaPhoto(undefined)).toBeNull();
  });

  it("작가가 없으면 작가 미상", () => {
    expect(toWikimediaPhoto({ ...info, extmetadata: {} })?.credit).toBe("작가 미상");
  });
});

describe("stripHtml", () => {
  it("태그와 기호를 지운다", () => {
    expect(stripHtml("<span>A&nbsp;<b>B</b></span>\n C")).toBe("A B C");
  });
});

describe("distanceMeters", () => {
  it("가까운 두 점, 먼 두 점", () => {
    expect(distanceMeters({ lat: 34.6873, lng: 135.5262 }, { lat: 34.6872, lng: 135.5258 })).toBeLessThan(100);
    expect(distanceMeters({ lat: 37.5665, lng: 126.978 }, { lat: 35.1796, lng: 129.0756 })).toBeGreaterThan(300000);
    expect(SAME_PLACE_METERS).toBe(1000);
  });
});
