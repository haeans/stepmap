// 개발용 로그인 (decisions.md B3). v1.0에서 이 폴더째 삭제한다.
import { devLogin } from "./actions";

export function DevLoginButtons({ next }: { next: string }) {
  return (
    <section className="flex flex-col items-center gap-2 rounded-md border border-dashed border-amber-500 p-4">
      <p className="text-sm text-amber-700 dark:text-amber-400">개발용 로그인 (배포본에는 없음)</p>
      <div className="flex gap-2">
        <form action={devLogin.bind(null, "owner", next)}>
          <button type="submit" className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
            소유자로 들어가기
          </button>
        </form>
        <form action={devLogin.bind(null, "viewer", next)}>
          <button type="submit" className="rounded-md border border-amber-500 px-4 py-2 text-sm font-medium hover:bg-amber-50 dark:hover:bg-zinc-900">
            보기 전용으로 들어가기
          </button>
        </form>
      </div>
    </section>
  );
}
