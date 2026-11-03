import Link from "next/link";
import { signOut } from "@/app/actions/auth";

// className: 여행 상세는 넓은 화면에서 머리글을 다른 버튼들과 한 줄로 펼친다(xl:contents, F10).
// order: 그렇게 펼쳤을 때 로고는 맨 왼쪽, 이메일·로그아웃은 오른쪽 묶음 앞에 온다. 혼자 쓰일 때는 순서가 그대로다.
export function AppHeader({ email, className = "" }: { email: string; className?: string }) {
  return (
    <header className={`flex items-center justify-between gap-4 ${className}`}>
      <Link href="/" className="text-2xl font-semibold xl:order-1">
        stepmap
      </Link>
      <div className="flex min-w-0 items-center gap-3 text-sm xl:order-3 xl:ml-auto">
        <span className="truncate opacity-70">{email}</span>
        <form action={signOut}>
          <button type="submit" className="whitespace-nowrap rounded-md border border-current/25 px-3 py-1.5 transition hover:bg-current/10 active:scale-95">
            로그아웃
          </button>
        </form>
      </div>
    </header>
  );
}
