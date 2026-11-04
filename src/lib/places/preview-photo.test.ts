import { describe, expect, it } from "vitest";
import { hasPreviewPhoto, previewPhotoPath, previewPhotoQuery, wikimediaCard } from "./preview-photo";

describe("previewPhotoQuery", () => {
  it("관광지·식당·숙소는 이름 + 목적지로 찾는다", () => {
    expect(previewPhotoQuery("sight", " 홍콩 역사박물관 ", "홍콩")).toBe("홍콩 역사박물관 홍콩");
    expect(previewPhotoQuery("food", "미도 카페", "")).toBe("미도 카페");
    expect(previewPhotoQuery("lodging", "아일랜드 샹그릴라", "홍콩")).toBe("아일랜드 샹그릴라 홍콩");
  });

  it("교통·메모·모르는 종류·빈 이름은 찾지 않는다", () => {
    expect(previewPhotoQuery("transport", "KE608 홍콩 → 인천", "홍콩")).toBeNull();
    expect(previewPhotoQuery("memo", "옥토퍼스 카드", "홍콩")).toBeNull();
    expect(previewPhotoQuery("bus", "x", "홍콩")).toBeNull();
    expect(previewPhotoQuery("sight", "   ", "홍콩")).toBeNull();
  });

  it("이름은 200자까지만 쓴다", () => {
    expect(previewPhotoQuery("sight", "가".repeat(300), "")?.length).toBe(200);
  });
});

describe("hasPreviewPhoto", () => {
  it("좌표를 찾는 종류만", () => {
    expect(hasPreviewPhoto("sight")).toBe(true);
    expect(hasPreviewPhoto("transport")).toBe(false);
    expect(hasPreviewPhoto("memo")).toBe(false);
  });
});

describe("previewPhotoPath", () => {
  it("종류·이름을 주소에 넣는다", () => {
    expect(previewPhotoPath("t1", "food", " 미도 카페 ")).toBe("/trips/t1/photo/preview?kind=food&name=%EB%AF%B8%EB%8F%84+%EC%B9%B4%ED%8E%98");
  });
});

describe("wikimediaCard", () => {
  it("작가 · 라이선스를 나눈다", () => {
    expect(wikimediaCard({ url: "https://u", credit: "Kim · CC BY-SA 4.0", page: "https://p" })).toEqual({
      url: "https://u",
      source: "wikimedia",
      authors: [{ name: "Kim", uri: null }],
      license: "CC BY-SA 4.0",
      link: "https://p",
    });
  });

  it("작가가 없으면 빈 목록", () => {
    expect(wikimediaCard({ url: "https://u", credit: "", page: "https://p" }).authors).toEqual([]);
  });
});
