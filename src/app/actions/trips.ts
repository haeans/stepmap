"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { parseTitle, parseTripForm } from "@/lib/trips/validation";

export type ActionState = { error: string | null };

// 소유자 확인은 RLS가 한다. 여기서는 입력값만 검사한다.

export async function createTrip(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = parseTripForm(form);
  if (!parsed.ok) return { error: parsed.error };

  const { title, destination, startDate, endDate, companions } = parsed.value;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .insert({ title, destination, start_date: startDate, end_date: endDate, companions })
    .select("id")
    .single();
  if (error || !data) return { error: "여행을 만들지 못했습니다. 다시 시도해 주세요." };

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

export async function deleteTrip(tripId: string): Promise<ActionState> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("trips").delete().eq("id", tripId).select("id");
  if (error || !data?.length) return { error: "여행을 지우지 못했습니다." };

  revalidatePath("/");
  return { error: null };
}
