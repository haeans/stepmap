import { describe, expect, it } from "vitest";
import { areaQueries, pickAreaName } from "./destination";

describe("areaQueries", () => {
  it("한 낱말이면 그대로, 여러 낱말이면 전체 다음 첫 낱말", () => {
    expect(areaQueries(" 교토 ")).toEqual(["교토"]);
    expect(areaQueries("일본  교토 오사카")).toEqual(["일본 교토 오사카", "일본"]);
    expect(areaQueries("  ")).toEqual([]);
  });
});

describe("pickAreaName", () => {
  it("나라·도시 같은 지역이면 그 이름", () => {
    expect(pickAreaName({ places: [{ displayName: { text: "Kyoto" }, types: ["locality", "political"] }] })).toBe("Kyoto");
    expect(pickAreaName({ places: [{ displayName: { text: "Japan" }, types: ["country", "political"] }] })).toBe("Japan");
  });

  it("가게·주소 같은 지역이 아닌 결과는 null", () => {
    expect(pickAreaName({ places: [{ displayName: { text: "123 Cafe" }, types: ["cafe", "food", "establishment"] }] })).toBeNull();
    expect(pickAreaName({ places: [{ displayName: { text: "123 Main St" }, types: ["street_address"] }] })).toBeNull();
  });

  it("결과가 없거나 이름이 비면 null", () => {
    expect(pickAreaName({})).toBeNull();
    expect(pickAreaName({ places: [] })).toBeNull();
    expect(pickAreaName({ places: [{ displayName: { text: " " }, types: ["political"] }] })).toBeNull();
  });
});
