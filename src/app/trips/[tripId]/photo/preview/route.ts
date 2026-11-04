import { NextResponse } from "next/server";
import { searchPlace } from "@/lib/items/geocode";
import { fetchPlacePhoto } from "@/lib/places/photo";
import { previewPhotoQuery, wikimediaCard, type PreviewPhotoResponse } from "@/lib/places/preview-photo";
import { findWikimediaPhoto } from "@/lib/places/wikimedia";
import { createClient } from "@/lib/supabase/server";

// 저장 전 항목의 사진 (C9 F28 매거진 미리보기 카드). ([hyunw0000-f28-magazine-preview] 결정 4)
// ?kind=&name= 로 장소를 찾고(Text Search), 관광지는 Wikimedia 먼저, 그 밖은 Google Places 사진을 고른다(F22와 같은 순서).
// 미리보기는 소유자에게만 있으므로 소유자만 부를 수 있다(외부 호출 비용). 아무것도 저장하지 않는다.
// 결과는 브라우저에 14일 캐시한다(F22와 같음). 실패는 캐시하지 않는다.

const CACHE = "private, max-age=1209600";
const NO_STORE = "no-store";

function reply(body: PreviewPhotoResponse, cache = CACHE, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": cache } });
}

export async function GET(request: Request, ctx: RouteContext<"/trips/[tripId]/photo/preview">) {
  const { tripId } = await ctx.params;
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") ?? "";
  const name = params.get("name") ?? "";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return reply({ photo: null, found: false }, NO_STORE, 401);
  const { data: trip } = await supabase.from("trips").select("owner_id, destination").eq("id", tripId).maybeSingle();
  if (!trip || trip.owner_id !== auth.user.id) return reply({ photo: null, found: false }, NO_STORE, 404);

  const query = previewPhotoQuery(kind, name, trip.destination ?? "");
  if (!query) return reply({ photo: null, found: false }, NO_STORE, 400);

  try {
    const place = await searchPlace(query);
    if (!place) return reply({ photo: null, found: false });
    if (kind === "sight") {
      const wiki = await findWikimediaPhoto(name.trim(), place);
      if (wiki) return reply({ photo: wikimediaCard(wiki), found: true });
    }
    const photo = place.placeId ? await fetchPlacePhoto(place.placeId) : null;
    return reply({ photo, found: true });
  } catch (e) {
    console.error("preview photo error", e instanceof Error ? e.message : e);
    return reply({ photo: null, found: true }, NO_STORE, 503);
  }
}
