"use client";

// 쪽지 영역에서 바로 쪽지(메모 항목)를 쓰는 칸 (F10). "＋ 쪽지 쓰기"를 누르면 그 자리에 펼쳐진다.
// 저장은 입력창과 같은 createItem(종류: 메모, 1일차)을 쓴다. 글자색은 바깥을 따른다(매거진 사진 위).

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { createItem, type ItemActionState } from "@/app/actions/items";

// title: 넘기면 제목 줄 오른쪽에 "＋ 쪽지 쓰기"를 둔다. children: 쓰는 칸 아래에 놓을 쪽지 목록.
export function NoteComposer({ tripId, title, children }: { tripId: string; title?: ReactNode; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ItemActionState, FormData>(createItem.bind(null, tripId), { error: null, saved: null });
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<ItemActionState | null>(null);

  // 저장되면 칸을 비우고 닫는다.
  useEffect(() => {
    if (state.saved && handled.current !== state) {
      handled.current = state;
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state]);

  const field =
    "w-full rounded-xl border border-current/20 bg-current/5 px-3 py-2 text-sm placeholder:text-current placeholder:opacity-50 focus:border-current/50 focus:outline-none";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {title}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={`rounded-full border border-current/25 px-3 py-1 text-xs transition hover:bg-current/10 active:scale-95 ${title ? "" : "mr-auto"}`}
        >
          {open ? "닫기" : "＋ 쪽지 쓰기"}
        </button>
      </div>
      <div className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="min-h-0 overflow-hidden">
          <form ref={formRef} action={formAction} inert={!open} className="flex flex-col gap-2 pt-1 pb-1">
            <input type="hidden" name="kind" value="memo" />
            <input type="hidden" name="day" value="1" />
            <input name="name" required maxLength={200} placeholder="제목 (예: 11월 홍콩은 저녁에 쌀쌀함)" aria-label="쪽지 제목" className={field} />
            <textarea name="memo" maxLength={2000} rows={3} placeholder="내용 (예: 얇은 겉옷 챙기기)" aria-label="쪽지 내용" className={`${field} resize-none`} />
            <div className="flex items-center gap-2">
              {state.error && <p className="text-xs text-rose-400">{state.error}</p>}
              <button
                type="submit"
                disabled={pending}
                className="ml-auto rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50 dark:bg-white dark:text-zinc-900 [html[data-cover]_&]:bg-white [html[data-cover]_&]:text-zinc-900"
              >
                {pending ? "남기는 중…" : "쪽지 남기기"}
              </button>
            </div>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
