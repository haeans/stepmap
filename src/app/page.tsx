import { requireUser } from "@/lib/auth/user";
import { signOut } from "./actions/auth";

export default async function Home() {
  const user = await requireUser();

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">stepmap</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">{user.email}</span>
          <form action={signOut}>
            <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
              로그아웃
            </button>
          </form>
        </div>
      </header>
      {/* 여행 목록은 v0.3(R-02)에서 만든다. */}
      <p className="text-zinc-600 dark:text-zinc-400">여행 목록이 들어갈 자리입니다.</p>
    </main>
  );
}
