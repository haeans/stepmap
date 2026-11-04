// 식당·숙소(와 Wikimedia 사진이 없는 관광지)의 사진: Google Places 사진 (C8 F22). 보여 줄 때마다 가져온다.
// 약관: 장소 ID만 계속 저장할 수 있고, 사진 이름은 캐시할 수 없으며 만료될 수 있다. 그래서 서버에는 아무것도 저장하지 않는다.
// 요금: Place Details(photos만)는 Essentials (IDs Only) 단계로 무료이고, 사진 주소를 받는 Place Photo만 과금된다(월 1,000번 무료).
// 그래서 브라우저 캐시(14일)로 다시 부르는 횟수를 줄인다(사진 경로 route.ts).

import type { CardPhoto, PhotoAuthor } from "./types";

// 카드 사진 폭. 카드는 화면에서 최대 약 40rem이라 800px이면 충분하다.
export const PHOTO_MAX_WIDTH = 800;

type ApiPhoto = {
  name?: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: { displayName?: string; uri?: string }[];
  googleMapsUri?: string;
};

// PRD C8 F22: 가로 사진 첫 장. 가로 사진이 없으면 사진을 쓰지 않는다(카드가 가로로 길어 세로 사진은 크게 잘린다).
export function pickPhoto(photos: ApiPhoto[] | undefined): ApiPhoto | null {
  return photos?.find((p) => p.name && (p.widthPx ?? 0) > (p.heightPx ?? 0)) ?? null;
}

export function photoAuthors(photo: ApiPhoto): PhotoAuthor[] {
  return (photo.authorAttributions ?? [])
    .filter((a) => a.displayName)
    .map((a) => ({ name: a.displayName!, uri: a.uri?.startsWith("https://") ? a.uri : null }));
}

// 사진이 없으면 null, 호출이 실패하면(키 없음·시간 초과·4xx·5xx) 예외를 던진다. 실패는 캐시하지 않으려고 둘을 나눈다.
export async function fetchPlacePhoto(placeId: string): Promise<CardPhoto | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) throw new Error("no key");
  const headers = { "X-Goog-Api-Key": key };

  // 1) 사진 목록 (무료 단계). 사진 이름은 저장할 수 없으므로 매번 새로 받는다.
  const details = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { ...headers, "X-Goog-FieldMask": "photos" },
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (details.status === 404) return null; // 없어진 장소
  if (!details.ok) throw new Error(`place details ${details.status}`);
  const photo = pickPhoto(((await details.json()) as { photos?: ApiPhoto[] }).photos);
  if (!photo?.name) return null;

  // 2) 사진 주소 (과금). 키가 브라우저에 보이지 않게 주소만 받아 넘긴다.
  const media = await fetch(
    `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=${PHOTO_MAX_WIDTH}&skipHttpRedirect=true`,
    { headers, signal: AbortSignal.timeout(5000), cache: "no-store" },
  );
  if (!media.ok) throw new Error(`place photo ${media.status}`);
  const { photoUri } = (await media.json()) as { photoUri?: string };
  if (!photoUri?.startsWith("https://")) return null;
  return {
    url: photoUri,
    source: "google",
    authors: photoAuthors(photo),
    license: null,
    link: photo.googleMapsUri?.startsWith("https://") ? photo.googleMapsUri : null,
  };
}
