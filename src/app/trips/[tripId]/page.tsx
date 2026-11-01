import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/app/_components/app-header";
import { requireUser } from "@/lib/auth/user";
import { groupItems } from "@/lib/items/group";
import { ITEM_COLUMNS, type Item } from "@/lib/items/types";
import { createClient } from "@/lib/supabase/server";
import { dayChoices, tripDays } from "@/lib/trips/days";
import { TRIP_COLUMNS, type Trip } from "@/lib/trips/types";
import { InputPanel } from "./_components/input-panel";
import { ScheduleView } from "./_components/schedule-view";
import { parseTripView, ViewSwitch } from "./_components/view-switch";

export default async function TripPage({ params, searchParams }: PageProps<"/trips/[tripId]">) {
  const { tripId } = await params;
  const view = parseTripView((await searchParams).view);
  const user = await requireUser();
  const supabase = await createClient();
  // 볼 권한이 없는 여행은 RLS 때문에 결과가 비어 있다.
  const { data: trip } = await supabase.from("trips").select(TRIP_COLUMNS).eq("id", tripId).maybeSingle<Trip>();
  if (!trip) notFound();

  const { data: items } = await supabase.from("items").select(ITEM_COLUMNS).eq("trip_id", trip.id).returns<Item[]>();
  const grouped = groupItems(items ?? [], tripDays(trip.start_date, trip.end_date));
  const choices = dayChoices(
    grouped.days.map((d) => d.day),
    trip.start_date !== null,
  );

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6 pb-28">
      <AppHeader email={user.email} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          ← 여행 목록
        </Link>
        <ViewSwitch tripId={trip.id} current={view} />
      </div>
      {view === "schedule" ? (
        <ScheduleView trip={trip} grouped={grouped} count={items?.length ?? 0} dayOptions={choices} />
      ) : (
        // 2화면(지도)은 v0.7(R-06)에서 만든다.
        <section aria-label="지도" className="flex aspect-video items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-900">
          지도가 들어갈 자리입니다.
        </section>
      )}
      <InputPanel tripId={trip.id} days={choices} />
    </main>
  );
}
