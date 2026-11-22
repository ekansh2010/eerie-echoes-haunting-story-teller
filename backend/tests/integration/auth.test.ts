import { describe, expect, it } from "vitest";
import { User } from "../../src/models";
import { testOutbox } from "../../src/services/email.service";
import { hashToken } from "../../src/utils/helpers";
import { api, auth, lastEmailToken, registerUser } from "../helpers";

describe("POST /api/auth/register", () => {
  it("creates a user, returns a token and a safe public user", async () => {
    const res = await api().post("/api/auth/register").send({ username: "Raven", email: "Raven@Void.test", password: "Spooky123" });
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ username: "Raven", email: "raven@void.test", role: "user", isVerified: false, avatar: "" });
    expect(res.body.user.id).toMatch(/^u_[a-f0-9]{24}$/);
    expect(res.body.user).not.toHaveProperty("passwordHash");
    expect(res.body.user).not.toHaveProperty("verificationToken");
    expect(res.body.user).not.toHaveProperty("_id");
  });

  it("hashes the password and stores only a hash of the verification token", async () => {
    await registerUser({ email: "hash@void.test" });
    const stored = await User.findOne({ email: "hash@void.test" }).lean();
    expect(stored!.passwordHash).toMatch(/^\$2[aby]\$/);
    const raw = lastEmailToken();
    expect(stored!.verificationToken).toBe(hashToken(raw));
    expect(stored!.verificationToken).not.toBe(raw);
  });

  it("sends a verification email with a frontend link", async () => {
    await registerUser({ email: "mail@void.test" });
    expect(testOutbox).toHaveLength(1);
    expect(testOutbox[0].to).toBe("mail@void.test");
    expect(testOutbox[0].link).toMatch(/^http:\/\/localhost:3000\/verify-email\?token=[a-f0-9]{64}$/);
  });

  it.each([
    [{ username: "ab", email: "a@b.co", password: "Spooky123" }, /at least 3/],
    [{ username: "valid", email: "not-an-email", password: "Spooky123" }, /Email must be valid/],
    [{ username: "valid", email: "a@b.co", password: "short1" }, /at least 8/],
    [{ username: "valid", email: "a@b.co", password: "allletters" }, /number/],
    [{ username: "valid", email: "a@b.co", password: "12345678" }, /letter/],
    [{ username: "bad name!", email: "a@b.co", password: "Spooky123" }, /may only contain/],
    [{}, /.+/],
  ])("rejects invalid payload %#", async (body, message) => {
    const res = await api().post("/api/auth/register").send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(message);
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it("rejects duplicate email case-insensitively (409)", async () => {
    await registerUser({ email: "dup@void.test" });
    const res = await api().post("/api/auth/register").send({ username: "other", email: "DUP@void.test", password: "Spooky123" });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Email is already registered");
  });

  it("rejects duplicate username case-insensitively (409)", async () => {
    await registerUser({ username: "Wraith" });
    const res = await api().post("/api/auth/register").send({ username: "wraith", email: "x@void.test", password: "Spooky123" });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Username is already taken");
  });

  it("treats regex metacharacters in input literally (no regex injection)", async () => {
    await registerUser({ email: "victim@void.test" });
    // Previously `new RegExp("^" + email + "$")` let ".*" match any address.
    const res = await api().post("/api/auth/login").send({ email: ".*@void.test", password: "Spooky123" });
    expect(res.status).toBe(400); // fails email validation, never reaches a regex
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials (email case-insensitive)", async () => {
    const u = await registerUser({ email: "login@void.test" });
    const res = await api().post("/api/auth/login").send({ email: "LOGIN@void.test", password: u.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.id).toBe(u.user.id);
  });

  it("returns the same 401 for wrong password and unknown email", async () => {
    const u = await registerUser({ email: "who@void.test" });
    const wrong = await api().post("/api/auth/login").send({ email: "who@void.test", password: "Wrong1234" });
    const unknown = await api().post("/api/auth/login").send({ email: "nobody@void.test", password: u.password });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it("finds legacy users stored with mixed-case emails", async () => {
    const u = await registerUser({ email: "legacy@void.test" });
    await User.collection.updateOne({ id: u.user.id }, { $set: { email: "Legacy@Void.test" } });
    const res = await api().post("/api/auth/login").send({ email: "legacy@void.test", password: u.password });
    expect(res.status).toBe(200);
  });
});

describe("GET /api/auth/me and token handling", () => {
  it("returns the current user", async () => {
    const u = await registerUser();
    const res = await api().get("/api/auth/me").set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual(u.user);
  });

  it.each([
    ["missing", undefined],
    ["garbage", "Bearer not.a.jwt"],
    ["wrong scheme", "Basic abc"],
  ])("rejects %s token with 401", async (_label, header) => {
    const req = api().get("/api/auth/me");
    if (header) req.set("Authorization", header);
    const res = await req;
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it("rejects tokens for users that no longer exist (e.g. banned)", async () => {
    const u = await registerUser();
    await User.deleteOne({ id: u.user.id });
    const res = await api().get("/api/auth/me").set(auth(u.token));
    expect(res.status).toBe(401);
  });

  it("rejects a token signed with another secret", async () => {
    const jwt = await import("jsonwebtoken");
    const u = await registerUser();
    const forged = jwt.default.sign({ id: u.user.id, role: "admin" }, "attacker-secret");
    const res = await api().get("/api/auth/me").set(auth(forged));
    expect(res.status).toBe(401);
  });

  it("takes role from the database, not from the token", async () => {
    const u = await registerUser();
    const asUser = await api().get("/api/admin/stats").set(auth(u.token));
    expect(asUser.status).toBe(403);
    await User.updateOne({ id: u.user.id }, { role: "admin" });
    const asAdmin = await api().get("/api/admin/stats").set(auth(u.token));
    expect(asAdmin.status).toBe(200);
  });
});

describe("email verification", () => {
  it("verifies with the emailed token exactly once", async () => {
    const u = await registerUser();
    const token = lastEmailToken();

    const ok = await api().post("/api/auth/verify-token").send({ token });
    expect(ok.status).toBe(200);
    expect(ok.body.user).toMatchObject({ id: u.user.id, isVerified: true });

    const me = await api().get("/api/auth/me").set(auth(u.token));
    expect(me.body.isVerified).toBe(true);

    const again = await api().post("/api/auth/verify-token").send({ token });
    expect(again.status).toBe(400);
  });

  it("rejects expired verification tokens", async () => {
    const u = await registerUser();
    const token = lastEmailToken();
    await User.updateOne({ id: u.user.id }, { verificationExpires: new Date(Date.now() - 1000) });
    const res = await api().post("/api/auth/verify-token").send({ token });
    expect(res.status).toBe(400);
  });

  it("rejects malformed tokens", async () => {
    const res = await api().post("/api/auth/verify-token").send({ token: "abc" });
    expect(res.status).toBe(400);
  });

  it("POST /verify re-sends the email and does NOT self-verify", async () => {
    const u = await registerUser();
    testOutbox.length = 0;
    const res = await api().post("/api/auth/verify").set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.isVerified).toBe(false);
    expect(testOutbox).toHaveLength(1);
    const stored = await User.findOne({ id: u.user.id }).lean();
    expect(stored!.isVerified).toBe(false);

    // The newest link works.
    const verify = await api().post("/api/auth/verify-token").send({ token: lastEmailToken() });
    expect(verify.status).toBe(200);
    const already = await api().post("/api/auth/verify").set(auth(u.token));
    expect(already.body.isVerified).toBe(true);
  });

  it("POST /verify requires auth", async () => {
    expect((await api().post("/api/auth/verify")).status).toBe(401);
  });
});

describe("password reset", () => {
  it("responds identically for known and unknown emails (no enumeration)", async () => {
    await registerUser({ email: "known@void.test" });
    testOutbox.length = 0;
    const known = await api().post("/api/auth/forgot-password").send({ email: "known@void.test" });
    const unknown = await api().post("/api/auth/forgot-password").send({ email: "unknown@void.test" });
    expect(known.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
    expect(testOutbox).toHaveLength(1);
    expect(testOutbox[0].link).toContain("/reset-password?token=");
  });

  it("legacy /reset-password only sends a link and ignores newPassword", async () => {
    const u = await registerUser({ email: "legacy-reset@void.test" });
    const res = await api().post("/api/auth/reset-password").send({ email: "legacy-reset@void.test", newPassword: "Hijack123" });
    expect(res.status).toBe(200);
    const hijack = await api().post("/api/auth/login").send({ email: "legacy-reset@void.test", password: "Hijack123" });
    expect(hijack.status).toBe(401);
    const original = await api().post("/api/auth/login").send({ email: "legacy-reset@void.test", password: u.password });
    expect(original.status).toBe(200);
  });

  it("resets with a valid token, revokes old sessions, and the token is single-use", async () => {
    const u = await registerUser({ email: "reset@void.test" });
    await api().post("/api/auth/forgot-password").send({ email: "reset@void.test" });
    const token = lastEmailToken();

    const res = await api().post("/api/auth/reset-password-confirm").send({ token, newPassword: "NewSpooky456" });
    expect(res.status).toBe(200);

    expect((await api().get("/api/auth/me").set(auth(u.token))).status).toBe(401);
    expect((await api().post("/api/auth/login").send({ email: "reset@void.test", password: u.password })).status).toBe(401);
    const login = await api().post("/api/auth/login").send({ email: "reset@void.test", password: "NewSpooky456" });
    expect(login.status).toBe(200);
    expect((await api().get("/api/auth/me").set(auth(login.body.token))).status).toBe(200);

    const reuse = await api().post("/api/auth/reset-password-confirm").send({ token, newPassword: "Another789" });
    expect(reuse.status).toBe(400);
  });

  it("rejects expired reset tokens and weak new passwords", async () => {
    const u = await registerUser({ email: "exp@void.test" });
    await api().post("/api/auth/forgot-password").send({ email: "exp@void.test" });
    const token = lastEmailToken();

    const weak = await api().post("/api/auth/reset-password-confirm").send({ token, newPassword: "weak" });
    expect(weak.status).toBe(400);

    await User.updateOne({ id: u.user.id }, { resetPasswordExpires: new Date(Date.now() - 1000) });
    const expired = await api().post("/api/auth/reset-password-confirm").send({ token, newPassword: "Valid1234" });
    expect(expired.status).toBe(400);
    expect(expired.body.error).toMatch(/invalid or has expired/);
  });
});

describe("PATCH /api/auth/avatar", () => {
  it("updates the avatar and returns the full user", async () => {
    const u = await registerUser();
    const res = await api().patch("/api/auth/avatar").set(auth(u.token)).send({ avatar: "/api/uploads/img_abc" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...u.user, avatar: "/api/uploads/img_abc" });
  });

  it.each(["", "javascript:alert(1)", "data:text/html;base64,AAAA", "ftp://x/y.png"])("rejects unsafe/empty avatar %j", async (avatar) => {
    const u = await registerUser();
    const res = await api().patch("/api/auth/avatar").set(auth(u.token)).send({ avatar });
    expect(res.status).toBe(400);
  });

  it("requires auth", async () => {
    expect((await api().patch("/api/auth/avatar").send({ avatar: "https://x.y/a.png" })).status).toBe(401);
  });
});
