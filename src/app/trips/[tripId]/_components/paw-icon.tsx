// 입력 버튼의 곰발바닥 그림 (F17). 단순한 임시 그림이라 F21 디자인 마무리에서 이 파일만 바꾸면 된다.
export function PawIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden className={className}>
      {/* 발가락 4개 */}
      <ellipse cx="14" cy="27" rx="6" ry="7.5" transform="rotate(-20 14 27)" />
      <ellipse cx="25" cy="15" rx="6.5" ry="8" transform="rotate(-6 25 15)" />
      <ellipse cx="39" cy="15" rx="6.5" ry="8" transform="rotate(6 39 15)" />
      <ellipse cx="50" cy="27" rx="6" ry="7.5" transform="rotate(20 50 27)" />
      {/* 발바닥 */}
      <path d="M32 31c-8.5 0-17 9.5-17 17.5 0 5.5 4.5 8.5 9.5 8.5 3.2 0 5.2-1.6 7.5-1.6s4.3 1.6 7.5 1.6c5 0 9.5-3 9.5-8.5C49 40.5 40.5 31 32 31z" />
    </svg>
  );
}
