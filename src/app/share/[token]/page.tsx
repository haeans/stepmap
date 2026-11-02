import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/app/_components/app-header";
import { requireUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

// 공유 링크 진입 (R-08). 로그인하지 않았으면 proxy가 로그인으로 보내고, 로그인 후 여기로 돌아온다.
// accept_share가 로그인한 본인을 보기 전용으로 등록하고 여행 id를 돌려준다. (B25)
export default async function SharePage({ params }: PageProps<"/share/[token]">) {
  const { token } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: tripId } = await supabase.rpc("accept_share", { share_token: token });
  if (typeof tripId === "string") redirect(`/trips/${tripId}`);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <AppHeader email={user.email} />
      <p>공유 링크가 올바르지 않습니다. 링크를 보낸 사람에게 다시 확인해 주세요.</p>
      <Link href="/" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← 내 여행 목록
      </Link>
    </main>
  );
}
