import { describe, expect, it } from "vitest";
import { passwordRule, registerSchema, tokenSchema } from "../../src/validation/auth.validation";
import { idParam, imageUrl } from "../../src/validation/common";
import { createStorySchema, listStoriesQuery, MAX_PAGE_SIZE } from "../../src/validation/stories.validation";

describe("imageUrl", () => {
  it.each(["https://example.com/a.png", "http://cdn.test/x.jpg?w=1", "/api/uploads/img_abc", "/images/Midnight.png", "", "  https://trim.me/x  "])(
    "accepts %j",
    (v) => {
      expect(imageUrl.safeParse(v).success).toBe(true);
    },
  );

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:image/png;base64,AAAA",
    "//evil.com/x.png",
    "relative/path.png",
    "images/x.png",
    "/etc/passwd",
    "/api/other/x",
    "ftp://host/x",
    "https://has space.com/x",
    "https://" + "a".repeat(2050),
  ])("rejects %j", (v) => {
    expect(imageUrl.safeParse(v).success).toBe(false);
  });
});

describe("listStoriesQuery", () => {
  it("applies defaults", () => {
    expect(listStoriesQuery.parse({})).toEqual({ page: 1, limit: 6 });
  });

  it("coerces numeric strings", () => {
    expect(listStoriesQuery.parse({ page: "3", limit: "10" })).toMatchObject({ page: 3, limit: 10 });
  });

  it("accepts limit=all", () => {
    expect(listStoriesQuery.parse({ limit: "all" }).limit).toBe("all");
  });

  it("trims category and search", () => {
    expect(listStoriesQuery.parse({ category: " Paranormal ", search: " boo " })).toMatchObject({ category: "Paranormal", search: "boo" });
  });

  it.each([{ page: "0" }, { page: "-1" }, { page: "1.5" }, { page: "abc" }, { limit: "0" }, { limit: String(MAX_PAGE_SIZE + 1) }, { limit: "none" }, { search: "x".repeat(101) }])(
    "rejects %j",
    (q) => {
      expect(listStoriesQuery.safeParse(q).success).toBe(false);
    },
  );
});

describe("passwordRule", () => {
  it.each(["Spooky123", "a1234567", "longpassword9"])("accepts %j", (p) => {
    expect(passwordRule.safeParse(p).success).toBe(true);
  });
  it.each(["short1", "allletters", "12345678", "a1".repeat(65)])("rejects %j", (p) => {
    expect(passwordRule.safeParse(p).success).toBe(false);
  });
});

describe("other schemas", () => {
  it("registerSchema lowercases + trims email", () => {
    const r = registerSchema.parse({ username: " Raven ", email: " RAVEN@Void.Test ", password: "Spooky123" });
    expect(r).toEqual({ username: "Raven", email: "raven@void.test", password: "Spooky123" });
  });

  it("tokenSchema only accepts 64 hex chars", () => {
    expect(tokenSchema.safeParse({ token: "a".repeat(64) }).success).toBe(true);
    expect(tokenSchema.safeParse({ token: "a".repeat(63) }).success).toBe(false);
    expect(tokenSchema.safeParse({ token: { $ne: "" } }).success).toBe(false);
  });

  it("createStorySchema enforces category enum and image url", () => {
    expect(createStorySchema.safeParse({ title: "t", content: "c", category: "Paranormal" }).success).toBe(true);
    expect(createStorySchema.safeParse({ title: "t", content: "c", category: "Comedy" }).success).toBe(false);
    expect(createStorySchema.safeParse({ title: "t", content: "c", category: "Paranormal", coverImage: "javascript:alert(1)" }).success).toBe(false);
    expect(createStorySchema.safeParse({ title: "   ", content: "c", category: "Paranormal" }).success).toBe(false);
  });

  it("idParam rejects empty and overly long ids", () => {
    expect(idParam.safeParse({ id: "abc" }).success).toBe(true);
    expect(idParam.safeParse({ id: "" }).success).toBe(false);
    expect(idParam.safeParse({ id: "x".repeat(101) }).success).toBe(false);
  });
});
