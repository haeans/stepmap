"use server";

// 개발용 로그인 (decisions.md B3). v1.0에서 이 폴더째 삭제한다.
import { redirect } from "next/navigation";
import { devCredentials, isDevLoginEnabled, type DevRole } from "@/lib/auth/dev-login";
import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function devLogin(role: DevRole, next: string) {
  if (!isDevLoginEnabled()) {
    throw new Error("개발용 로그인이 꺼져 있습니다.");
  }
  const credentials = devCredentials(role);
  if (!credentials) {
    throw new Error(".env.local에 개발용 계정 정보가 없습니다.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) {
    redirect(`/login?error=dev&next=${encodeURIComponent(safeNextPath(next))}`);
  }
  redirect(safeNextPath(next));
}
