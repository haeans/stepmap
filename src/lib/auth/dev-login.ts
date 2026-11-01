// 개발용 로그인 (decisions.md B3). v1.0에서 이 파일과 src/app/login/dev-login 폴더를 삭제한다.

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
