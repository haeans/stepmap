// 항목 수정 창의 공용 틀 (F10). "＋ 입력" 창과 같은 어두운 유리 패널, 굵은 제목, 둥근 닫기 버튼.
// 안의 입력 칸·저장 버튼은 data-tone="dark"를 보고 어두운 모양이 된다(form-styles).

// 수정 화면을 담는 패널 (창 안에 넣을 때)
export const EDIT_PANEL = "overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/90 text-white shadow-2xl shadow-black/50 backdrop-blur-2xl [color-scheme:dark]";

// <dialog> 자체를 수정 창으로 쓸 때
export const EDIT_DIALOG = `m-auto w-[min(30rem,calc(100vw-2rem))] p-0 backdrop:bg-black/55 backdrop:backdrop-blur-sm ${EDIT_PANEL}`;

export function EditHeader({ title, sub, onClose, closeLabel = "닫기" }: { title: string; sub?: string; onClose: () => void; closeLabel?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
      <div className="min-w-0">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        {sub && <p className="truncate text-xs text-white/55">{sub}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:rotate-90 hover:bg-white/10 hover:text-white active:scale-90"
      >
        ✕
      </button>
    </div>
  );
}
