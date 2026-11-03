import "server-only";
import type { ExistingItem } from "@/lib/extract/prompt";
import type { Supabase } from "@/lib/items/store";
import { dayChoices, tripDays, type TripDay } from "@/lib/trips/days";

// 붙여넣기 추출(F18)과 대화 도우미(F19)가 AI에 함께 보내는 여행 맥락을 읽는다.
// AI 호출은 비용이 들어 소유자만 할 수 있다. 소유자가 아니면 null. (B17)

// AI에 함께 보내는 기존 일정 수 상한(입력 토큰을 묶어 둔다)
const MAX_EXISTING = 150;

export type TripContextData = {
  destination: string;
  startDate: string | null;
  endDate: string | null;
  days: TripDay[];
  // 고를 수 있는 일차 수. 날짜가 없는 여행은 직접 입력과 같은 범위(최소 10일)
  dayCount: number;
  // 기존 일정의 종류·일차·시각·이름·주소(메모·링크·비용은 보내지 않는다, [hyunw0000-f18-ai-suggest] 결정 3)
  existing: ExistingItem[];
  // 일차별 기존 일정 수
  busy: Record<number, number>;
};

export async function loadTripContext(supabase: Supabase, tripId: string, userId: string): Promise<TripContextData | null> {
  const { data: trip } = await supabase
    .from("trips")
    .select("owner_id, destination, start_date, end_date")
    .eq("id", tripId)
    .maybeSingle();
  if (!trip || trip.owner_id !== userId) return null;

  const { data } = await supabase
    .from("items")
    .select("kind, day, time, name, address")
    .eq("trip_id", tripId)
    .order("day")
    .order("time", { nullsFirst: false })
    .limit(MAX_EXISTING)
    .returns<ExistingItem[]>();
  const existing = data ?? [];
  const days = tripDays(trip.start_date, trip.end_date);
  const maxDay = Math.max(0, ...existing.map((i) => i.day));
  const dayCount = Math.max(dayChoices(days, trip.start_date !== null).length, maxDay);
  const busy: Record<number, number> = {};
  for (const i of existing) busy[i.day] = (busy[i.day] ?? 0) + 1;

  return { destination: trip.destination, startDate: trip.start_date, endDate: trip.end_date, days, dayCount, existing, busy };
}
