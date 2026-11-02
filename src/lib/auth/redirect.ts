// 로그인 후 돌아갈 경로. 외부 주소로 보내는 것을 막기 위해 같은 사이트 안의 경로만 허용한다.
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  return next;
}

// 로그인 없이 열 수 있는 경로
export const PUBLIC_PATHS = ["/login", "/auth/callback"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
