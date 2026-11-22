import { describe, expect, it } from "vitest";
import { Application, Comment, ContactSubmission, Like, Story, Upload, User } from "../../src/models";
import { api, auth, createStory, PNG_BYTES, registerAdmin, registerUser } from "../helpers";

const ADMIN_ROUTES: Array<["get" | "delete" | "post", string]> = [
  ["get", "/api/admin/stats"],
  ["get", "/api/admin/users"],
  ["delete", "/api/admin/users/u_whatever"],
  ["post", "/api/admin/stories/s_whatever/feature"],
];

describe("admin access control", () => {
  it.each(ADMIN_ROUTES)("%s %s returns 401 without a token", async (method, path) => {
    const res = await api()[method](path);
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it.each(ADMIN_ROUTES)("%s %s returns 401 with a garbage token", async (method, path) => {
    const res = await api()[method](path).set(auth("not.a.jwt"));
    expect(res.status).toBe(401);
  });

  it.each(ADMIN_ROUTES)("%s %s returns 403 for a normal user", async (method, path) => {
    const user = await registerUser();
    const res = await api()[method](path).set(auth(user.token));
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin/i);
  });
});

describe("GET /api/admin/stats", () => {
  it("returns zero-ish counts on a fresh DB (only the admin)", async () => {
    const admin = await registerAdmin();
    const res = await api().get("/api/admin/stats").set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ totalStories: 0, activeUsers: 1, totalComments: 0, totalReports: 0 });
  });

  it("counts stories, users, comments and contact submissions", async () => {
    const admin = await registerAdmin();
    const user = await registerUser();
    const s1 = await createStory(user.token);
    await createStory(user.token, { title: "Second" });
    await createStory(admin.token, { title: "Third" });
    await api().post(`/api/stories/${s1.id}/comments`).set(auth(admin.token)).send({ text: "boo" }).expect(201);
    await api().post(`/api/stories/${s1.id}/comments`).set(auth(user.token)).send({ text: "hiss" }).expect(201);
    await api().post("/api/stories/contact").send({ name: "A", email: "a@void.test", message: "hello" }).expect(201);

    const res = await api().get("/api/admin/stats").set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ totalStories: 3, activeUsers: 2, totalComments: 2, totalReports: 1 });
  });
});

describe("GET /api/admin/users", () => {
  it("returns an array of public users without secrets or internals", async () => {
    const admin = await registerAdmin();
    const user = await registerUser();
    // Make sure secret fields actually exist in the DB so the test is meaningful.
    await User.updateOne({ id: user.user.id }, { resetPasswordToken: "deadbeef", resetPasswordExpires: new Date() });

    const res = await api().get("/api/admin/users").set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);

    const ids = res.body.map((u: { id: string }) => u.id).sort();
    expect(ids).toEqual([admin.user.id, user.user.id].sort());

    for (const u of res.body) {
      expect(Object.keys(u).sort()).toEqual(["avatar", "createdAt", "email", "id", "isVerified", "role", "username"]);
      for (const secret of ["passwordHash", "verificationToken", "verificationExpires", "resetPasswordToken", "resetPasswordExpires", "_id", "__v", "tokenVersion"]) {
        expect(u).not.toHaveProperty(secret);
      }
    }
    const adminRow = res.body.find((u: { id: string }) => u.id === admin.user.id);
    expect(adminRow.role).toBe("admin");
  });
});

describe("DELETE /api/admin/users/:id", () => {
  it("refuses to ban yourself (400)", async () => {
    const admin = await registerAdmin();
    const res = await api().delete(`/api/admin/users/${admin.user.id}`).set(auth(admin.token));
    expect(res.status).toBe(400);
    expect(await User.exists({ id: admin.user.id })).toBeTruthy();
  });

  it("refuses to ban another admin (403)", async () => {
    const admin = await registerAdmin();
    const other = await registerAdmin();
    const res = await api().delete(`/api/admin/users/${other.user.id}`).set(auth(admin.token));
    expect(res.status).toBe(403);
    expect(await User.exists({ id: other.user.id })).toBeTruthy();
  });

  it("returns 404 for an unknown user", async () => {
    const admin = await registerAdmin();
    const res = await api().delete("/api/admin/users/u_doesnotexist").set(auth(admin.token));
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it("bans a user and cascades every trace of them, leaving others intact", async () => {
    const admin = await registerAdmin();
    const victim = await registerUser();
    const bystander = await registerUser();

    // Victim's own content
    const victimStory = await createStory(victim.token, { title: "Victim story" });
    const bystanderStory = await createStory(bystander.token, { title: "Bystander story" });

    // Others interacting with the victim's story (must be wiped)
    await api().post(`/api/stories/${victimStory.id}/comments`).set(auth(bystander.token)).send({ text: "on victim story" }).expect(201);
    await api().post(`/api/stories/${victimStory.id}/like`).set(auth(bystander.token)).expect(200);
    await api().post(`/api/stories/${victimStory.id}/apply`).set(auth(bystander.token)).send({ notes: "mine" }).expect(201);

    // Victim interacting elsewhere (must be wiped)
    await api().post(`/api/stories/${bystanderStory.id}/comments`).set(auth(victim.token)).send({ text: "victim elsewhere" }).expect(201);
    await api().post(`/api/stories/${bystanderStory.id}/like`).set(auth(victim.token)).expect(200);
    await api().post(`/api/stories/${bystanderStory.id}/apply`).set(auth(victim.token)).send({ notes: "adopt" }).expect(201);

    // Bystander's own content on their own story (must survive)
    await api().post(`/api/stories/${bystanderStory.id}/comments`).set(auth(bystander.token)).send({ text: "survivor" }).expect(201);
    await api().post(`/api/stories/${bystanderStory.id}/like`).set(auth(bystander.token)).expect(200);

    // Uploads
    await api().post("/api/upload").set(auth(victim.token)).attach("image", PNG_BYTES, "v.png").expect(201);
    await api().post("/api/upload").set(auth(bystander.token)).attach("image", PNG_BYTES, "b.png").expect(201);

    // Sanity: victim token works before the ban
    await api().get("/api/auth/me").set(auth(victim.token)).expect(200);

    const res = await api().delete(`/api/admin/users/${victim.user.id}`).set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.message).toEqual(expect.any(String));

    const vid = victim.user.id;
    expect(await User.exists({ id: vid })).toBeNull();
    expect(await Story.countDocuments({ authorId: vid })).toBe(0);
    expect(await Story.exists({ id: victimStory.id })).toBeNull();

    // Content on the victim's story by others
    expect(await Comment.countDocuments({ storyId: victimStory.id })).toBe(0);
    expect(await Like.countDocuments({ storyId: victimStory.id })).toBe(0);
    expect(await Application.countDocuments({ storyId: victimStory.id })).toBe(0);

    // Victim's footprints elsewhere
    expect(await Comment.countDocuments({ userId: vid })).toBe(0);
    expect(await Like.countDocuments({ userId: vid })).toBe(0);
    expect(await Application.countDocuments({ userId: vid })).toBe(0);
    expect(await Upload.countDocuments({ ownerId: vid })).toBe(0);

    // Bystander's data is untouched
    expect(await User.exists({ id: bystander.user.id })).toBeTruthy();
    expect(await Story.exists({ id: bystanderStory.id })).toBeTruthy();
    expect(await Comment.countDocuments({ storyId: bystanderStory.id })).toBe(1);
    expect(await Like.countDocuments({ storyId: bystanderStory.id })).toBe(1);
    expect(await Upload.countDocuments({ ownerId: bystander.user.id })).toBe(1);

    // Banned user's existing token is now rejected
    const me = await api().get("/api/auth/me").set(auth(victim.token));
    expect(me.status).toBe(401);
    const post = await api().post("/api/stories").set(auth(victim.token)).send({ title: "x", content: "y", category: "Paranormal" });
    expect(post.status).toBe(401);
  });

  it("leaves contact submissions alone (stats still count them)", async () => {
    const admin = await registerAdmin();
    const victim = await registerUser();
    await api().post("/api/stories/contact").set(auth(victim.token)).send({ name: "V", email: "v@void.test", message: "hi" }).expect(201);
    await api().delete(`/api/admin/users/${victim.user.id}`).set(auth(admin.token)).expect(200);
    expect(await ContactSubmission.countDocuments()).toBe(1);
  });
});

describe("POST /api/admin/stories/:id/feature", () => {
  it("toggles featured true -> false -> true", async () => {
    const admin = await registerAdmin();
    const user = await registerUser();
    const story = await createStory(user.token);

    const first = await api().post(`/api/admin/stories/${story.id}/feature`).set(auth(admin.token));
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ featured: true });
    expect((await Story.findOne({ id: story.id }).lean())!.featured).toBe(true);

    const second = await api().post(`/api/admin/stories/${story.id}/feature`).set(auth(admin.token));
    expect(second.body).toEqual({ featured: false });
    expect((await Story.findOne({ id: story.id }).lean())!.featured).toBe(false);

    const third = await api().post(`/api/admin/stories/${story.id}/feature`).set(auth(admin.token));
    expect(third.body).toEqual({ featured: true });
  });

  it("treats a story with no featured field as unfeatured", async () => {
    const admin = await registerAdmin();
    await Story.collection.insertOne({ id: "legacy1", title: "L", content: "C", category: "Paranormal", authorId: "x", createdAt: "2026-01-01" });
    const res = await api().post("/api/admin/stories/legacy1/feature").set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ featured: true });
  });

  it("returns 404 for an unknown story", async () => {
    const admin = await registerAdmin();
    const res = await api().post("/api/admin/stories/s_missing/feature").set(auth(admin.token));
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual(expect.any(String));
  });
});
