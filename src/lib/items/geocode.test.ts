import { describe, expect, it } from "vitest";
import { geocodeQuery, geocodeTarget, isAreaResult, needsGeocode } from "./geocode";

const base = { kind: "sight" as const, name: "빅토리아 피크", address: "", lat: 22.27, lng: 114.14 };

describe("needsGeocode", () => {
  it("새 장소 항목은 찾는다", () => {
    expect(needsGeocode(null, base)).toBe(true);
  });

  it("교통·메모는 찾지 않는다", () => {
    expect(needsGeocode(null, { ...base, kind: "transport" })).toBe(false);
    expect(needsGeocode(null, { ...base, kind: "memo" })).toBe(false);
  });

  it("이름·주소·종류가 같고 좌표가 있으면 다시 찾지 않는다", () => {
    expect(needsGeocode(base, base)).toBe(false);
  });

  it("이름이나 주소가 바뀌었거나 좌표가 없으면 다시 찾는다", () => {
    expect(needsGeocode(base, { ...base, name: "피크 트램" })).toBe(true);
    expect(needsGeocode(base, { ...base, address: "The Peak" })).toBe(true);
    expect(needsGeocode({ ...base, lat: null, lng: null }, base)).toBe(true);
    expect(needsGeocode({ ...base, kind: "memo" }, base)).toBe(true);
  });
});

describe("geocodeTarget", () => {
  it("새 항목: 주소가 있으면 주소, 없으면 이름", () => {
    expect(geocodeTarget(null, { ...base, address: "128 Peak Rd" })).toEqual({ by: "address", text: "128 Peak Rd" });
    expect(geocodeTarget(null, base)).toEqual({ by: "name", text: "빅토리아 피크" });
  });

  it("이름만 고치면 지난번 주소를 버리고 새 이름으로 찾는다", () => {
    const prev = { ...base, name: "티안탄", address: "Aberdeen, Hong Kong Island, 홍콩" };
    const next = { ...base, name: "티안 탄 부처상", address: "Aberdeen, Hong Kong Island, 홍콩" };
    expect(geocodeTarget(prev, next)).toEqual({ by: "name", text: "티안 탄 부처상" });
  });

  it("주소를 고쳤으면 그 주소로 찾는다", () => {
    const prev = { ...base, address: "옛 주소" };
    expect(geocodeTarget(prev, { ...base, address: "새 주소" })).toEqual({ by: "address", text: "새 주소" });
  });

  it("그 주소로 아직 못 찾았으면 주소로 다시 찾는다", () => {
    const prev = { ...base, address: "128 Peak Rd", lat: null, lng: null };
    expect(geocodeTarget(prev, { ...base, address: "128 Peak Rd" })).toEqual({ by: "address", text: "128 Peak Rd" });
  });
});

describe("geocodeQuery", () => {
  it("검색어에 목적지를 붙인다", () => {
    expect(geocodeQuery("빅토리아 피크", "홍콩")).toBe("빅토리아 피크 홍콩");
    expect(geocodeQuery("빅토리아 피크", "")).toBe("빅토리아 피크");
  });
});

describe("isAreaResult", () => {
  it("나라·동네 같은 지역 결과는 버린다", () => {
    expect(isAreaResult(["neighborhood", "political"])).toBe(true);
    expect(isAreaResult(["country", "political"])).toBe(true);
    expect(isAreaResult(["monument", "tourist_attraction", "point_of_interest"])).toBe(false);
    expect(isAreaResult(undefined)).toBe(false);
  });
});
