import { describe, expect, it } from "vitest";
import { seedDatabase } from "../../src/database/seed";
import { api } from "../helpers";

// Note: rate limiting is not tested here. The limiters in
// src/middleware/rateLimit.middleware.ts are built once at import time from
// env.RATE_LIMIT_ENABLED (false under vitest), so they cannot be toggled per test.

describe("health checks", () => {
  it.each(["/health", "/api/health"])("GET %s reports the DB as connected", async (path) => {
    const res = await api().get(path);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ db: "connected", status: expect.any(String) });
    expect(new Date(res.body.time).toString()).not.toBe("Invalid Date");
  });
});

describe("error handling", () => {
  it("returns JSON 404 for unknown /api routes", async () => {
    const res = await api().get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: expect.stringContaining("/api/does-not-exist") });
  });

  it("returns JSON 404 for unknown methods on known paths", async () => {
    const res = await api().put("/api/auth/login").send({});
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await api().post("/api/auth/login").set("Content-Type", "application/json").send('{"email": "x",');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Malformed JSON body" });
  });

  it("returns 413 for bodies over 200kb", async () => {
    const res = await api()
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ email: "a@b.co", password: "x".repeat(210 * 1024) }));
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: "Request body too large" });
  });
});

describe("security headers", () => {
  it("sets helmet headers and hides x-powered-by", async () => {
    const res = await api().get("/api/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeDefined();
    expect(res.headers["strict-transport-security"]).toBeDefined();
    expect(res.headers["x-powered-by"]).toBeUndefined();
    // CSP intentionally disabled at app level (left to hosting layer).
    expect(res.headers["content-security-policy"]).toBeUndefined();
    expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
  });
});

describe("CORS", () => {
  it("reflects the request origin outside production when CORS_ORIGIN is unset", async () => {
    const res = await api().get("/api/health").set("Origin", "http://example.test");
    expect(res.headers["access-control-allow-origin"]).toBe("http://example.test");
  });

  it("answers preflight requests", async () => {
    const res = await api()
      .options("/api/stories")
      .set("Origin", "http://example.test")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "authorization,content-type");
    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("http://example.test");
    expect(res.headers["access-control-allow-methods"]).toMatch(/POST/);
  });
});

describe("GET /api/audio-tracks", () => {
  it("returns an empty array when nothing is seeded", async () => {
    const res = await api().get("/api/audio-tracks");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns seeded tracks sorted by id without Mongo internals", async () => {
    await seedDatabase();
    const res = await api().get("/api/audio-tracks");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toMatch(/max-age=300/);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
    expect(res.body.map((t: { id: string }) => t.id)).toEqual(["t1", "t2", "t3"]);
    for (const t of res.body) {
      expect(t).not.toHaveProperty("_id");
      expect(t).not.toHaveProperty("__v");
      expect(t).toMatchObject({ id: expect.any(String), title: expect.any(String), url: expect.stringMatching(/^\/audio\//) });
    }
  });
});
