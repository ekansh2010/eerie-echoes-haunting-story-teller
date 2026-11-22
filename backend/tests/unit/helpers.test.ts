import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { escapeRegex, generateId, generateToken, hashToken, nowTimestamp, today } from "../../src/utils/helpers";

describe("escapeRegex", () => {
  it.each([".*+?^${}()|[]\\", "a.b", "(boo)", "[x]", "c++", "$100", "a|b", "^start", "end$", "back\\slash", "{2,3}", "plain"])(
    "makes %j match itself literally",
    (s) => {
      const re = new RegExp(`^${escapeRegex(s)}$`);
      expect(re.test(s)).toBe(true);
    },
  );

  it("does not treat metacharacters as wildcards", () => {
    expect(new RegExp(escapeRegex("a.c")).test("abc")).toBe(false);
    expect(new RegExp(escapeRegex(".*")).test("anything")).toBe(false);
    expect(new RegExp(`^${escapeRegex("a|b")}$`).test("a")).toBe(false);
  });
});

describe("generateId", () => {
  it("uses the prefix and 24 hex chars", () => {
    expect(generateId("s")).toMatch(/^s_[a-f0-9]{24}$/);
    expect(generateId("img")).toMatch(/^img_[a-f0-9]{24}$/);
  });

  it("is unique", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateId("x")));
    expect(ids.size).toBe(1000);
  });
});

describe("generateToken / hashToken", () => {
  it("generates 64-hex-char tokens", () => {
    expect(generateToken()).toMatch(/^[a-f0-9]{64}$/);
    expect(generateToken()).not.toBe(generateToken());
  });

  it("hashToken is deterministic sha256 hex", () => {
    expect(hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
    const t = generateToken();
    expect(hashToken(t)).toBe(crypto.createHash("sha256").update(t).digest("hex"));
  });
});

describe("date helpers", () => {
  it("today() is YYYY-MM-DD (UTC)", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(today()).toBe(new Date().toISOString().slice(0, 10));
  });

  it("nowTimestamp() is YYYY-MM-DD HH:MM:SS", () => {
    expect(nowTimestamp()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});
