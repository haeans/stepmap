import { NextResponse } from "next/server";
import { geocodeQuery, searchPlace } from "@/lib/items/geocode";
import { GEOCODED_KINDS, type ItemKind } from "@/lib/items/types";
import { distanceMeters, SAME_PLACE_METERS } from "@/lib/places/distance";
import { fetchPlacePhoto } from "@/lib/places/photo";
import type { CardPhoto, PhotoResponse } from "@/lib/places/types";
import { findWikimediaPhoto } from "@/lib/places/wikimedia";
import { createClient } from "@/lib/supabase/server";

// 매거진 장소 카드 사진 (C8 F22). 카드가 화면에 들어올 때 브라우저가 부른다.
// 1) 관광지: 저장해 둔 Wikimedia 사진. 아직 안 찾았으면(소유자일 때만) 찾아 저장한다. 외부 호출은 항목마다 한 번.
// 2) 그 밖(식당·숙소, Wikimedia 사진이 없는 관광지): Google Places 사진. 장소 ID가 없으면(소유자일 때만) 찾아 저장한다.
// 볼 권한은 RLS가 막는다(공유받은 사람도 볼 수 있고, 저장은 소유자만). 공유받은 사람이 볼 때는 찾거나 저장하지 않는다.
// 응답은 브라우저에 14일 캐시해 Place Photo(과금) 호출을 줄인다. 실패는 캐시하지 않는다.

const CACHE = "private, max-age=1209600"; // 14일 (F22 결정)
const NO_STORE = "no-store";

type Row = {
  id: string;
  kind: ItemKind;
  name: string;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  photo_url: string | null;
  photo_credit: string | null;
  photo_page: string | null;
};

function reply(photo: CardPhoto | null, cache = CACHE, status = 200) {
  return NextResponse.json({ photo } satisfies PhotoResponse, { status, headers: { "Cache-Control": cache } });
}

function stored(row: Row): CardPhoto {
  const [artist, ...rest] = (row.photo_credit ?? "").split(" · ");
  return {
    url: row.photo_url!,
    source: "wikimedia",
    authors: artist ? [{ name: artist, uri: null }] : [],
    license: rest.join(" · ") || null,
    link: row.photo_page,
  };
}

export async function GET(_request: Request, ctx: RouteContext<"/trips/[tripId]/photo/[itemId]">) {
  const { tripId, itemId } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return reply(null, NO_STORE, 401);

  const { data: row, error } = await supabase
    .from("items")
    .select("id, kind, name, lat, lng, place_id, photo_url, photo_credit, photo_page")
    .eq("id", itemId)
    .eq("trip_id", tripId)
    .maybeSingle<Row>();
  // 칸이 아직 없으면(마이그레이션 반영 전) 오류다. 사진 없이 보여 준다.
  if (error) return reply(null, NO_STORE, 503);
  if (!row) return reply(null, NO_STORE, 404);
  if (!GEOCODED_KINDS.includes(row.kind) || row.lat === null || row.lng === null) return reply(null);
  const at = { lat: row.lat, lng: row.lng };

  const { data: trip } = await supabase.from("trips").select("owner_id, destination").eq("id", tripId).maybeSingle();
  const owner = trip?.owner_id === auth.user.id;

  try {
    // 1) Wikimedia (관광지)
    if (row.photo_url) return reply(stored(row));
    if (row.kind === "sight" && row.photo_url === null && owner) {
      const found = await findWikimediaPhoto(row.name, at);
      const columns = found ? { photo_url: found.url, photo_credit: found.credit, photo_page: found.page } : { photo_url: "" };
      await supabase.from("items").update(columns).eq("id", row.id);
      if (found) return reply(stored({ ...row, ...columns } as Row));
    }

    // 2) Google Places
    let placeId = row.place_id;
    if (!placeId && owner) {
      // 기존 항목: 이름으로 다시 찾아 저장된 좌표와 가까울 때만 같은 장소로 본다.
      const found = await searchPlace(geocodeQuery(row.name, trip?.destination ?? ""));
      if (found?.placeId && distanceMeters(at, found) <= SAME_PLACE_METERS) {
        placeId = found.placeId;
        await supabase.from("items").update({ place_id: placeId }).eq("id", row.id);
      }
    }
    if (!placeId) return reply(null);
    return reply(await fetchPlacePhoto(placeId));
  } catch (e) {
    console.error("place photo error", e instanceof Error ? e.message : e);
    return reply(null, NO_STORE);
  }
}
