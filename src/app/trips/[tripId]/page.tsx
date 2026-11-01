import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/app/_components/app-header";
import { requireUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { formatTripPeriod, TRIP_COLUMNS, type Trip } from "@/lib/trips/types";

export default async function TripPage({ params }: PageProps<"/trips/[tripId]">) {
  const { tripId } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  // 볼 권한이 없는 여행은 RLS 때문에 결과가 비어 있다.
  const { data: trip } = await supabase.from("trips").select(TRIP_COLUMNS).eq("id", tripId).maybeSingle<Trip>();
  if (!trip) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <AppHeader email={user.email} />
      <Link href="/" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← 여행 목록
      </Link>
      <section className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold">{trip.title}</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          {[trip.destination, formatTripPeriod(trip), `${trip.companions}명`].filter(Boolean).join(" · ")}
        </p>
      </section>
      {/* 1화면(일정)은 v0.4(R-03)에서 만든다. */}
      <p className="text-zinc-600 dark:text-zinc-400">일정 화면이 들어갈 자리입니다.</p>
    </main>
  );
}
