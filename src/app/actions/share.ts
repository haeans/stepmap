"use server";

import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

// R-08 공유 링크. 여행마다 하나만 두고, 있으면 그것을 돌려준다. (B26)
// 소유자만 링크를 보고 만들 수 있다(share_links RLS). 소유자가 아니면 결과가 비어 실패로 끝난다.

export type ShareLinkResult = { token: string | null; error: string | null };

export async function getOrCreateShareLink(tripId: string): Promise<ShareLinkResult> {
  await requireUser();
  const supabase = await createClient();

  const { data: existing } = await supabase.from("share_links").select("token").eq("trip_id", tripId).maybeSingle();
  if (existing) return { token: existing.token, error: null };

  // 추측할 수 없게 무작위 32바이트를 쓴다(base64url 43자).
  const token = randomBytes(32).toString("base64url");
  const { data, error } = await supabase.from("share_links").insert({ trip_id: tripId, token }).select("token").maybeSingle();
  if (data) return { token: data.token, error: null };

  // 동시에 두 번 눌러 이미 만들어졌으면 그 링크를 다시 읽는다.
  if (error?.code === "23505") {
    const { data: again } = await supabase.from("share_links").select("token").eq("trip_id", tripId).maybeSingle();
    if (again) return { token: again.token, error: null };
  }
  return { token: null, error: "공유 링크를 만들지 못했습니다." };
}
