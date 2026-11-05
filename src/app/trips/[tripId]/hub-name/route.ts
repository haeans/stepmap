import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { searchPlace } from "@/lib/items/geocode";
import { createClient } from "@/lib/supabase/server";

// 거점 카드(공항·역·터미널)의 한국어 이름 (C10 F33, [hyunw0000-f33-claude-api] 결정 10).
// 원문·AI가 거점을 영어나 코드로만 적으면("Kansai 공항", "LIS 공항") 구글 장소 검색(languageCode ko)의 이름을 쓴다.
// 공항 목록을 코드에 늘리지 않으려는 것이다. 여행을 볼 수 있는 사람(소유자·공유받은 사람, RLS)만 부를 수 있다.
// 같은 검색어는 서버에서 30일, 브라우저에서 14일 캐시한다. 실패는 캐시하지 않는다. 아무것도 저장하지 않는다.

const CACHE = "private, max-age=1209600";
const NO_STORE = "no-store";

const cachedName = unstable_cache(
  async (query: string): Promise<string | null> => (await searchPlace(query))?.name ?? null,
  ["hub-name-ko-v1"],
  { revalidate: 60 * 60 * 24 * 30 },
);

export async function GET(request: Request, ctx: RouteContext<"/trips/[tripId]/hub-name">) {
  const { tripId } = await ctx.params;
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (!query) return NextResponse.json({ name: null }, { status: 400, headers: { "Cache-Control": NO_STORE } });

  const supabase = await createClient();
  const { data: trip } = await supabase.from("trips").select("id").eq("id", tripId).maybeSingle();
  if (!trip) return NextResponse.json({ name: null }, { status: 404, headers: { "Cache-Control": NO_STORE } });

  try {
    return NextResponse.json({ name: await cachedName(query) }, { headers: { "Cache-Control": CACHE } });
  } catch (e) {
    console.error("hub name error", e instanceof Error ? e.message : e);
    return NextResponse.json({ name: null }, { status: 503, headers: { "Cache-Control": NO_STORE } });
  }
}
