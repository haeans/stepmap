import Link from "next/link";
import type { ReactNode } from "react";
import { ProfileMenu } from "./profile-menu";

// 상단바 (C9 F23). 어느 화면에서나 로고는 화면 왼쪽 위, 프로필 버튼은 화면 오른쪽 위(위·옆 16px)에 온다.
// 페이지의 main이 p-6이고 가운데 놓여 있어, 화면 폭 전체로 넓히고(mx-[calc(50%-50vw)]) 위 여백(-mt-6)을 덮는다.
// floating: 매거진처럼 바 없이 사진 위에 로고와 버튼만 놓는다. 없으면 스크롤해도 위에 붙고 뒤가 흐리게 비친다(B44).
// trip: 여행 화면이면 프로필 메뉴에 여행 목록·공유 줄이 생긴다. children은 프로필 왼쪽에 놓는다(매거진/지도 버튼).
export function AppHeader({
  email,
  trip,
  floating = false,
  children,
}: {
  email: string;
  trip?: { id: string; readOnly: boolean };
  floating?: boolean;
  children?: ReactNode;
}) {
  return (
    <header
      className={`relative -mt-6 mx-[calc(50%-50vw)] flex items-center justify-between gap-3 px-4 py-4 ${
        floating
          ? "z-20"
          : "sticky top-0 z-20 before:absolute before:inset-0 before:-z-10 before:border-b before:border-line/70 before:bg-background/75 before:backdrop-blur-md"
      }`}
    >
      <Link href="/" aria-label="Stepmap 여행 목록" className="flex shrink-0 items-center gap-2">
        <Logo className="h-10" />
        <span className="font-serif text-2xl font-bold tracking-tight text-[#603820] dark:text-white [html[data-cover]_&]:text-white">Stepmap</span>
      </Link>
      <div className="flex min-w-0 items-center gap-2">
        {children}
        <ProfileMenu email={email} trip={trip} />
      </div>
    </header>
  );
}

// 로고 그림(public/brand/logo-mark.png: 발자국·핀만, 투명 바탕). 글자 "Stepmap"은 그림이 아니라 글꼴로 쓴다(대문자 S).
// 갈색이라 어두운 바탕에서는 안 보이므로 매거진 사진 위(<html data-cover>)와 다크 모드에서는 흰색 한 가지로 바꾼다.
// 지도 탭은 PINS 패널 안에서 그림만 쓴다.
export function Logo({ className = "h-8" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 브랜드 이미지는 <img>로 쓴다(B49)
    <img src="/brand/logo-mark.png" alt="" width={67} height={60} className={`w-auto dark:brightness-0 dark:invert [html[data-cover]_&]:brightness-0 [html[data-cover]_&]:invert ${className}`} />
  );
}
