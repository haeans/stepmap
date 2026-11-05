import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Check } from "@/lib/trips/packing";

// 준비물 목록 읽기 (C10 F31, trip_checks). 소유자와 공유받은 사람 모두 읽는다(RLS). 실패하면 null.
export async function readChecks(supabase: Awaited<ReturnType<typeof createClient>>, tripId: string): Promise<Check[] | null> {
  const { data, error } = await supabase
    .from("trip_checks")
    .select("id, label, done")
    .eq("trip_id", tripId)
    .order("position")
    .order("created_at")
    .returns<Check[]>();
  return error ? null : (data ?? []);
}
