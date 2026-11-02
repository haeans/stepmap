import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/app/_components/app-header";
import { requireUser } from "@/lib/auth/user";
import { groupItems } from "@/lib/items/group";
import { ITEM_COLUMNS, type Item } from "@/lib/items/types";
import { mapPlaces } from "@/lib/map/places";
import { dayRoute } from "@/lib/map/routes";
import { createClient } from "@/lib/supabase/server";
import { dayChoices, tripDays } from "@/lib/trips/days";
import { TRIP_COLUMNS, type Trip } from "@/lib/trips/types";
import { InputPanel } from "./_components/input-panel";
import { MapView } from "./_components/map-view";
import { ShareButton } from "./_components/share-button";
import { ScheduleView } from "./_components/schedule-view";
import { parseTripView, ViewSwitch } from "./_components/view-switch";

export default async function TripPage({ params, searchParams }: PageProps<"/trips/[tripId]">) {
  const { tripId } = await params;
  const query = await searchParams;
  const view = parseTripView(query.view);
  const user = await requireUser();
  const supabase = await createClient();
  // 볼 권한이 없는 여행은 RLS 때문에 결과가 비어 있다.
  const { data: trip } = await supabase.from("trips").select(TRIP_COLUMNS).eq("id", tripId).maybeSingle<Trip>();
  if (!trip) notFound();
  // 공유받은 사람은 보기 전용이다. 버튼만 숨기고, 실제로 막는 것은 RLS다. (R-08)
  const readOnly = trip.owner_id !== user.id;

  const { data: items } = await supabase.from("items").select(ITEM_COLUMNS).eq("trip_id", trip.id).returns<Item[]>();
  const grouped = groupItems(items ?? [], tripDays(trip.start_date, trip.end_date));
  const choices = dayChoices(
    grouped.days.map((d) => d.day),
    trip.start_date !== null,
  );

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6 pb-28">
      {/* 매거진 "크게"에서는 사진 위에 놓이므로 흰 글씨로 바뀐다(<html data-cover>, F10). */}
      <div className="flex flex-col gap-6 [html[data-cover]_&]:text-white">
      <AppHeader email={user.email} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm opacity-70 transition hover:underline hover:opacity-100">
          ← 여행 목록
        </Link>
        <div className="flex items-center gap-2">
          {readOnly ? (
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">공유받음 · 보기 전용</span>
          ) : (
            <ShareButton tripId={trip.id} />
          )}
          <ViewSwitch tripId={trip.id} current={view} />
        </div>
      </div>
      </div>
      {view === "schedule" ? (
        <ScheduleView trip={trip} grouped={grouped} count={items?.length ?? 0} dayOptions={choices} readOnly={readOnly} />
      ) : (
        <TripMap items={items ?? []} days={grouped.days.map((d) => d.day.day)} itemId={typeof query.item === "string" ? query.item : null} />
      )}
      {!readOnly && <InputPanel tripId={trip.id} days={choices} />}
    </main>
  );
}

// 2화면(지도). 일차별 경로는 서버에서 구한다(캐시, B21).
async function TripMap({ items, days, itemId }: { items: Item[]; days: number[]; itemId: string | null }) {
  const { places, missing } = mapPlaces(items);
  const routes = Object.fromEntries(
    await Promise.all(days.map(async (day) => [day, await dayRoute(places.filter((p) => p.day === day))] as const)),
  );
  return <MapView places={places} routes={routes} days={days} missing={missing} initialId={itemId} />;
}
