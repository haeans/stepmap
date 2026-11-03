// 목적지로 Unsplash 대표 이미지를 찾는다. (F08, 작업 파일 haeans-f08-cover-image 결정 1)
// 여행을 만들 때만 부른다: 검색 1번, 쓰기로 한 사진에 다운로드 알림 1번.
// 실패해도 여행 만들기는 막지 않는다. 키가 없거나 한도 초과·오류·시간 초과면 null.

import { pickUnsplashPhoto, type UnsplashPick } from "./cover";

const TIMEOUT_MS = 3000;

function headers(key: string) {
  return { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" };
}

export async function searchCover(destination: string): Promise<UnsplashPick | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  const query = destination.trim();
  if (!key || !query) return null;

  const params = new URLSearchParams({ query, per_page: "1", orientation: "landscape", content_filter: "high" });
  try {
    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: headers(key),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("unsplash search failed", res.status);
      return null;
    }
    return pickUnsplashPhoto(await res.json());
  } catch (error) {
    console.error("unsplash search failed", error instanceof Error ? error.name : "unknown");
    return null;
  }
}

// Unsplash 규칙: 사진을 쓰기로 하면 download_location을 한 번 부른다.
export async function notifyDownload(downloadLocation: string): Promise<void> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return;
  try {
    const res = await fetch(downloadLocation, {
      headers: headers(key),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) console.error("unsplash download notify failed", res.status);
  } catch (error) {
    console.error("unsplash download notify failed", error instanceof Error ? error.name : "unknown");
  }
}
