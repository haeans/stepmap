import { describe, expect, it } from "vitest";
import { areaOf, dayAreas } from "./areas";

describe("areaOf", () => {
  it("짧은 주소는 그대로", () => {
    expect(areaOf("성완", "홍콩")).toBe("성완");
  });

  it("나라·목적지·숫자 조각을 건너뛰고 동네 이름을 고른다", () => {
    expect(areaOf("홍콩 성완 할리우드로드 124-126", "홍콩")).toBe("성완");
    expect(areaOf("일본 교토부 교토시 히가시야마구 기요미즈 1-294", "교토")).toBe("히가시야마구");
    expect(areaOf("대한민국 서울특별시 종로구 사직로 161", "서울")).toBe("종로구");
  });

  it("뽑을 것이 없으면 null", () => {
    expect(areaOf("", "홍콩")).toBeNull();
    expect(areaOf("홍콩 123", "홍콩")).toBeNull();
  });
});

describe("dayAreas", () => {
  it("나온 순서대로 중복 없이, 넘치면 more", () => {
    expect(dayAreas(["성완", "침사추이", "성완", "야우마테이"], "홍콩")).toEqual({ areas: ["성완", "침사추이", "야우마테이"], more: 0 });
    expect(dayAreas(["a", "b", "c", "d", "e"], "", 3)).toEqual({ areas: ["a", "b", "c"], more: 2 });
  });
});
