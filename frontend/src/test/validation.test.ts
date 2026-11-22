import { describe, it, expect } from "vitest";
import { validateEmail, validatePassword } from "@/lib/validation";

describe("validatePassword", () => {
  it("accepts passwords with 8+ chars, a letter and a digit", () => {
    expect(validatePassword("abcdefg1")).toBe(true);
    expect(validatePassword("Spooky123!")).toBe(true);
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(validatePassword("abc1234")).toBe(false);
    expect(validatePassword("")).toBe(false);
  });

  it("rejects passwords without a digit", () => {
    expect(validatePassword("abcdefgh")).toBe(false);
  });

  it("rejects passwords without a letter", () => {
    expect(validatePassword("12345678")).toBe(false);
  });
});

describe("validateEmail", () => {
  it("accepts a normal address", () => {
    expect(validateEmail("ghost@haunt.io")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(validateEmail("ghost")).toBe(false);
    expect(validateEmail("ghost@haunt")).toBe(false);
    expect(validateEmail("gh ost@haunt.io")).toBe(false);
  });
});
