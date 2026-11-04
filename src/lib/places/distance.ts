// 두 좌표 사이 거리(미터). 새로 찾은 장소가 저장된 장소와 같은지 볼 때 쓴다(C8 F22).

// 저장된 좌표와 새로 찾은 장소가 이만큼 넘게 떨어져 있으면 다른 장소로 본다. 큰 관광지(성·공원)도 들어오게 넉넉히.
export const SAME_PLACE_METERS = 1000;

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}
