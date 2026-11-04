import { describe, expect, it } from "vitest";
import { MAX_CHANGES, changedFields, normalizeChanges, type ChangeTarget, type RawChange } from "./proposal";

const targets: ChangeTarget[] = [
  { id: "a", kind: "sight", day: 2, time: "14:00:00", name: "오사카성", address: "오사카시 주오구", memo: "" },
  { id: "b", kind: "food", day: 2, time: "18:30:00", name: "이치란 라멘", address: "", memo: "줄 김" },
  { id: "c", kind: "memo", day: 1, time: null, name: "환전", address: "", memo: "" },
  { id: "d", kind: "lodging", day: 1, time: "15:00:00", name: "난바 호텔", address: "", memo: "" },
];
const ctx = { dayCount: 4, targets };
const none = { day: null, time: null, name: null, address: null, memo: null };

describe("normalizeChanges", () => {
  it("#번호를 실제 일정으로 바꾸고 바꾼 칸만 바꾼다", () => {
    const { changes } = normalizeChanges([{ ref: "#2", action: "update", ...none, time: "19:00" }], ctx);
    expect(changes).toHaveLength(1);
    expect(changes[0].id).toBe("b");
    expect(changes[0].before).toEqual({ day: 2, time: "18:30", name: "이치란 라멘", address: "", memo: "줄 김" });
    expect(changes[0].after).toEqual({ day: 2, time: "19:00", name: "이치란 라멘", address: "", memo: "줄 김" });
    expect(changedFields(changes[0])).toEqual(["time"]);
  });

  it("지우기는 after가 없다", () => {
    const { changes } = normalizeChanges([{ ref: "1", action: "delete", ...none }], ctx);
    expect(changes[0]).toMatchObject({ id: "a", action: "delete", after: null });
  });

  it("없는 번호와 쪽지(메모)는 빼고 알린다", () => {
    const { changes, notes } = normalizeChanges(
      [
        { ref: "#9", action: "delete", ...none },
        { ref: "#3", action: "delete", ...none },
      ],
      ctx,
    );
    expect(changes).toEqual([]);
    expect(notes[0]).toContain("2건");
  });

  it("바뀐 칸이 없으면 뺀다", () => {
    const { changes } = normalizeChanges([{ ref: "#1", action: "update", ...none, time: "14:00", name: "오사카성" }], ctx);
    expect(changes).toEqual([]);
  });

  it("같은 일정을 두 번 가리키면 앞의 것만 둔다", () => {
    const raw: RawChange[] = [
      { ref: "#1", action: "update", ...none, time: "10:00" },
      { ref: "#1", action: "delete", ...none },
    ];
    const { changes } = normalizeChanges(raw, ctx);
    expect(changes).toHaveLength(1);
    expect(changes[0].action).toBe("update");
  });

  it("일차는 여행 일수 안으로 맞춘다", () => {
    const { changes } = normalizeChanges([{ ref: "#1", action: "update", ...none, day: 9 }], ctx);
    expect(changes[0].after?.day).toBe(4);
  });

  it("옮긴 시각이 다른 일정과 겹치면 옮기지 않고 알린다", () => {
    const { changes, notes } = normalizeChanges([{ ref: "#2", action: "update", ...none, time: "14:30" }], ctx);
    expect(changes[0].after?.time).toBe("14:30");
    expect(notes[0]).toContain("오사카성");
  });

  it("숙소는 시간을 차지하지 않는다", () => {
    const { notes } = normalizeChanges([{ ref: "#1", action: "update", ...none, day: 1, time: "15:00" }], ctx);
    expect(notes).toEqual([]);
  });

  it(`한 번에 ${MAX_CHANGES}건까지`, () => {
    const many: ChangeTarget[] = Array.from({ length: 12 }, (_, i) => ({ ...targets[0], id: `x${i}`, name: `곳${i}` }));
    const raw: RawChange[] = many.map((_, i) => ({ ref: `#${i + 1}`, action: "delete", ...none }));
    const { changes, notes } = normalizeChanges(raw, { dayCount: 4, targets: many });
    expect(changes).toHaveLength(MAX_CHANGES);
    expect(notes.at(-1)).toContain(`${MAX_CHANGES}건`);
  });
});
