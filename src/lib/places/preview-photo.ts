// 저장 전 항목(C9 F28 매거진 미리보기 카드)의 사진. 저장된 항목은 photo/[itemId] 경로(F22)가 맡는다.
// 저장 전이라 좌표·장소 ID가 없으므로 종류·이름으로 장소를 찾은 뒤 F22와 같은 순서(관광지는 Wikimedia 먼저, 그 밖은 Google Places)로 사진을 고른다.
// 교통·메모는 찾지 않는다(교통은 로고로 대체, F26 결정 2). ([hyunw0000-f28-magazine-preview] 결정 4)

import { geocodeQuery } from "@/lib/items/geocode";
import { GEOCODED_KINDS, type ItemKind } from "@/lib/items/types";
import type { CardPhoto } from "./types";
import type { WikimediaPhoto } from "./wikimedia";

// 검색어에 쓰는 이름 길이 상한(항목 이름 칸과 같다)
const MAX_NAME = 200;

// found: 장소를 찾았는지. false면 화면에 "지도에서 찾지 못함", true인데 photo가 null이면 "사진 없음"
export type PreviewPhotoResponse = { photo: CardPhoto | null; found: boolean };

export function hasPreviewPhoto(kind: ItemKind): boolean {
  return GEOCODED_KINDS.includes(kind);
}

// 사진을 찾을 검색어. 찾지 않는 종류이거나 이름이 비었으면 null
export function previewPhotoQuery(kind: string, name: string, destination: string): string | null {
  if (!GEOCODED_KINDS.includes(kind as ItemKind)) return null;
  const trimmed = name.trim().slice(0, MAX_NAME);
  return trimmed ? geocodeQuery(trimmed, destination) : null;
}

// 브라우저가 부르는 주소. 이름·종류가 같으면 주소가 같아 브라우저 캐시(14일)를 그대로 쓴다.
export function previewPhotoPath(tripId: string, kind: ItemKind, name: string): string {
  const params = new URLSearchParams({ kind, name: name.trim() });
  return `/trips/${encodeURIComponent(tripId)}/photo/preview?${params}`;
}

export function wikimediaCard(found: WikimediaPhoto): CardPhoto {
  const [artist, ...rest] = found.credit.split(" · ");
  return {
    url: found.url,
    source: "wikimedia",
    authors: artist ? [{ name: artist, uri: null }] : [],
    license: rest.join(" · ") || null,
    link: found.page,
  };
}
