// 교통 항목의 이름을 편명·출발지·도착지로 나누고 합친다 (F17).
// DB에는 이름 한 칸으로 저장한다. 형식은 "KE123 ICN → KIX"로, GO 패널의 parseFlight(go-info.ts)가 읽는 모양이다.

export type Route = { carrier: string; from: string; to: string };

const ARROW = /\s*(?:→|->)\s*/;

export function joinRoute({ carrier, from, to }: Route): string {
  const c = carrier.trim();
  const f = from.trim();
  const t = to.trim();
  const route = f && t ? `${f} → ${t}` : f ? `${f} →` : t ? `→ ${t}` : "";
  return [c, route].filter(Boolean).join(" ");
}

// 화살표가 없으면 이름 전체를 편명·교통편으로 본다.
// 화살표 왼쪽이 여러 낱말이면 마지막 낱말이 출발지, 앞은 편명이다. 오른쪽 전체가 도착지다.
export function splitRoute(name: string): Route {
  const m = name.match(ARROW);
  if (!m || m.index === undefined) return { carrier: name.trim(), from: "", to: "" };
  const left = name.slice(0, m.index).trim();
  const to = name.slice(m.index + m[0].length).trim();
  const words = left.split(/\s+/).filter(Boolean);
  const from = words.pop() ?? "";
  return { carrier: words.join(" "), from, to };
}
