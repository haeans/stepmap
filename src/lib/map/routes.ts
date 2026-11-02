import "server-only";
import { unstable_cache } from "next/cache";
import { straightMeters, type LatLng } from "./places";

// 일차별 실제 경로 (a안, B20). 같은 좌표 목록이면 캐시를 써서 Routes API를 다시 부르지 않는다. (B21)

export type RouteMode = "drive" | "transit" | "straight";
export type RouteLeg = { polyline: string | null; meters: number; mode: RouteMode };

const ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";
const MAX_INTERMEDIATES = 25;
const CACHE_SECONDS = 60 * 60 * 24 * 30;

type Leg = { distanceMeters?: number; polyline?: { encodedPolyline?: string } };

const waypoint = (p: LatLng) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });

// 경로가 없으면 null(정상 결과), 호출이 실패하면 예외를 던진다(캐시하지 않게).
async function computeLegs(points: LatLng[], mode: "DRIVE" | "TRANSIT"): Promise<Leg[] | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) throw new Error("no key");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "routes.legs.distanceMeters,routes.legs.polyline.encodedPolyline",
    },
    body: JSON.stringify({
      origin: waypoint(points[0]),
      destination: waypoint(points[points.length - 1]),
      intermediates: points.slice(1, -1).map(waypoint),
      travelMode: mode,
      polylineEncoding: "ENCODED_POLYLINE",
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`routes ${res.status}`);
  const data = (await res.json()) as { routes?: { legs?: Leg[] }[] };
  const legs = data.routes?.[0]?.legs;
  return legs && legs.length === points.length - 1 ? legs : null;
}

function straightLeg(a: LatLng, b: LatLng): RouteLeg {
  return { polyline: null, meters: straightMeters(a, b), mode: "straight" };
}

function toLeg(leg: Leg, a: LatLng, b: LatLng, mode: RouteMode): RouteLeg {
  const polyline = leg.polyline?.encodedPolyline;
  return polyline ? { polyline, meters: leg.distanceMeters ?? straightMeters(a, b), mode } : straightLeg(a, b);
}

async function buildRoute(points: LatLng[]): Promise<RouteLeg[]> {
  // 자동차는 경유지를 넣어 한 번에 구한다.
  const drive = await computeLegs(points, "DRIVE");
  if (drive) return drive.map((leg, i) => toLeg(leg, points[i], points[i + 1], "drive"));

  // 자동차 경로가 없으면(국내 등) 구간마다 대중교통으로 찾는다. 대중교통은 경유지를 받지 않는다.
  return Promise.all(
    points.slice(0, -1).map(async (a, i) => {
      const b = points[i + 1];
      const transit = await computeLegs([a, b], "TRANSIT");
      return transit ? toLeg(transit[0], a, b, "transit") : straightLeg(a, b);
    }),
  );
}

const cachedRoute = unstable_cache(buildRoute, ["day-route-v1"], { revalidate: CACHE_SECONDS });

// 한 일차의 장소들을 잇는 구간 목록. 구간 수는 장소 수 - 1이다.
export async function dayRoute(places: LatLng[]): Promise<RouteLeg[]> {
  if (places.length < 2) return [];
  // 캐시 키가 흔들리지 않게 좌표를 소수점 6자리로 맞춘다.
  const points = places.map((p) => ({ lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)) }));

  // 경유지 수 제한이 있어 장소가 많으면 끝점을 겹쳐 나눠 구한다.
  const legs: RouteLeg[] = [];
  for (let start = 0; start < points.length - 1; start += MAX_INTERMEDIATES + 1) {
    const chunk = points.slice(start, start + MAX_INTERMEDIATES + 2);
    try {
      legs.push(...(await cachedRoute(chunk)));
    } catch {
      legs.push(...chunk.slice(0, -1).map((a, i) => straightLeg(a, chunk[i + 1])));
    }
  }
  return legs;
}
