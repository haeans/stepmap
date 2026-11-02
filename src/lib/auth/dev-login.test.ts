import { describe, expect, it } from "vitest";
import { devCredentials, isDevLoginEnabled } from "./dev-login";

describe("isDevLoginEnabled", () => {
  it("개발 모드이면서 DEV_LOGIN=true일 때만 켜진다", () => {
    expect(isDevLoginEnabled({ NODE_ENV: "development", DEV_LOGIN: "true" })).toBe(true);
    expect(isDevLoginEnabled({ NODE_ENV: "production", DEV_LOGIN: "true" })).toBe(false);
    expect(isDevLoginEnabled({ NODE_ENV: "development", DEV_LOGIN: "false" })).toBe(false);
    expect(isDevLoginEnabled({ NODE_ENV: "development" })).toBe(false);
  });
});

describe("devCredentials", () => {
  const env = {
    DEV_OWNER_EMAIL: "owner@test",
    DEV_OWNER_PASSWORD: "a",
    DEV_VIEWER_EMAIL: "viewer@test",
  };

  it("역할에 맞는 계정을 돌려준다", () => {
    expect(devCredentials("owner", env)).toEqual({ email: "owner@test", password: "a" });
  });

  it("값이 빠져 있으면 null", () => {
    expect(devCredentials("viewer", env)).toBeNull();
  });
});
