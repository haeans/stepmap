// 입력창·수정 창의 공용 모양 (F10). 색은 바깥 글자색을 따른다.
// 선택 칸(select)의 펼친 목록은 바탕이 투명하면 흰 글씨가 안 보여서, 목록만 흰 바탕·검은 글씨로 고정한다(C8 F16).
// 어두운 입력창(data-tone="dark") 안에서는 강조 버튼·고른 칩이 흰색으로 바뀐다(in-data-[tone=dark]).

export const FIELD =
  "w-full rounded-xl border border-current/15 bg-current/[0.04] px-3.5 py-2.5 text-sm transition placeholder:text-current placeholder:opacity-40 hover:border-current/30 focus:border-current/50 focus:bg-current/[0.07] focus:outline-none [&_option]:bg-white [&_option]:text-zinc-900";

export const LABEL = "flex flex-col gap-1.5 text-xs font-medium tracking-wide opacity-90";

export const PRIMARY =
  "rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-zinc-700 active:scale-95 disabled:pointer-events-none disabled:opacity-40 dark:bg-white dark:text-zinc-900 in-data-[tone=dark]:bg-white in-data-[tone=dark]:text-zinc-900 in-data-[tone=dark]:hover:bg-white/85";

export const GHOST = "rounded-full px-4 py-2.5 text-sm opacity-75 transition hover:bg-current/10 hover:opacity-100 active:scale-95 disabled:opacity-40";

export const CHIP =
  "cursor-pointer rounded-full border border-current/20 px-3.5 py-1.5 text-sm transition hover:border-current/40 active:scale-95 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-current/40 dark:has-[:checked]:border-white dark:has-[:checked]:bg-white dark:has-[:checked]:text-zinc-900 in-data-[tone=dark]:has-[:checked]:border-white in-data-[tone=dark]:has-[:checked]:bg-white in-data-[tone=dark]:has-[:checked]:text-zinc-900";

// 채팅 말풍선: 받은 말(왼쪽), 보낸 말·완료 알림(오른쪽). F17부터 밝은 입력창 안에서 쓴다.
export const BUBBLE_IN = "max-w-[85%] self-start rounded-2xl rounded-tl-md bg-foreground/[0.06] px-4 py-2.5 text-sm leading-relaxed ring-1 ring-line";
export const BUBBLE_OUT = "max-w-[85%] self-end rounded-2xl rounded-tr-md bg-zinc-900 px-4 py-2.5 text-sm text-white shadow-lg dark:bg-white dark:text-zinc-900";
