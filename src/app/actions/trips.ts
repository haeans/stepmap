"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/user";
import { COVER_BUCKET, coverObjectPath } from "@/lib/cover/cover";
import { findDestinationArea } from "@/lib/cover/destination";
import { notifyDownload, searchCover } from "@/lib/cover/unsplash";
import { periodLength, shiftForPeriod } from "@/lib/extract/period";
import { createClient } from "@/lib/supabase/server";
import { MAX_DAYS } from "@/lib/trips/days";
import { parseTitle, parseTripForm } from "@/lib/trips/validation";

export type ActionState = { error: string | null };

// 소유자 확인은 RLS가 한다. 여기서는 입력값만 검사한다.

export async function createTrip(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = parseTripForm(form);
  if (!parsed.ok) return { error: parsed.error };

  const { title, destination, startDate, endDate } = parsed.value;
  // 동행 인원은 보내지 않는다(DB 기본값 1, 인원은 쓴 돈의 정산에서 넣음, C9 F24).
  // 대표 이미지는 만들 때 한 번만 찾는다. 못 찾아도 여행은 만든다. (F08)
  // 목적지가 실제 지역으로 확인될 때만 그 지역 이름으로 찾는다. 아니면 엉뚱한 사진 대신 기본 카드(C9 F24).
  const area = await findDestinationArea(destination);
  const pick = area ? await searchCover(area) : null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .insert({ title, destination, start_date: startDate, end_date: endDate, ...pick?.cover })
    .select("id")
    .single();
  if (error || !data) return { error: "여행을 만들지 못했습니다. 다시 시도해 주세요." };
  if (pick) await notifyDownload(pick.downloadLocation);

  revalidatePath("/");
  redirect(`/trips/${data.id}`);
}

export async function renameTrip(tripId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const title = parseTitle(String(form.get("title") ?? ""));
  if (!title.ok) return { error: title.error };

  const supabase = await createClient();
  const { data, error } = await supabase.from("trips").update({ title: title.value }).eq("id", tripId).select("id");
  if (error || !data?.length) return { error: "이름을 고치지 못했습니다." };

  revalidatePath("/");
  revalidatePath(`/trips/${tripId}`);
  return { error: null };
}

// 쓴 돈 정산 인원 (C9 F27, R-09). 여행을 만들 때 받지 않고(F24) 매거진 쓴 돈의 "정산"에서 넣는다.
// 기존 trips.companions 칸에 저장한다(DB 변경 없음). 소유자 확인은 RLS가 한다(공유받은 사람은 0행 → 실패).
export async function setCompanions(tripId: string, companions: number): Promise<ActionState> {
  await requireUser();
  if (!Number.isInteger(companions) || companions < 1 || companions > 99) return { error: "인원은 1명부터 99명까지입니다." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("trips").update({ companions }).eq("id", tripId).select("id");
  if (error || !data?.length) return { error: "인원을 저장하지 못했습니다." };

  revalidatePath(`/trips/${tripId}`);
  return { error: null };
}

// 올린 사진을 대표 이미지로 기록한다. 사진은 브라우저에서 Storage의 "<여행 id>/cover"에 먼저 올린다.
// 주소는 여기서 만든다(아무 주소나 넣지 못하게). ?v=로 바꾼 사진이 바로 보이게 한다. (F08 결정 5, 6)
export async function setUploadedCover(tripId: string): Promise<ActionState> {
  await requireUser();
  const supabase = await createClient();
  const { publicUrl } = supabase.storage.from(COVER_BUCKET).getPublicUrl(coverObjectPath(tripId)).data;
  const { data, error } = await supabase
    .from("trips")
    .update({
      cover_url: `${publicUrl}?v=${Date.now()}`,
      cover_color: null,
      cover_source: "upload",
      cover_author_name: null,
      cover_author_url: null,
    })
    .eq("id", tripId)
    .select("id");
  if (error || !data?.length) return { error: "대표 이미지를 바꾸지 못했습니다." };

  revalidatePath("/");
  revalidatePath(`/trips/${tripId}`);
  return { error: null };
}

// C10 F33: 붙여넣은 원문에 맞춰 여행 기간을 바꾼다(사용자가 "맞추기"를 눌렀을 때만). ([hyunw0000-f33-claude-api] 결정 7)
// 저장된 일정은 날짜를 지킨다: 시작일이 옮겨지면 일차 번호를 그만큼 옮긴다(11/21 일정은 계속 11/21).
// 원래 기간과 새 기간이 겹치지 않으면(멀리 옮김) DAY 번호를 지킨다(shiftForPeriod).
// 새 기간 밖으로 나가는 일정이 있으면 바꾸지 않고 알린다(모르는 사이에 일정이 기간 밖으로 밀리지 않게). 메모는 일차별로 보이지 않아 기간 안으로 당긴다.
// shift: 일차를 옮긴 수. 화면이 저장 전 미리보기 카드도 같은 만큼 옮긴다.
export type PeriodState = { error: string | null; shift?: number };

export async function setTripPeriod(tripId: string, startDate: string, endDate: string): Promise<PeriodState> {
  await requireUser();
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  if (!DATE.test(startDate) || !DATE.test(endDate) || endDate < startDate) return { error: "날짜가 올바르지 않습니다." };
  const dayCount = periodLength({ startDate, endDate });
  if (dayCount > MAX_DAYS) return { error: `여행은 ${MAX_DAYS}일까지 정할 수 있습니다.` };

  const supabase = await createClient();
  const { data: trip } = await supabase.from("trips").select("start_date, end_date").eq("id", tripId).maybeSingle();
  if (!trip) return { error: "여행을 찾을 수 없습니다." };
  const { data: items, error: itemsError } = await supabase.from("items").select("id, day, kind").eq("trip_id", tripId);
  if (itemsError) return { error: "일정을 불러오지 못했습니다." };

  const shift = shiftForPeriod({ startDate: trip.start_date, endDate: trip.end_date }, { startDate, endDate });
  const moves = (items ?? []).map((i) => ({ ...i, next: i.day + shift }));
  const outside = moves.filter((m) => m.kind !== "memo" && (m.next < 1 || m.next > dayCount));
  if (outside.length) {
    const byDay = new Map<number, number>();
    for (const m of outside) byDay.set(m.day, (byDay.get(m.day) ?? 0) + 1);
    const list = [...byDay].sort((a, b) => a[0] - b[0]).map(([day, n]) => `DAY ${day}에 ${n}개`).join(", ");
    return { error: `새 기간 밖으로 나가는 일정이 있어요(${list}). 옮기거나 지운 뒤 다시 맞춰 주세요.` };
  }

  // 일차가 바뀌는 일정만 고친다. 메모는 기간 안으로 당긴다. 소유자 확인은 RLS가 한다.
  const changed = moves
    .map((m) => ({ id: m.id, day: m.day, next: Math.min(Math.max(m.next, 1), dayCount) }))
    .filter((m) => m.next !== m.day);
  const results = await Promise.all(changed.map((m) => supabase.from("items").update({ day: m.next }).eq("id", m.id).select("id")));
  if (results.some((r) => r.error || !r.data?.length)) return { error: "일정의 일차를 옮기지 못했습니다. 새로 고침 뒤 다시 시도해 주세요." };

  const { data, error } = await supabase.from("trips").update({ start_date: startDate, end_date: endDate }).eq("id", tripId).select("id");
  if (error || !data?.length) return { error: "여행 기간을 바꾸지 못했습니다." };

  revalidatePath("/");
  revalidatePath(`/trips/${tripId}`);
  return { error: null, shift };
}

export async function deleteTrip(tripId: string): Promise<ActionState> {
  await requireUser();
  const supabase = await createClient();
  // 올린 대표 사진도 지운다. 여행을 지우면 Storage 정책의 소유자 확인이 안 되므로 먼저 지운다. 실패해도 진행한다. (F08 결정 8)
  const { error: coverError } = await supabase.storage.from(COVER_BUCKET).remove([coverObjectPath(tripId)]);
  if (coverError) console.error("cover remove failed", coverError.name);
  const { data, error } = await supabase.from("trips").delete().eq("id", tripId).select("id");
  if (error || !data?.length) return { error: "여행을 지우지 못했습니다." };

  revalidatePath("/");
  return { error: null };
}
