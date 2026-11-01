// Supabase에서 읽어 온 trips 행 (컬럼 이름 그대로)
export type Trip = {
  id: string;
  owner_id: string;
  title: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  companions: number;
  created_at: string;
  updated_at: string;
};

export const TRIP_COLUMNS =
  "id, owner_id, title, destination, start_date, end_date, companions, created_at, updated_at";

export function formatTripPeriod(trip: Pick<Trip, "start_date" | "end_date">): string {
  if (trip.start_date && trip.end_date) return `${trip.start_date} ~ ${trip.end_date}`;
  return trip.start_date ?? trip.end_date ?? "날짜 미정";
}
