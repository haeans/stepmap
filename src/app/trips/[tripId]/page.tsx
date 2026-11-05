import { notFound } from "next/navigation";
import { AppHeader } from "@/app/_components/app-header";
import { requireUser } from "@/lib/auth/user";
import { coverSrc } from "@/lib/cover/cover";
import { groupItems } from "@/lib/items/group";
import { attachSecrets } from "@/lib/items/store";
import { ITEM_COLUMNS, type Item } from "@/lib/items/types";
import { findHubs } from "@/lib/map/hub-lookup";
import { scheduleHubItems, schedulePins } from "@/lib/map/places";
import { createClient } from "@/lib/supabase/server";
import { readChecks } from "@/lib/trips/checks";
import { tripWeather } from "@/lib/weather/open-meteo";
import { dayChoices, tripDays } from "@/lib/trips/days";
import { TRIP_COLUMNS, type Trip } from "@/lib/trips/types";
import { InputPanel } from "./_components/input-panel";
import { MapView } from "./_components/map-view";
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

  const { data: rows } = await supabase.from("items").select(ITEM_COLUMNS).eq("trip_id", trip.id).returns<Item[]>();
  // 예약 정보(F20)는 소유자에게만 붙인다. 공유받은 사람에게는 서버가 원래 값을 보내지 않는다.
  const items = readOnly ? (rows ?? []) : await attachSecrets(supabase, trip.id, rows ?? []);
  // 준비물(C10 F31). 매거진 BACK에만 보이고, 공유받은 사람도 읽는다. 읽지 못하면 빈 목록.
  const checks = view === "schedule" ? ((await readChecks(supabase, trip.id)) ?? []) : [];
  const grouped = groupItems(items ?? [], tripDays(trip.start_date, trip.end_date));
  const choices = dayChoices(
    grouped.days.map((d) => d.day),
    trip.start_date !== null,
  );

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6 pb-28">
      {/* 매거진: 바 없이 사진 위에 로고(왼쪽 위)와 매거진/지도·프로필(오른쪽 위)만 놓는다 (C9 F23).
          여행 목록·공유·로그아웃은 프로필 메뉴에 있다. 사진 위에서는 흰색으로 바뀐다(<html data-cover>, F10). */}
      {/* 지도 탭에는 머리글이 없다. 로고는 PINS 패널, 일정/지도 전환과 프로필은 지도 오른쪽 위에 있다 (F14 결정 6, F23). */}
      {view === "schedule" && (
        <AppHeader email={user.email} trip={{ id: trip.id, readOnly }} floating>
          <ViewSwitch tripId={trip.id} current={view} />
        </AppHeader>
      )}
      {view === "schedule" ? (
        <ScheduleView
          trip={trip}
          grouped={grouped}
          count={items?.length ?? 0}
          dayOptions={choices}
          readOnly={readOnly}
          checks={checks}
          // GO 패널 날씨: 숙소(없으면 첫 장소) 좌표로 Open-Meteo에서 구한다 (3시간 캐시)
          weather={await tripWeather({
            place: trip.destination || trip.title,
            ...weatherSpot(items ?? []),
            start: trip.start_date,
            end: trip.end_date,
          })}
          // 대표 이미지(F08). 없으면 매거진이 목적지 색의 임시 그림을 쓴다.
          coverUrl={trip.cover_url ? coverSrc(trip.cover_url, 1920) : null}
        />
      ) : (
        <TripMap
          items={items ?? []}
          days={grouped.days.map((d) => d.day.day)}
          itemId={typeof query.item === "string" ? query.item : null}
          trip={{ id: trip.id, startDate: trip.start_date, endDate: trip.end_date }}
          email={user.email}
          readOnly={readOnly}
        />
      )}
      {/* 곰발바닥(입력창) 버튼은 매거진 탭에만 둔다 (F25) */}
      {!readOnly && view === "schedule" && <InputPanel tripId={trip.id} days={choices} />}
    </main>
  );
}

// 날씨를 볼 좌표: 숙소 → 첫 장소
function weatherSpot(items: Item[]): { lat: number | null; lng: number | null } {
  const spot = items.find((i) => i.kind === "lodging" && i.lat !== null) ?? items.find((i) => i.lat !== null);
  return { lat: spot?.lat ?? null, lng: spot?.lng ?? null };
}

// 2화면(지도). 교통 거점 좌표는 서버에서 구한다(캐시, F15 결정 1). 경로(동선)는 F25에서 그리지 않는다.
type TripMapProps = {
  items: Item[];
  days: number[];
  itemId: string | null;
  trip: { id: string; startDate: string | null; endDate: string | null }; // 전환 버튼·공유, 가까운 일정 찾기 (F14)
  email: string; // 프로필 메뉴 (F23)
  readOnly: boolean;
};

async function TripMap({ items, days, itemId, trip, email, readOnly }: TripMapProps) {
  // 핀은 하루 일정 규칙(F26 daySchedule)대로. 거점 좌표는 시작·끝 교통만 찾는다 (F25)
  const { places, missing } = schedulePins(days, items, await findHubs(scheduleHubItems(days, items)));
  return <MapView places={places} days={days} missing={missing} initialId={itemId} trip={trip} email={email} readOnly={readOnly} />;
}
