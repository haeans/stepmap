"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/user";
import { COVER_BUCKET, coverObjectPath } from "@/lib/cover/cover";
import { findDestinationArea } from "@/lib/cover/destination";
import { notifyDownload, searchCover } from "@/lib/cover/unsplash";
import { createClient } from "@/lib/supabase/server";
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
