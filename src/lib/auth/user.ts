import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
};

// 로그인한 사용자를 돌려준다. 없으면 로그인 화면으로 보낸다.
// proxy를 거치지 않는 경우에도 화면마다 다시 확인한다.
export async function requireUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/login");
  }
  return { id: data.user.id, email: data.user.email ?? "" };
}
