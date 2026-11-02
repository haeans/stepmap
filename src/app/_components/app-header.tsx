import Link from "next/link";
import { signOut } from "@/app/actions/auth";

export function AppHeader({ email }: { email: string }) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/" className="text-2xl font-semibold">
        stepmap
      </Link>
      <div className="flex min-w-0 items-center gap-3 text-sm">
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
