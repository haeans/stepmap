// 여행 입력값 검사. DB의 CHECK 제약(src/db/schema.ts)과 같은 규칙을 화면에서 먼저 확인한다.

export type TripInput = {
  title: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  companions: number;
};

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function parseTitle(raw: string): ParseResult<string> {
  const title = raw.trim();
  if (title.length === 0) return { ok: false, error: "여행 이름을 입력해 주세요." };
  if (title.length > 100) return { ok: false, error: "여행 이름은 100자까지 쓸 수 있습니다." };
  return { ok: true, value: title };
}

export function parseTripForm(form: FormData): ParseResult<TripInput> {
  const title = parseTitle(text(form, "title"));
  if (!title.ok) return title;

  const destination = text(form, "destination");
  if (destination.length > 100) return { ok: false, error: "목적지는 100자까지 쓸 수 있습니다." };

  const startDate = text(form, "startDate") || null;
  const endDate = text(form, "endDate") || null;
  if ((startDate && !DATE_RE.test(startDate)) || (endDate && !DATE_RE.test(endDate))) {
    return { ok: false, error: "날짜 형식이 올바르지 않습니다." };
  }
  if (startDate && endDate && endDate < startDate) {
    return { ok: false, error: "끝나는 날은 시작하는 날보다 앞설 수 없습니다." };
  }

  const companionsRaw = text(form, "companions") || "1";
  const companions = Number(companionsRaw);
  if (!Number.isInteger(companions) || companions < 1 || companions > 99) {
    return { ok: false, error: "동행 인원은 1명부터 99명까지입니다." };
  }

  return { ok: true, value: { title: title.value, destination, startDate, endDate, companions } };
}
