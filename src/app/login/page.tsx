import { redirect } from "next/navigation";
import { isDevLoginEnabled } from "@/lib/auth/dev-login";
import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { SkyBackground } from "../_components/sky-background";
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
    <main className="relative flex flex-1 flex-col items-center justify-center p-6">
      {/* 첫 화면 배경: 하늘 그림 (C9 F21) */}
      <SkyBackground tone="clear" />
      <div className="relative flex w-full max-w-sm flex-col items-center gap-8 rounded-[2rem] border border-white/60 bg-surface/80 p-8 text-center shadow-xl backdrop-blur-md sm:p-10 dark:border-line">
        <div className="flex flex-col items-center gap-4">
          {/* 로고(public/brand/logo.png: 발자국·핀·글자 stepmap, 투명 바탕). 다크 모드에서는 흰색으로 보인다(F23 결정 6과 같음). */}
          <h1>
            {/* eslint-disable-next-line @next/next/no-img-element -- 브랜드 이미지는 <img>로 쓴다(B49) */}
            <img src="/brand/logo.png" alt="stepmap" width={183} height={62} className="h-16 w-auto dark:brightness-0 dark:invert" />
          </h1>
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
