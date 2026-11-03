import "server-only";
import { unstable_cache } from "next/cache";
import type { TripWeather, WeatherDay } from "./codes";

// 여행 날씨 (F10 GO 패널). Open-Meteo는 무료이고 키가 필요 없다.
// 여행이 앞으로 16일 안이면 예보, 더 멀면 작년 같은 날짜의 실제 날씨(아카이브)를 보여 준다.

const FORECAST = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE = "https://archive-api.open-meteo.com/v1/archive";
const FORECAST_DAYS = 16;
const MAX_DAYS = 10;

type Daily = {
  time?: string[];
  weather_code?: number[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  precipitation_probability_max?: (number | null)[];
};

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function toDays(daily: Daily | undefined, shiftYears = 0): WeatherDay[] {
  if (!daily?.time) return [];
  return daily.time.map((date, i) => ({
    date: shiftYears ? `${Number(date.slice(0, 4)) + shiftYears}${date.slice(4)}` : date,
    code: daily.weather_code?.[i] ?? 3,
    max: Math.round(daily.temperature_2m_max?.[i] ?? 0),
    min: Math.round(daily.temperature_2m_min?.[i] ?? 0),
    rainChance: daily.precipitation_probability_max?.[i] ?? null,
  }));
}

// 실패하면 예외(캐시하지 않게)
async function fetchWeather(lat: number, lng: number, start: string, end: string, today: string): Promise<Omit<TripWeather, "place">> {
  const coords = `latitude=${lat}&longitude=${lng}&timezone=auto`;
  if (start <= addDays(today, FORECAST_DAYS - 1) && end >= today) {
    const from = start < today ? today : start;
    const to = end > addDays(today, FORECAST_DAYS - 1) ? addDays(today, FORECAST_DAYS - 1) : end;
    const res = await fetch(
      `${FORECAST}?${coords}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&start_date=${from}&end_date=${to}`,
      { signal: AbortSignal.timeout(5000), cache: "no-store" },
    );
    if (!res.ok) throw new Error(`forecast ${res.status}`);
    return { source: "forecast", days: toDays(((await res.json()) as { daily?: Daily }).daily) };
  }
  // 먼 여행: 작년 같은 날짜
  const lastYear = (iso: string) => `${Number(iso.slice(0, 4)) - 1}${iso.slice(4)}`;
  const res = await fetch(`${ARCHIVE}?${coords}&daily=weather_code,temperature_2m_max,temperature_2m_min&start_date=${lastYear(start)}&end_date=${lastYear(end)}`, {
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`archive ${res.status}`);
  return { source: "last-year", days: toDays(((await res.json()) as { daily?: Daily }).daily, 1) };
}

const cached = unstable_cache(fetchWeather, ["trip-weather-v1"], { revalidate: 60 * 60 * 3 });

export async function tripWeather(input: {
  place: string;
  lat: number | null;
  lng: number | null;
  start: string | null;
  end: string | null;
}): Promise<TripWeather | null> {
  if (input.lat === null || input.lng === null || !input.start) return null;
  const end = input.end && input.end >= input.start ? input.end : input.start;
  const capped = end > addDays(input.start, MAX_DAYS - 1) ? addDays(input.start, MAX_DAYS - 1) : end;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const result = await cached(Number(input.lat.toFixed(2)), Number(input.lng.toFixed(2)), input.start, capped, today);
    return result.days.length ? { place: input.place, ...result } : null;
  } catch (error) {
    console.error("weather error", error instanceof Error ? error.message : error);
    return null;
  }
}
