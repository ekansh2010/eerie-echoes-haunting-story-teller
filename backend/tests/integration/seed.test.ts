import { describe, expect, it } from "vitest";
import { env } from "../../src/config/env";
import { DEMO_PASSWORD, seedDatabase } from "../../src/database/seed";
import { AudioTrack, Comment, Like, Story, User } from "../../src/models";
import { api, createStory, registerUser } from "../helpers";

/** Temporarily overrides fields on the shared env object for the duration of fn. */
const withEnv = async (overrides: Partial<typeof env>, fn: () => Promise<void>) => {
  const saved: Record<string, unknown> = {};
  for (const key of Object.keys(overrides) as (keyof typeof env)[]) saved[key] = env[key];
  Object.assign(env, overrides);
  try {
    await fn();
  } finally {
    Object.assign(env, saved);
  }
};

describe("seedDatabase (default test env)", () => {
  it("creates audio tracks but no users or stories", async () => {
    expect(env.SEED_DEMO_DATA).toBe(false);
    await seedDatabase();
    expect(await AudioTrack.countDocuments()).toBe(3);
    expect(await User.countDocuments()).toBe(0);
    expect(await Story.countDocuments()).toBe(0);
    expect(await Comment.countDocuments()).toBe(0);
    expect(await Like.countDocuments()).toBe(0);
  });

  it("is idempotent", async () => {
    await seedDatabase();
    await seedDatabase();
    expect(await AudioTrack.countDocuments()).toBe(3);
    expect(await User.countDocuments()).toBe(0);
  });
});

describe("seedDatabase with SEED_DEMO_DATA", () => {
  it("creates demo admin, users, stories, comments and likes; admin can log in", async () => {
    await withEnv({ SEED_DEMO_DATA: true, ADMIN_EMAIL: undefined, ADMIN_PASSWORD: undefined }, async () => {
      await seedDatabase();
    });

    const admin = await User.findOne({ email: "darkscribe@void.com" }).lean();
    expect(admin).toMatchObject({ id: "u1", username: env.ADMIN_USERNAME, role: "admin", isVerified: true });
    expect(admin!.passwordHash).not.toBe(DEMO_PASSWORD);
    expect(await User.countDocuments()).toBe(6);
    expect(await Story.countDocuments()).toBe(6);
    expect(await Comment.countDocuments()).toBe(9);
    expect(await Like.countDocuments()).toBe(9);
    expect(await AudioTrack.countDocuments()).toBe(3);

    const login = await api().post("/api/auth/login").send({ email: "darkscribe@void.com", password: "darkness123" });
    expect(login.status).toBe(200);
    expect(login.body.token).toEqual(expect.any(String));
    expect(login.body.user).toMatchObject({ role: "admin", isVerified: true });
  });

  it("is idempotent (second run adds nothing)", async () => {
    await withEnv({ SEED_DEMO_DATA: true }, async () => {
      await seedDatabase();
      await seedDatabase();
    });
    expect(await User.countDocuments()).toBe(6);
    expect(await Story.countDocuments()).toBe(6);
    expect(await Comment.countDocuments()).toBe(9);
    expect(await Like.countDocuments()).toBe(9);
    expect(await AudioTrack.countDocuments()).toBe(3);
  });

  it("does not seed demo stories when stories already exist", async () => {
    const user = await registerUser();
    const mine = await createStory(user.token, { title: "Mine" });
    await withEnv({ SEED_DEMO_DATA: true }, async () => {
      await seedDatabase();
    });
    expect(await Story.countDocuments()).toBe(1);
    expect(await Story.exists({ id: mine.id })).toBeTruthy();
    expect(await Comment.countDocuments()).toBe(0);
  });

  it("is non-destructive: missing demo comment c1 does not wipe user stories (regression)", async () => {
    await withEnv({ SEED_DEMO_DATA: true }, async () => {
      await seedDatabase();
      const user = await registerUser();
      const mine = await createStory(user.token, { title: "User created" });
      await Comment.deleteOne({ id: "c1" });

      await seedDatabase();

      expect(await Story.exists({ id: mine.id })).toBeTruthy();
      expect(await Story.countDocuments()).toBe(7);
      expect(await User.exists({ id: user.user.id })).toBeTruthy();
      // Not re-seeded either: c1 stays gone.
      expect(await Comment.exists({ id: "c1" })).toBeNull();
    });
  });
});

describe("seedDatabase with ADMIN_EMAIL / ADMIN_PASSWORD", () => {
  it("creates the configured admin who can log in", async () => {
    await withEnv({ ADMIN_EMAIL: "boss@void.test", ADMIN_PASSWORD: "Sup3rSecretPass", ADMIN_USERNAME: "TheBoss" }, async () => {
      await seedDatabase();
    });
    const admin = await User.findOne({ email: "boss@void.test" }).lean();
    expect(admin).toMatchObject({ username: "TheBoss", role: "admin", isVerified: true });
    expect(await User.countDocuments()).toBe(1);
    expect(await Story.countDocuments()).toBe(0);

    const login = await api().post("/api/auth/login").send({ email: "boss@void.test", password: "Sup3rSecretPass" });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe("admin");
  });

  it("does not create a second admin when one already exists", async () => {
    await withEnv({ ADMIN_EMAIL: "boss@void.test", ADMIN_PASSWORD: "Sup3rSecretPass", ADMIN_USERNAME: "TheBoss" }, async () => {
      await seedDatabase();
      await seedDatabase();
    });
    expect(await User.countDocuments({ role: "admin" })).toBe(1);
  });

  it("does not hijack an existing account with the same email", async () => {
    const existing = await registerUser({ email: "boss@void.test" });
    await withEnv({ ADMIN_EMAIL: "boss@void.test", ADMIN_PASSWORD: "Sup3rSecretPass", ADMIN_USERNAME: "TheBoss" }, async () => {
      await seedDatabase();
    });
    const u = await User.findOne({ email: "boss@void.test" }).lean();
    expect(u!.id).toBe(existing.user.id);
    expect(u!.role).toBe("user");
    expect(await User.countDocuments()).toBe(1);
  });
});
