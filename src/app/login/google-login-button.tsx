"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GoogleLoginButton({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", next);

    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo.toString() },
    });
    if (error) {
      setError("구글 로그인을 시작하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      setPending(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2.5 rounded-full bg-foreground px-5 py-3 font-medium text-background shadow-md hover:opacity-90 disabled:opacity-50"
      >
        <span aria-hidden className="flex size-5 items-center justify-center rounded-full bg-background text-xs font-bold text-foreground">
          G
        </span>
        {pending ? "구글로 이동 중…" : "구글 계정으로 로그인"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
