// 여행 대표 이미지 (F08). 화면과 서버가 같이 쓰는 순수 함수만 둔다.
// 작업 파일 haeans-f08-cover-image 결정 2~6.

export const COVER_BUCKET = "trip-covers";
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];

const UTM = "utm_source=stepmap&utm_medium=referral";
export const UNSPLASH_HOME = `https://unsplash.com/?${UTM}`;

// trips 행에 넣을 대표 이미지 칸
export type CoverFields = {
  cover_url: string;
  cover_color: string | null;
  cover_source: "unsplash" | "upload";
  cover_author_name: string | null;
  cover_author_url: string | null;
};

export type UnsplashPick = { cover: CoverFields; downloadLocation: string };

type UnsplashPhoto = {
  color?: string | null;
  urls?: { raw?: string };
  user?: { name?: string; links?: { html?: string } };
  links?: { download_location?: string };
};

const isHttps = (url: string | undefined): url is string => !!url && url.startsWith("https://");

// 검색 결과 첫 사진에서 저장할 값만 뽑는다. 주소가 없으면 쓰지 않는다.
export function pickUnsplashPhoto(data: unknown): UnsplashPick | null {
  const photo = (data as { results?: UnsplashPhoto[] } | null)?.results?.[0];
  const raw = photo?.urls?.raw;
  const download = photo?.links?.download_location;
  if (!isHttps(raw) || !isHttps(download)) return null;
  const color = photo?.color && /^#[0-9A-Fa-f]{6}$/.test(photo.color) ? photo.color : null;
  const authorUrl = photo?.user?.links?.html;
  return {
    cover: {
      cover_url: raw,
      cover_color: color,
      cover_source: "unsplash",
      cover_author_name: photo?.user?.name?.slice(0, 200) || null,
      cover_author_url: isHttps(authorUrl) ? authorUrl : null,
    },
    downloadLocation: download,
  };
}

// 보여 줄 크기의 주소. Unsplash 사진은 주소 파라미터로 크기를 줄인다(Next.js 이미지 최적화를 쓰지 않음).
export function coverSrc(url: string, width: number): string {
  try {
    const u = new URL(url);
    if (u.hostname !== "images.unsplash.com") return url;
    u.searchParams.set("w", String(width));
    u.searchParams.set("q", "75");
    u.searchParams.set("fit", "crop");
    u.searchParams.set("auto", "format");
    return u.toString();
  } catch {
    return url;
  }
}

// 작가 링크에 Unsplash가 요구하는 utm 값을 붙인다.
export function authorLink(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}${UTM}`;
}

export function coverObjectPath(tripId: string): string {
  return `${tripId}/cover`;
}

// 올린 사진 검사. 문제가 있으면 안내 문구, 없으면 null.
export function checkCoverFile(file: { type: string; size: number }): string | null {
  if (!COVER_TYPES.includes(file.type)) return "jpg, png, webp 사진만 올릴 수 있습니다.";
  if (file.size > COVER_MAX_BYTES) return "5MB 이하 사진만 올릴 수 있습니다.";
  return null;
}
