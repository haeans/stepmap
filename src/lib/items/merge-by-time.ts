// 하루 안에서 저장된 일정과 저장 전 미리보기(F28)를 시각순으로 한 줄에 섞는다. (fix-day-lodging)
// 미리보기를 "넣기"로 저장해도 같은 시각 자리에 남아, 카드가 다른 미리보기 위로 뛰어오르지 않는다.
// - 시각은 "HH:MM" 또는 "HH:MM:SS"이고 앞 다섯 글자로 비교한다. 시각이 없으면 맨 뒤다(compareItems와 같음).
// - 저장된 쪽은 이미 순서대로 와야 한다(daySchedule). 미리보기는 시각순으로 다시 놓는다(같으면 원래 순서).
// - 시각이 같으면 저장된 일정이 앞이다.

export type Merged<A, B> = { kind: "saved"; value: A } | { kind: "pending"; value: B };

const key = (time: string | null | undefined) => (time ? time.slice(0, 5) : "~");

export function mergeByTime<A, B>(
  saved: A[],
  pending: B[],
  savedTime: (a: A) => string | null | undefined,
  pendingTime: (b: B) => string | null | undefined,
): Merged<A, B>[] {
  const waiting = pending
    .map((value, index) => ({ value, index, k: key(pendingTime(value)) }))
    .sort((x, y) => (x.k === y.k ? x.index - y.index : x.k < y.k ? -1 : 1));
  const out: Merged<A, B>[] = [];
  let j = 0;
  for (const value of saved) {
    const k = key(savedTime(value));
    while (j < waiting.length && waiting[j].k < k) out.push({ kind: "pending", value: waiting[j++].value });
    out.push({ kind: "saved", value });
  }
  while (j < waiting.length) out.push({ kind: "pending", value: waiting[j++].value });
  return out;
}
