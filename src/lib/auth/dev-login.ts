// 개발용 로그인 (decisions.md B3, B27). v1.0 이후에도 로컬 개발·다듬기·확장용으로 둔다.

export type DevRole = "owner" | "viewer";

// 개발 모드이면서 DEV_LOGIN=true일 때만 켠다. 배포본(production)에서는 항상 꺼진다.
export function isDevLoginEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === "development" && env.DEV_LOGIN === "true";
}

export function devCredentials(
  role: DevRole,
  env: Record<string, string | undefined> = process.env,
): { email: string; password: string } | null {
  const email = role === "owner" ? env.DEV_OWNER_EMAIL : env.DEV_VIEWER_EMAIL;
  const password = role === "owner" ? env.DEV_OWNER_PASSWORD : env.DEV_VIEWER_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}
