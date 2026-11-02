// 매거진 DAY 제목 아래에 보여 줄 "그날의 지역" (F10). 장소 주소에서 동네 이름만 뽑는다.
// 예: "홍콩 성완 할리우드로드 124" → "성완". 목적지(나라·도시)와 번지·우편번호 같은 숫자 조각은 뺀다.

// 주소 앞에 자주 붙는 나라·광역 단위. 이것만으로는 지역이 아니다.
const SKIP = new Set(["대한민국", "한국", "일본", "중국", "홍콩", "대만", "타이완", "마카오", "태국", "베트남", "싱가포르", "필리핀", "미국", "영국", "프랑스"]);

export function areaOf(address: string, destination = ""): string | null {
  const dest = destination.trim();
  const parts = address
    .split(/[,，、\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    if (/\d/.test(part)) continue; // 번지·우편번호·층
    if (SKIP.has(part)) continue;
    if (dest && (part === dest || dest.includes(part) || part.includes(dest))) continue;
    return part;
  }
  return null;
}

// 그날 장소들의 지역을 나온 순서대로 중복 없이. max개를 넘으면 more에 남은 수.
export function dayAreas(addresses: string[], destination = "", max = 3): { areas: string[]; more: number } {
  const seen: string[] = [];
  for (const address of addresses) {
    const area = areaOf(address, destination);
    if (area && !seen.includes(area)) seen.push(area);
  }
  return { areas: seen.slice(0, max), more: Math.max(0, seen.length - max) };
}
