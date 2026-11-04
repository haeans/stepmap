// 관광지 사진: Wikimedia Commons (C8 F22). 무료·키 없음이고 사진 주소와 출처를 DB에 저장해 둘 수 있다.
// 위키백과(한국어 → 영어)에서 이름으로 문서를 찾고, 문서 좌표가 저장된 좌표와 가까울 때만 같은 장소로 본다.
// 사진은 그 문서의 대표 사진이 Commons에 있을 때만 쓴다(각 언어 위키백과에만 있는 비자유 파일은 쓰지 않는다).

import { distanceMeters, SAME_PLACE_METERS } from "./distance";

export type WikimediaPhoto = { url: string; credit: string; page: string };

// Commons 썸네일 주소. 2026년부터 thumb.wikimedia.org로도 준다(예전 upload.wikimedia.org도 받음).
const THUMB_HOST = /^https:\/\/(upload|thumb)\.wikimedia\.org\//;

const LANGS = ["ko", "en"] as const;
const THUMB_WIDTH = 800;
// Wikimedia API 규칙: 연락할 수 있는 User-Agent를 보낸다.
const HEADERS = { "User-Agent": "stepmap/1.0 (https://stepmap-pi.vercel.app; travel planner)" };

type WikiPage = { index?: number; pageimage?: string; coordinates?: { lat: number; lon: number }[] };

// 검색 결과 중 좌표가 가까운 첫 문서의 대표 사진 파일 이름
export function pickPageImage(pages: WikiPage[] | undefined, at: { lat: number; lng: number }): string | null {
  const sorted = [...(pages ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  for (const page of sorted) {
    const c = page.coordinates?.[0];
    if (!page.pageimage || !c) continue;
    if (distanceMeters(at, { lat: c.lat, lng: c.lon }) <= SAME_PLACE_METERS) return page.pageimage;
  }
  return null;
}

type ImageInfo = {
  thumburl?: string;
  thumbwidth?: number;
  thumbheight?: number;
  descriptionurl?: string;
  extmetadata?: { Artist?: { value?: string }; LicenseShortName?: { value?: string } };
};

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// Commons 파일 정보 → 저장할 사진. 가로 사진만 쓴다(Google 사진과 같은 규칙).
export function toWikimediaPhoto(info: ImageInfo | undefined): WikimediaPhoto | null {
  if (!info?.thumburl || !THUMB_HOST.test(info.thumburl)) return null;
  if (!info.descriptionurl?.startsWith("https://commons.wikimedia.org/")) return null;
  if ((info.thumbwidth ?? 0) <= (info.thumbheight ?? 0)) return null;
  const artist = stripHtml(info.extmetadata?.Artist?.value ?? "") || "작가 미상";
  const license = stripHtml(info.extmetadata?.LicenseShortName?.value ?? "");
  const credit = [artist, license].filter(Boolean).join(" · ").slice(0, 300);
  // 추적용 쿼리(utm_*)는 떼고 저장한다.
  return { url: info.thumburl.split("?")[0], credit, page: info.descriptionurl };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(5000), cache: "no-store" });
  if (!res.ok) throw new Error(`wikimedia ${res.status}`);
  return (await res.json()) as T;
}

// 못 찾으면 null, 호출이 실패하면 예외를 던진다(실패는 "없음"으로 저장하지 않으려고).
export async function findWikimediaPhoto(name: string, at: { lat: number; lng: number }): Promise<WikimediaPhoto | null> {
  for (const lang of LANGS) {
    const search = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      generator: "search",
      gsrsearch: name,
      gsrlimit: "3",
      prop: "coordinates|pageimages",
      piprop: "name",
    });
    const found = await getJson<{ query?: { pages?: WikiPage[] } }>(`https://${lang}.wikipedia.org/w/api.php?${search}`);
    const file = pickPageImage(found.query?.pages, at);
    if (!file) continue;

    const info = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      titles: `File:${file}`,
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: String(THUMB_WIDTH),
      iiextmetadatafilter: "Artist|LicenseShortName",
    });
    const commons = await getJson<{ query?: { pages?: { missing?: boolean; imageinfo?: ImageInfo[] }[] } }>(
      `https://commons.wikimedia.org/w/api.php?${info}`,
    );
    const page = commons.query?.pages?.[0];
    if (page && !page.missing) {
      const photo = toWikimediaPhoto(page.imageinfo?.[0]);
      if (photo) return photo;
    }
  }
  return null;
}
