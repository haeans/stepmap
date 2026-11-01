import { requireUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { TRIP_COLUMNS, type Trip } from "@/lib/trips/types";
import { AppHeader } from "./_components/app-header";
import { NewTripForm } from "./_components/new-trip-form";
import { TripRow } from "./_components/trip-row";

export default async function Home() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select(TRIP_COLUMNS)
    .order("created_at", { ascending: false })
    .returns<Trip[]>();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <AppHeader email={user.email} />
      <h2 className="text-xl font-semibold">내 여행</h2>
      <NewTripForm />
      {error ? (
        <p className="text-red-600">여행 목록을 불러오지 못했습니다.</p>
      ) : data.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">아직 여행이 없습니다. 새 여행을 만들어 보세요.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((trip) => (
            <TripRow key={trip.id} trip={trip} />
          ))}
        </ul>
      )}
      {/* 공유받은 여행은 v0.9(R-08)에서 같은 목록에 섞는다. */}
    </main>
  );
}
