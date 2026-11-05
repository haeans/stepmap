import { describe, expect, it } from "vitest";
import { mergeByTime } from "./merge-by-time";

type T = { name: string; time: string | null };
const show = (rows: ReturnType<typeof mergeByTime<T, T>>) => rows.map((r) => `${r.kind === "saved" ? "S" : "P"}:${r.value.name}`);
const t = (r: T) => r.time;

describe("mergeByTime", () => {
  it("저장된 일정과 미리보기를 시각순으로 섞는다(초가 붙은 시각도 같이 비교)", () => {
    const saved = [{ name: "오사카성", time: "12:00:00" }];
    const pending = [
      { name: "라멘", time: "19:00" },
      { name: "구로몬", time: "17:00" },
      { name: "카페", time: "10:00" },
    ];
    expect(show(mergeByTime(saved, pending, t, t))).toEqual(["P:카페", "S:오사카성", "P:구로몬", "P:라멘"]);
  });

  it("미리보기를 넣기로 저장해도 같은 자리에 남는다(앞 시각 미리보기는 그대로 위에)", () => {
    const before = mergeByTime([], [{ name: "카페", time: "10:00" }, { name: "구로몬", time: "17:00" }], t, t);
    const after = mergeByTime([{ name: "구로몬", time: "17:00:00" }], [{ name: "카페", time: "10:00" }], t, t);
    expect(show(before)).toEqual(["P:카페", "P:구로몬"]);
    expect(show(after)).toEqual(["P:카페", "S:구로몬"]);
  });

  it("시각이 같으면 저장된 일정이 앞, 시각이 없으면 맨 뒤", () => {
    const saved = [{ name: "A", time: "12:00:00" }, { name: "B", time: null }];
    const pending = [{ name: "c", time: null }, { name: "d", time: "12:00" }];
    expect(show(mergeByTime(saved, pending, t, t))).toEqual(["S:A", "P:d", "S:B", "P:c"]);
  });
});
