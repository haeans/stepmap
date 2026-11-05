// 하늘 배경 (C9 F21). public/brand/sky-background.webp를 화면 전체 뒤에 고정해 깐다(02-FRONTEND.md 7절).
// - "clear": 첫 화면(/login). 그림을 거의 그대로 보인다.
// - "veil": 여행 목록. 같은 그림 위에 밝은 하늘색 반투명 막을 덮어 글자와 카드가 잘 읽히게 한다(안건 2 "하늘 계열 반투명").
// 다크 모드에서는 어두운 막을 덮어 눈부시지 않게 한다. 그림은 아래쪽(지구·명소)이 잘리지 않게 아래 기준으로 맞춘다.
export function SkyBackground({ tone }: { tone: "clear" | "veil" }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element -- 브랜드 이미지는 <img>로 쓴다(B49, 02-FRONTEND.md 7절) */}
      <img src="/brand/sky-background.webp" alt="" className="absolute inset-0 size-full object-cover object-bottom" />
      <div
        className={
          tone === "clear"
            ? "absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-white/20 dark:from-black/45 dark:via-black/40 dark:to-black/55"
            : "absolute inset-0 bg-gradient-to-b from-sky-50/70 via-sky-50/60 to-white/75 dark:from-slate-950/80 dark:via-slate-950/75 dark:to-slate-950/85"
        }
      />
    </div>
  );
}
