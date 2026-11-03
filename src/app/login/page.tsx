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
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-6">
      {/* 은은한 빛 번짐 (F07 한지 톤) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50rem_28rem_at_50%_-8%,rgb(255_250_240/0.9),transparent_70%)] dark:opacity-10"
      />
      <div className="relative flex w-full max-w-sm flex-col items-center gap-8 rounded-[2rem] border border-line bg-surface/85 p-8 text-center shadow-xl backdrop-blur-md sm:p-10">
        <div className="flex flex-col items-center gap-4">
          {/* 낙관(도장) 모양 로고. 步 = 걸음 */}
          <span aria-hidden className="flex size-16 -rotate-3 items-center justify-center rounded-xl bg-accent font-serif text-3xl leading-none text-[#fbf7ef] shadow-lg">
            步
          </span>
          <h1 className="text-4xl font-bold tracking-tight">stepmap</h1>
          <p className="text-balance leading-relaxed text-muted">
            흩어진 여행 정보를 붙여넣으면 한 장의 여행 계획과 지도 위 동선이 됩니다.
          </p>
        </div>
        <GoogleLoginButton next={next} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {isDevLoginEnabled() && <DevLoginButtons next={next} />}
      </div>
    </main>
  );
}
