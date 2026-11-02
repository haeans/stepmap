// 1화면 형식: A안 "크게"(PC 기본), B안 "종이"(모바일 기본). 사용자가 고른 형식이 있으면 그것을 쓴다. (decisions.md D5)

export type ScheduleFormat = "a" | "b";

export const FORMAT_STORAGE_KEY = "stepmap:schedule-format";
export const WIDE_SCREEN_QUERY = "(min-width: 768px)";

export function isScheduleFormat(value: unknown): value is ScheduleFormat {
  return value === "a" || value === "b";
}

export function resolveFormat(saved: string | null, isWideScreen: boolean): ScheduleFormat {
  if (isScheduleFormat(saved)) return saved;
  return isWideScreen ? "a" : "b";
}
