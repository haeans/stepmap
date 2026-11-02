import { describe, expect, it } from "vitest";
import { authorLink, checkCoverFile, coverSrc, pickUnsplashPhoto } from "./cover";

const photo = {
  color: "#40590c",
  urls: { raw: "https://images.unsplash.com/photo-1?ixid=abc" },
  user: { name: "Kim", links: { html: "https://unsplash.com/@kim" } },
  links: { download_location: "https://api.unsplash.com/photos/1/download?ixid=abc" },
};

describe("pickUnsplashPhoto", () => {
  it("첫 사진의 주소·대표 색·작가와 다운로드 알림 주소를 뽑는다", () => {
    expect(pickUnsplashPhoto({ results: [photo, { ...photo, color: "#000000" }] })).toEqual({
      cover: {
        cover_url: "https://images.unsplash.com/photo-1?ixid=abc",
        cover_color: "#40590c",
        cover_source: "unsplash",
        cover_author_name: "Kim",
        cover_author_url: "https://unsplash.com/@kim",
      },
      downloadLocation: "https://api.unsplash.com/photos/1/download?ixid=abc",
    });
  });

  it("결과가 없거나 주소가 https가 아니면 쓰지 않는다", () => {
    expect(pickUnsplashPhoto({ results: [] })).toBeNull();
    expect(pickUnsplashPhoto(null)).toBeNull();
    expect(pickUnsplashPhoto({ results: [{ ...photo, urls: { raw: "http://x" } }] })).toBeNull();
    expect(pickUnsplashPhoto({ results: [{ ...photo, links: {} }] })).toBeNull();
  });

  it("색 형식이 다르거나 작가 정보가 없으면 그 칸만 비운다", () => {
    const pick = pickUnsplashPhoto({ results: [{ ...photo, color: "green", user: {} }] });
    expect(pick?.cover).toMatchObject({ cover_color: null, cover_author_name: null, cover_author_url: null });
  });
});

describe("coverSrc", () => {
  it("Unsplash 사진은 크기·품질 파라미터를 붙이고 원래 파라미터는 남긴다", () => {
    const src = new URL(coverSrc("https://images.unsplash.com/photo-1?ixid=abc", 1200));
    expect(Object.fromEntries(src.searchParams)).toEqual({ ixid: "abc", w: "1200", q: "75", fit: "crop", auto: "format" });
  });

  it("올린 사진 주소는 그대로 둔다", () => {
    const url = "https://x.supabase.co/storage/v1/object/public/trip-covers/t/cover?v=1";
    expect(coverSrc(url, 1200)).toBe(url);
  });
});

describe("authorLink", () => {
  it("utm 값을 붙인다", () => {
    expect(authorLink("https://unsplash.com/@kim")).toBe("https://unsplash.com/@kim?utm_source=stepmap&utm_medium=referral");
    expect(authorLink("https://unsplash.com/@kim?a=1")).toBe("https://unsplash.com/@kim?a=1&utm_source=stepmap&utm_medium=referral");
  });
});

describe("checkCoverFile", () => {
  it("jpg·png·webp, 5MB 이하만 받는다", () => {
    expect(checkCoverFile({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(checkCoverFile({ type: "image/gif", size: 1000 })).not.toBeNull();
    expect(checkCoverFile({ type: "image/webp", size: 5 * 1024 * 1024 + 1 })).not.toBeNull();
  });
});
