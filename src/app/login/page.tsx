import { redirect } from "next/navigation";
import { isDevLoginEnabled } from "@/lib/auth/dev-login";
import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { DevLoginButtons } from "./dev-login/dev-login-buttons";
import { GoogleLoginButton } from "./google-login-button";

const ERROR_MESSAGES: Record<string, string> = {
  callback: "구글 로그인을 마치지 못했습니다. 다시 시도해 주세요.",
  dev: "개발용 계정으로 로그인하지 못했습니다. .env.local의 계정 정보를 확인해 주세요.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? ERROR_MESSAGES[params.error] : undefined;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    redirect(next);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">stepmap</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          흩어진 여행 정보를 붙여넣으면 한 장의 여행 계획과 지도 위 동선이 됩니다.
        </p>
      </div>
      <GoogleLoginButton next={next} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {isDevLoginEnabled() && <DevLoginButtons next={next} />}
    </main>
  );
}
