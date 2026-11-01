import Link from "next/link";
import { signOut } from "@/app/actions/auth";

export function AppHeader({ email }: { email: string }) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/" className="text-2xl font-semibold">
        stepmap
      </Link>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">{email}</span>
        <form action={signOut}>
          <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
            로그아웃
          </button>
        </form>
      </div>
    </header>
  );
}
