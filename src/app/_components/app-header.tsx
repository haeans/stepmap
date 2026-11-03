import Link from "next/link";
import { signOut } from "@/app/actions/auth";

// 앱 머리글 (F07). 혼자 쓰일 때는 스크롤해도 위에 붙어 있고, 뒤 내용이 흐리게 비친다.
// 페이지의 main이 p-6이라 -mx-6 -mt-6으로 바깥 여백까지 덮는다. 흐린 바탕(before)은 화면 폭 전체로 깐다.
// className: 여행 상세는 넓은 화면에서 머리글을 다른 버튼들과 한 줄로 펼친다(xl:contents, F10).
//   이때는 사진 위에 놓일 수 있으므로 붙는 바탕 없이 바깥 글자색을 따른다.
// order: 그렇게 펼쳤을 때 로고는 맨 왼쪽, 이메일·로그아웃은 오른쪽 묶음 앞에 온다. 혼자 쓰일 때는 순서가 그대로다.
export function AppHeader({ email, className = "" }: { email: string; className?: string }) {
  const inline = className !== "";
  return (
    <header
      className={
        inline
          ? `flex items-center justify-between gap-4 ${className}`
          : "sticky top-0 z-10 -mx-6 -mt-6 flex items-center justify-between gap-4 px-6 py-4 before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:border-b before:border-line/70 before:bg-background/75 before:backdrop-blur-md"
      }
    >
      <Link href="/" className="flex items-center gap-2.5 font-serif text-xl font-bold tracking-tight xl:order-1">
        {/* 낙관(도장) 모양 로고. 步 = 걸음 */}
        <span aria-hidden className="flex size-7 -rotate-3 items-center justify-center rounded-md bg-accent font-serif text-sm leading-none text-[#fbf7ef] shadow-sm">
          步
        </span>
        stepmap
      </Link>
      <div className="flex min-w-0 items-center gap-2 text-sm xl:order-3 xl:ml-auto">
        {inline ? (
          <span className="truncate opacity-70">{email}</span>
        ) : (
          <span className="hidden truncate rounded-full border border-line bg-surface/70 px-3 py-1.5 text-muted sm:inline">{email}</span>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className={
              inline
                ? "whitespace-nowrap rounded-full border border-current/25 px-3 py-1.5 hover:bg-current/10"
                : "whitespace-nowrap rounded-full px-3 py-1.5 text-muted hover:bg-zinc-200/60 hover:text-foreground dark:hover:bg-zinc-800"
            }
          >
            로그아웃
          </button>
        </form>
      </div>
    </header>
  );
}
