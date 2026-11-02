import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/env";

// 브라우저(클라이언트 컴포넌트)용 클라이언트. 공개 키만 쓰고 RLS가 그대로 적용된다.
export function createClient() {
  const { url, publishableKey } = supabaseEnv();
  return createBrowserClient(url, publishableKey);
}
