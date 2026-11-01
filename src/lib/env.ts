// 환경 변수를 한곳에서 읽는다. 값은 .env.local과 Vercel 환경 변수에만 둔다.
// NEXT_PUBLIC_ 값은 빌드 때 그대로 박혀야 하므로 process.env.X 형태로 직접 읽는다.

export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`환경 변수 ${name}가 없습니다. .env.example을 보고 .env.local에 넣어 주세요.`);
  }
  return value;
}

export function supabaseEnv() {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    publishableKey: requireEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}
