import { describe, expect, it } from "vitest";
import { loadEnv } from "../../src/config/env";

const STRONG = "a-strong-unique-production-secret-0123456789";

describe("loadEnv", () => {
  it("applies defaults for development", () => {
    const env = loadEnv({ NODE_ENV: "development" });
    expect(env).toMatchObject({ NODE_ENV: "development", PORT: 5000, JWT_EXPIRES_IN: "7d", TRUST_PROXY: 1, ADMIN_USERNAME: "DarkScribe" });
  });

  it("throws in production without MONGODB_URI", () => {
    expect(() => loadEnv({ NODE_ENV: "production", JWT_SECRET: STRONG })).toThrow(/MONGODB_URI/);
  });

  it("throws in production without JWT_SECRET", () => {
    expect(() => loadEnv({ NODE_ENV: "production", MONGODB_URI: "mongodb://db/x" })).toThrow(/JWT_SECRET/);
  });

  it.each(["haunting_eerie_echoes_secret_key_666", "dev-only-insecure-jwt-secret-change-me"])(
    "throws in production with known-weak JWT_SECRET %j",
    (secret) => {
      expect(() => loadEnv({ NODE_ENV: "production", MONGODB_URI: "mongodb://db/x", JWT_SECRET: secret })).toThrow(/JWT_SECRET/);
    },
  );

  it("passes in production with proper values", () => {
    const env = loadEnv({ NODE_ENV: "production", MONGODB_URI: "mongodb://db/x", JWT_SECRET: STRONG, PORT: "8080" });
    expect(env).toMatchObject({ NODE_ENV: "production", MONGODB_URI: "mongodb://db/x", JWT_SECRET: STRONG, PORT: 8080 });
  });

  it.each(["abc", "-1", "0", "1.5"])("throws for invalid PORT %j", (port) => {
    expect(() => loadEnv({ NODE_ENV: "development", PORT: port })).toThrow(/Invalid environment configuration.*PORT/);
  });

  it("throws for an invalid NODE_ENV", () => {
    expect(() => loadEnv({ NODE_ENV: "staging" })).toThrow(/NODE_ENV/);
  });

  it("throws for an invalid ADMIN_EMAIL or short ADMIN_PASSWORD", () => {
    expect(() => loadEnv({ NODE_ENV: "development", ADMIN_EMAIL: "nope" })).toThrow(/ADMIN_EMAIL/);
    expect(() => loadEnv({ NODE_ENV: "development", ADMIN_PASSWORD: "short" })).toThrow(/ADMIN_PASSWORD/);
  });

  it.each([
    ["false", false],
    ["0", false],
    ["no", false],
    ["off", false],
    ["true", true],
    ["1", true],
    ["YES", true],
    ["on", true],
  ])("parses boolean %j as %s", (raw, expected) => {
    const env = loadEnv({ NODE_ENV: "development", SEED_DEMO_DATA: raw, RATE_LIMIT_ENABLED: raw });
    expect(env.SEED_DEMO_DATA).toBe(expected);
    expect(env.RATE_LIMIT_ENABLED).toBe(expected);
  });

  it("uses boolean fallbacks for empty strings", () => {
    const env = loadEnv({ NODE_ENV: "development", SEED_DEMO_DATA: "", RATE_LIMIT_ENABLED: "" });
    expect(typeof env.SEED_DEMO_DATA).toBe("boolean");
    expect(typeof env.RATE_LIMIT_ENABLED).toBe("boolean");
  });
});
