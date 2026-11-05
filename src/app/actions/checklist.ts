"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { readChecks } from "@/lib/trips/checks";
import { PACKING_MAX, mergePacking, type Check } from "@/lib/trips/packing";

// 준비물 체크리스트 저장 (C10 F31). 브라우저(localStorage)에 두던 것을 trip_checks로 옮겼다.
// 소유자 확인은 RLS가 한다. 바뀐 행이 없으면 실패로 본다. (03-BACKEND.md 1절)
// 화면이 바로 맞출 수 있게 어느 동작이든 바뀐 뒤의 목록 전체를 돌려준다.

export type ChecklistResult =
  | { ok: true; checks: Check[]; added: number; full: number }
  | { ok: false; error: string; checks: Check[] | null };

type Supabase = Awaited<ReturnType<typeof createClient>>;

const id = z.uuid();
const labels = z.array(z.string().max(500)).max(PACKING_MAX * 4);
const imported = z.array(z.object({ label: z.string().max(500), done: z.boolean() })).max(200);

const FAILED = "준비물을 저장하지 못했습니다. 잠시 뒤 다시 해 주세요.";

async function nextPosition(supabase: Supabase, tripId: string): Promise<number> {
  const { data } = await supabase
    .from("trip_checks")
    .select("position")
    .eq("trip_id", tripId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();
  return (data?.position ?? -1) + 1;
}

async function listResult(supabase: Supabase, tripId: string, added = 0, full = 0): Promise<ChecklistResult> {
  const checks = await readChecks(supabase, tripId);
  return checks ? { ok: true, checks, added, full } : { ok: false, error: FAILED, checks: null };
}

// 이름으로 더한다(입력 칸, 붙여넣기). 이미 있는 이름은 건너뛰고, 목록은 30개까지.
export async function addChecks(tripId: string, input: string[]): Promise<ChecklistResult> {
  await requireUser();
  const parsed = z.tuple([id, labels]).safeParse([tripId, input]);
  if (!parsed.success) return { ok: false, error: FAILED, checks: null };

  const supabase = await createClient();
  const current = await readChecks(supabase, tripId);
  if (!current) return { ok: false, error: FAILED, checks: null };
  const { next, added, full } = mergePacking(current, input, (i) => String(i));
  if (!added) return { ok: true, checks: current, added, full };

  const start = await nextPosition(supabase, tripId);
  const rows = next.slice(current.length).map((c, i) => ({ trip_id: tripId, label: c.label, position: start + i }));
  const { error } = await supabase.from("trip_checks").insert(rows);
  if (error) return { ok: false, error: FAILED, checks: current };
  return listResult(supabase, tripId, added, full);
}

// 이 브라우저에 남아 있던 준비물(C9까지)을 한 번만 옮긴다. DB 목록이 비어 있을 때만 넣는다.
export async function importChecks(tripId: string, input: { label: string; done: boolean }[]): Promise<ChecklistResult> {
  await requireUser();
  const parsed = z.tuple([id, imported]).safeParse([tripId, input]);
  if (!parsed.success) return { ok: false, error: FAILED, checks: null };

  const supabase = await createClient();
  const current = await readChecks(supabase, tripId);
  if (!current) return { ok: false, error: FAILED, checks: null };
  if (current.length) return { ok: true, checks: current, added: 0, full: 0 };

  const { next, full } = mergePacking([], input.map((c) => c.label), (i) => String(i));
  const doneByLabel = new Map(input.map((c) => [c.label.replace(/\s+/g, " ").trim(), c.done]));
  const rows = next.map((c, i) => ({ trip_id: tripId, label: c.label, done: doneByLabel.get(c.label) ?? false, position: i }));
  if (!rows.length) return { ok: true, checks: [], added: 0, full };
  const { error } = await supabase.from("trip_checks").insert(rows);
  if (error) return { ok: false, error: FAILED, checks: current };
  return listResult(supabase, tripId, rows.length, full);
}

export async function setCheckDone(tripId: string, checkId: string, value: boolean): Promise<ChecklistResult> {
  await requireUser();
  const parsed = z.tuple([id, id, z.boolean()]).safeParse([tripId, checkId, value]);
  if (!parsed.success) return { ok: false, error: FAILED, checks: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trip_checks")
    .update({ done: value })
    .eq("id", checkId)
    .eq("trip_id", tripId)
    .select("id");
  if (error || !data?.length) return { ok: false, error: FAILED, checks: await readChecks(supabase, tripId) };
  return listResult(supabase, tripId);
}

export async function removeCheck(tripId: string, checkId: string): Promise<ChecklistResult> {
  await requireUser();
  const parsed = z.tuple([id, id]).safeParse([tripId, checkId]);
  if (!parsed.success) return { ok: false, error: FAILED, checks: null };

  const supabase = await createClient();
  const { data, error } = await supabase.from("trip_checks").delete().eq("id", checkId).eq("trip_id", tripId).select("id");
  if (error || !data?.length) return { ok: false, error: FAILED, checks: await readChecks(supabase, tripId) };
  return listResult(supabase, tripId);
}
