// 매거진 탭(F10)의 배경색. 대표 사진의 평균색을 어둡게 눌러 페이지 배경으로 쓴다.
// 대표 이미지(F08)가 없으면 목적지 글자로 색상(hue)을 정해 임시 그림과 배경색을 함께 만든다.

export type Rgb = { r: number; g: number; b: number };

// RGBA 픽셀 배열의 평균색. 거의 투명한 픽셀은 뺀다. 쓸 픽셀이 없으면 null.
export function averageColor(data: ArrayLike<number>): Rgb | null {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n += 1;
  }
  if (n === 0) return null;
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

// 사진 색을 검정 쪽으로 섞어 흰 글씨가 읽히는 배경색으로 만든다. amount: 남길 사진 색의 비율
export function toneBackground({ r, g, b }: Rgb, amount = 0.35): string {
  const mix = (v: number) => Math.round(v * amount + 12 * (1 - amount));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

// 글자에서 0~359 색상을 고른다. 같은 목적지는 늘 같은 색이 나온다.
export function hueFromText(text: string): number {
  let hash = 0;
  for (const ch of text) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
  return hash % 360;
}

// 임시 대표 그림의 배경색 (placeholderCover와 같은 색상)
export function hueBackground(hue: number): string {
  return `hsl(${hue}, 28%, 11%)`;
}

// 대표 이미지가 없을 때 쓰는 임시 그림: 하늘 → 산 능선 그라데이션 SVG
export function placeholderCover(hue: number): string {
  const sky = `hsl(${(hue + 30) % 360}, 55%, 62%)`;
  const glow = `hsl(${(hue + 50) % 360}, 70%, 78%)`;
  const far = `hsl(${hue}, 30%, 38%)`;
  const near = `hsl(${hue}, 32%, 20%)`;
  const ground = hueBackground(hue);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="0.6" stop-color="${glow}"/></linearGradient></defs>
<rect width="1600" height="900" fill="url(#s)"/>
<path d="M0 560 L220 430 L420 520 L640 380 L880 500 L1100 400 L1340 490 L1600 420 L1600 900 L0 900 Z" fill="${far}"/>
<path d="M0 680 L260 590 L520 660 L780 570 L1040 650 L1300 590 L1600 660 L1600 900 L0 900 Z" fill="${near}"/>
<rect y="820" width="1600" height="80" fill="${ground}"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
