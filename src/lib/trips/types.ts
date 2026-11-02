// Supabase에서 읽어 온 trips 행 (컬럼 이름 그대로)
export type Trip = {
  id: string;
  owner_id: string;
  title: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  companions: number;
  // 대표 이미지 (F08). 없으면 모두 null
  cover_url: string | null;
  cover_color: string | null;
  cover_source: "unsplash" | "upload" | null;
  cover_author_name: string | null;
  cover_author_url: string | null;
  created_at: string;
  updated_at: string;
};

export const TRIP_COLUMNS =
  "id, owner_id, title, destination, start_date, end_date, companions, cover_url, cover_color, cover_source, cover_author_name, cover_author_url, created_at, updated_at";

export function formatTripPeriod(trip: Pick<Trip, "start_date" | "end_date">): string {
  if (trip.start_date && trip.end_date) return `${trip.start_date} ~ ${trip.end_date}`;
  return trip.start_date ?? trip.end_date ?? "날짜 미정";
}
