"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  FORMAT_STORAGE_KEY,
  resolveFormat,
  WIDE_SCREEN_QUERY,
  type ScheduleFormat,
} from "@/lib/trips/schedule-format";

// 고른 형식은 이 브라우저에만 저장한다. 저장소를 못 쓰면 화면 크기로 정한다.
const CHANGE_EVENT = "stepmap:schedule-format-change";

// 저장소를 쓸 수 없을 때 이번 페이지 동안만 기억하는 값
let memoryFormat: ScheduleFormat | null = null;

function readSaved(): string | null {
  try {
    return window.localStorage.getItem(FORMAT_STORAGE_KEY) ?? memoryFormat;
  } catch {
    return memoryFormat;
  }
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(WIDE_SCREEN_QUERY);
  media.addEventListener("change", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): ScheduleFormat {
  return resolveFormat(readSaved(), window.matchMedia(WIDE_SCREEN_QUERY).matches);
}

// 서버에서는 화면 크기를 모르므로 null. 브라우저에서 바로 정해진다.
function getServerSnapshot(): ScheduleFormat | null {
  return null;
}

export function useScheduleFormat() {
  const format = useSyncExternalStore<ScheduleFormat | null>(subscribe, getSnapshot, getServerSnapshot);

  const setFormat = useCallback((next: ScheduleFormat) => {
    memoryFormat = next;
    try {
      window.localStorage.setItem(FORMAT_STORAGE_KEY, next);
    } catch {
      // 저장하지 못해도 이번 페이지에서는 memoryFormat으로 바뀐다.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [format, setFormat] as const;
}
