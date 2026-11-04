"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CardPhoto, PhotoResponse } from "@/lib/places/types";

// 사진 주소에 붙이는 버전: 사진을 정하는 값(종류·이름·주소)의 짧은 해시. 그 값을 고치면 브라우저 캐시(14일) 대신 새로 받는다.
// updated_at을 쓰지 않는 이유: 사진 경로가 장소 ID·Wikimedia 결과를 저장할 때도 바뀌어 캐시가 한 번 더 깨지고(Google 과금),
// 메모·비용만 고쳐도 다시 받게 되기 때문이다.
export function photoVersion(kind: string, name: string, address: string): string {
  let h = 5381;
  for (const c of `${kind}|${name}|${address}`) h = ((h << 5) + h + c.codePointAt(0)!) >>> 0;
  return h.toString(36);
}

// 매거진 장소 카드 사진 (C8 F22). 카드가 화면 가까이 오면 한 번 부른다(보이지 않는 카드는 부르지 않음).
// Google 사진 주소는 짧게만 쓸 수 있어 캐시 동안 만료될 수 있다. 그림이 깨지면 캐시를 건너뛰고 한 번만 다시 받는다.
export function usePlacePhoto(tripId: string, itemId: string, version: string, enabled: boolean) {
  const ref = useRef<HTMLElement>(null);
  const [photo, setPhoto] = useState<CardPhoto | null>(null);
  const retried = useRef(false);
  const url = `/trips/${tripId}/photo/${itemId}?v=${encodeURIComponent(version)}`;

  const load = useCallback(
    async (cache: RequestCache) => {
      try {
        const res = await fetch(url, { cache });
        if (!res.ok) return setPhoto(null);
        setPhoto(((await res.json()) as PhotoResponse).photo);
      } catch {
        setPhoto(null);
      }
    },
    [url],
  );

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        void load("default");
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, load]);

  const onError = useCallback(() => {
    if (retried.current) return setPhoto(null);
    retried.current = true;
    void load("reload");
  }, [load]);

  return { ref, photo, onError };
}
