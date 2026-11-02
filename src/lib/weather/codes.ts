// 날씨 코드(WMO, Open-Meteo)를 화면 표시로 바꾼다. (F10 GO 패널 날씨)

export type WeatherKind = "sun" | "partly" | "cloud" | "fog" | "rain" | "snow" | "storm";

export type WeatherDay = { date: string; code: number; max: number; min: number; rainChance: number | null };

export type TripWeather = {
  place: string; // 날씨를 본 곳 (목적지)
  source: "forecast" | "last-year"; // 예보 / 16일보다 먼 여행이면 작년 같은 날
  days: WeatherDay[];
};

export function weatherKind(code: number): WeatherKind {
  if (code === 0 || code === 1) return "sun";
  if (code === 2) return "partly";
  if (code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  return "cloud";
}

const LABELS: Record<WeatherKind, string> = { sun: "맑음", partly: "구름 조금", cloud: "흐림", fog: "안개", rain: "비", snow: "눈", storm: "뇌우" };

export function weatherLabel(code: number): string {
  return LABELS[weatherKind(code)];
}

export function isRainy(day: WeatherDay): boolean {
  const kind = weatherKind(day.code);
  return kind === "rain" || kind === "storm" || (day.rainChance ?? 0) >= 60;
}

// 최저 기온으로 겉옷 안내
export function clothingTip(min: number): string {
  if (min <= 5) return "두꺼운 겉옷 필요";
  if (min <= 12) return "겉옷 필요";
  if (min <= 18) return "얇은 겉옷";
  return "가볍게";
}
