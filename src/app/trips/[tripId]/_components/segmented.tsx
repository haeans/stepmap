"use client";

// 여행 상세의 전환 버튼(매거진/지도, 크게/종이)에 쓰는 움직이는 선택 버튼 (F10).
// - 고른 칸 뒤로 흰 알약이 미끄러져 간다. 누르면 바로 움직이고(주소 이동을 기다리지 않음), 누를 때 살짝 눌린다.
// - 반투명 유리 모양이라 흰 바탕과 매거진 사진 위 모두에서 읽힌다. 글자색은 바깥 글자색을 따른다.

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";

export type SegmentedOption = { value: string; label: string; href?: string };

type Props = {
  label: string;
  options: SegmentedOption[];
  value: string;
  onChange?: (value: string) => void;
  role?: "navigation" | "radiogroup";
  size?: "md" | "sm";
};

export function Segmented({ label, options, value, onChange, role = "radiogroup", size = "md" }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  // 링크를 누르면 서버 화면이 바뀌기 전에 알약부터 옮긴다. value가 바뀌면 그 값을 따른다.
  const [picked, setPicked] = useState<{ value: string; from: string } | null>(null);
  const active = picked && picked.from === value ? picked.value : value;

  // 알약 위치는 고른 칸의 위치·폭을 재서 DOM에 바로 넣는다(다시 그리기 없음).
  useLayoutEffect(() => {
    const root = rootRef.current;
    const pill = pillRef.current;
    if (!root || !pill) return;
    const place = () => {
      const el = root.querySelector<HTMLElement>(`[data-value="${CSS.escape(active)}"]`);
      if (!el) return;
      pill.style.width = `${el.offsetWidth}px`;
      pill.style.transform = `translateX(${el.offsetLeft}px)`;
      pill.style.opacity = "1";
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(root);
    return () => observer.disconnect();
  }, [active]);

  const pad = size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm";
  const item = (selected: boolean) =>
    `relative z-10 rounded-full ${pad} whitespace-nowrap transition-[color,opacity,transform] duration-300 active:scale-95 ${
      selected ? "font-semibold text-zinc-900" : "opacity-75 hover:opacity-100"
    }`;

  return (
    <div
      ref={rootRef}
      role={role === "radiogroup" ? "radiogroup" : undefined}
      aria-label={role === "radiogroup" ? label : undefined}
      className="relative flex rounded-full bg-zinc-900/5 p-1 ring-1 ring-zinc-900/10 backdrop-blur-md [html[data-cover]_&]:bg-white/15 [html[data-cover]_&]:ring-white/25 dark:bg-white/10 dark:ring-white/15"
    >
      <span
        ref={pillRef}
        aria-hidden
        className="absolute top-1 bottom-1 left-0 rounded-full bg-white opacity-0 shadow-md shadow-black/15 transition-[transform,width] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"
      />
      {role === "navigation" ? (
        <nav aria-label={label} className="flex">
          {options.map((o) => (
            <Link
              key={o.value}
              href={o.href ?? "#"}
              data-value={o.value}
              aria-current={active === o.value ? "page" : undefined}
              onClick={() => setPicked({ value: o.value, from: value })}
              className={item(active === o.value)}
            >
              {o.label}
            </Link>
          ))}
        </nav>
      ) : (
        options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            data-value={o.value}
            aria-checked={active === o.value}
            onClick={() => onChange?.(o.value)}
            className={item(active === o.value)}
          >
            {o.label}
          </button>
        ))
      )}
    </div>
  );
}
