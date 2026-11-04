"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CardPhoto, PhotoResponse } from "@/lib/places/types";

// 매거진 장소 카드 사진 (C8 F22). 카드가 화면 가까이 오면 한 번 부른다(보이지 않는 카드는 부르지 않음).
// 주소에 항목의 updated_at을 붙여, 항목을 고치면 브라우저 캐시(14일) 대신 새로 받는다.
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
