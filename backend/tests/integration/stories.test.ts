import { describe, expect, it } from "vitest";
import { Application, Comment, ContactSubmission, Like, Story, User } from "../../src/models";
import { api, auth, createStory, insertStory, registerAdmin, registerUser } from "../helpers";

const CATEGORIES = ["Paranormal", "Psychological", "Urban Legends", "True Horror", "Dark Fantasy"];

/** Inserts `n` stories with strictly increasing createdAt dates (index 0 = oldest). */
const insertDated = async (n: number, fields: Parameters<typeof insertStory>[0] = {}) => {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const day = String(i + 1).padStart(2, "0");
    out.push(await insertStory({ id: `s_dated_${day}`, title: `Story ${day}`, createdAt: `2026-01-${day}`, ...fields }));
  }
  return out;
};

const addComment = async (token: string, storyId: string, text = "boo") => {
  const res = await api().post(`/api/stories/${storyId}/comments`).set(auth(token)).send({ text });
  if (res.status !== 201) throw new Error(`addComment failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { id: string; storyId: string; userId: string; username: string; text: string; createdAt: string };
};

// ---------------------------------------------------------------------------
// GET /api/stories
// ---------------------------------------------------------------------------

describe("GET /api/stories", () => {
  it("returns the paginated shape with default limit 6, newest first", async () => {
    await insertDated(8);
    const res = await api().get("/api/stories");
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(["limit", "page", "stories", "totalPages", "totalStories"]);
    expect(res.body).toMatchObject({ page: 1, totalPages: 2, totalStories: 8, limit: 6 });
    expect(res.body.stories.map((s: { id: string }) => s.id)).toEqual([
      "s_dated_08",
      "s_dated_07",
      "s_dated_06",
      "s_dated_05",
      "s_dated_04",
      "s_dated_03",
    ]);
  });

  it("returns page 2 contents", async () => {
    await insertDated(8);
    const res = await api().get("/api/stories?page=2");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 2, totalPages: 2, totalStories: 8, limit: 6 });
    expect(res.body.stories.map((s: { id: string }) => s.id)).toEqual(["s_dated_02", "s_dated_01"]);
  });

  it("honours a custom limit and returns an empty page beyond the end", async () => {
    await insertDated(5);
    const p1 = await api().get("/api/stories?limit=2&page=3");
    expect(p1.body).toMatchObject({ page: 3, totalPages: 3, totalStories: 5, limit: 2 });
    expect(p1.body.stories.map((s: { id: string }) => s.id)).toEqual(["s_dated_01"]);

    const beyond = await api().get("/api/stories?limit=2&page=10");
    expect(beyond.status).toBe(200);
    expect(beyond.body.stories).toEqual([]);
  });

  it("returns an empty list with totalPages 0 when there are no stories", async () => {
    const res = await api().get("/api/stories");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ stories: [], page: 1, totalPages: 0, totalStories: 0, limit: 6 });
  });

  it("filters by category case-insensitively; 'All' means no filter", async () => {
    await insertStory({ id: "s_p", category: "Paranormal", createdAt: "2026-01-01" });
    await insertStory({ id: "s_u", category: "Urban Legends", createdAt: "2026-01-02" });
    await insertStory({ id: "s_d", category: "Dark Fantasy", createdAt: "2026-01-03" });

    const exact = await api().get("/api/stories").query({ category: "Urban Legends" });
    expect(exact.body.stories.map((s: { id: string }) => s.id)).toEqual(["s_u"]);
    expect(exact.body.totalStories).toBe(1);

    const lower = await api().get("/api/stories").query({ category: "urban legends" });
    expect(lower.body.stories.map((s: { id: string }) => s.id)).toEqual(["s_u"]);

    const partial = await api().get("/api/stories").query({ category: "Urban" });
    expect(partial.body.stories).toEqual([]);

    const all = await api().get("/api/stories").query({ category: "All" });
    expect(all.body.totalStories).toBe(3);
  });

  it("searches title AND content case-insensitively", async () => {
    await insertStory({ id: "s_title", title: "The Crimson Door", content: "nothing here", createdAt: "2026-01-01" });
    await insertStory({ id: "s_content", title: "Plain", content: "behind the crimson curtain", createdAt: "2026-01-02" });
    await insertStory({ id: "s_none", title: "Other", content: "blue", createdAt: "2026-01-03" });

    const res = await api().get("/api/stories").query({ search: "CRIMSON" });
    expect(res.status).toBe(200);
    expect(res.body.stories.map((s: { id: string }) => s.id)).toEqual(["s_content", "s_title"]);
    expect(res.body.totalStories).toBe(2);
  });

  it("combines category and search filters", async () => {
    await insertStory({ id: "s_a", title: "Ghost ship", category: "Paranormal", createdAt: "2026-01-01" });
    await insertStory({ id: "s_b", title: "Ghost town", category: "Urban Legends", createdAt: "2026-01-02" });
    const res = await api().get("/api/stories").query({ search: "ghost", category: "paranormal" });
    expect(res.body.stories.map((s: { id: string }) => s.id)).toEqual(["s_a"]);
  });

  it.each(["(", ".*", "[", "a+b", "\\", "$^"])("treats regex metacharacters in search %j literally", async (search) => {
    await insertStory({ id: "s_plain", title: "Plain tale", content: "nothing special", createdAt: "2026-01-01" });
    const res = await api().get("/api/stories").query({ search });
    expect(res.status).toBe(200);
    expect(res.body.stories).toEqual([]);
    expect(res.body.totalStories).toBe(0);
  });

  it("matches a literal metacharacter in search when present", async () => {
    await insertStory({ id: "s_paren", title: "The (cursed) box", createdAt: "2026-01-01" });
    await insertStory({ id: "s_plain", title: "Plain", createdAt: "2026-01-02" });
    const res = await api().get("/api/stories").query({ search: "(cursed)" });
    expect(res.body.stories.map((s: { id: string }) => s.id)).toEqual(["s_paren"]);
  });

  it.each([".*", "(", "Paranormal|Urban Legends"])("treats regex metacharacters in category %j literally", async (category) => {
    await insertStory({ id: "s_p", category: "Paranormal", createdAt: "2026-01-01" });
    await insertStory({ id: "s_u", category: "Urban Legends", createdAt: "2026-01-02" });
    const res = await api().get("/api/stories").query({ category });
    expect(res.status).toBe(200);
    expect(res.body.stories).toEqual([]);
  });

  it.each([
    ["page=0", "page=0"],
    ["page=-1", "page=-1"],
    ["page=abc", "page=abc"],
    ["page=1.5", "page=1.5"],
    ["limit=0", "limit=0"],
    ["limit=1000", "limit=1000"],
    ["limit=51", "limit=51"],
    ["limit=abc", "limit=abc"],
  ])("rejects invalid query %s with 400", async (_label, qs) => {
    const res = await api().get(`/api/stories?${qs}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it("limit=all returns a bare array (newest first, filters applied)", async () => {
    await insertDated(8);
    await insertStory({ id: "s_other", category: "True Horror", createdAt: "2026-02-01" });
    const res = await api().get("/api/stories?limit=all");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(9);
    expect(res.body[0].id).toBe("s_other");
    expect(res.body[8].id).toBe("s_dated_01");

    const filtered = await api().get("/api/stories?limit=all&category=true%20horror");
    expect(filtered.body.map((s: { id: string }) => s.id)).toEqual(["s_other"]);
  });

  it("enriches stories with author, live counts and no _id", async () => {
    const author = await registerUser({ username: "Author1" });
    await User.updateOne({ id: author.user.id }, { avatar: "/api/uploads/av" });
    const fan = await registerUser();
    const story = await createStory(author.token);
    // Stale denormalised counters must be ignored in favour of live counts.
    await Story.updateOne({ id: story.id }, { likes: 999, comments: 999 });
    await api().post(`/api/stories/${story.id}/like`).set(auth(fan.token));
    await addComment(fan.token, story.id);
    await addComment(author.token, story.id);

    const res = await api().get("/api/stories");
    expect(res.status).toBe(200);
    const [s] = res.body.stories;
    expect(s).not.toHaveProperty("_id");
    expect(s.author).toEqual({ id: author.user.id, username: "Author1", avatar: "/api/uploads/av" });
    expect(s.likes).toBe(1);
    expect(s.comments).toBe(2);
    expect(s.likedByUser).toBe(false);
    expect(s).toMatchObject({ id: story.id, title: "The Hollow", category: "Paranormal", authorId: author.user.id, featured: false });
  });

  it("falls back to 'Unknown Ghost' when the author no longer exists", async () => {
    await insertStory({ id: "s_orphan", authorId: "u_gone" });
    const res = await api().get("/api/stories");
    expect(res.body.stories[0].author).toEqual({ id: "u_gone", username: "Unknown Ghost", avatar: "" });
  });

  it("sets likedByUser only for the viewer who liked, with a valid token", async () => {
    const author = await registerUser();
    const liker = await registerUser();
    const other = await registerUser();
    const story = await createStory(author.token);
    await api().post(`/api/stories/${story.id}/like`).set(auth(liker.token));

    const asLiker = await api().get("/api/stories").set(auth(liker.token));
    expect(asLiker.body.stories[0].likedByUser).toBe(true);

    const asOther = await api().get("/api/stories").set(auth(other.token));
    expect(asOther.body.stories[0].likedByUser).toBe(false);

    const anon = await api().get("/api/stories");
    expect(anon.body.stories[0].likedByUser).toBe(false);

    const allAsLiker = await api().get("/api/stories?limit=all").set(auth(liker.token));
    expect(allAsLiker.body[0].likedByUser).toBe(true);
  });

  it("does not 401 on an invalid token for the public list (treated as anonymous)", async () => {
    const author = await registerUser();
    const story = await createStory(author.token);
    await api().post(`/api/stories/${story.id}/like`).set(auth(author.token));

    const garbage = await api().get("/api/stories").set("Authorization", "Bearer not.a.jwt");
    expect(garbage.status).toBe(200);
    expect(garbage.body.stories[0].likedByUser).toBe(false);

    // A once-valid token for a deleted user is also ignored, not rejected.
    await User.deleteOne({ id: author.user.id });
    const stale = await api().get("/api/stories").set(auth(author.token));
    expect(stale.status).toBe(200);
    expect(stale.body.stories[0].likedByUser).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GET /api/stories/:id
// ---------------------------------------------------------------------------

describe("GET /api/stories/:id", () => {
  it("returns the enriched story and increments views on each call", async () => {
    const author = await registerUser();
    const story = await createStory(author.token);

    const first = await api().get(`/api/stories/${story.id}`);
    expect(first.status).toBe(200);
    expect(first.body.views).toBe(1);
    expect(first.body).not.toHaveProperty("_id");
    expect(first.body.author.id).toBe(author.user.id);
    expect(first.body.commentList).toEqual([]);

    const second = await api().get(`/api/stories/${story.id}`);
    expect(second.body.views).toBe(2);
    const stored = await Story.findOne({ id: story.id }).lean();
    expect(stored!.views).toBe(2);
  });

  it("includes commentList newest first with current usernames and no _id", async () => {
    const author = await registerUser();
    const commenter = await registerUser({ username: "OldName" });
    const story = await insertStory({ id: "s_detail", authorId: author.user.id });
    await Comment.create([
      { id: "c_old", storyId: story.id, userId: commenter.user.id, username: "OldName", text: "first", createdAt: "2026-01-01 10:00:00" },
      { id: "c_new", storyId: story.id, userId: author.user.id, username: author.user.username, text: "second", createdAt: "2026-01-02 10:00:00" },
      { id: "c_ghost", storyId: story.id, userId: "u_deleted", username: "Departed", text: "third", createdAt: "2026-01-01 12:00:00" },
      { id: "c_elsewhere", storyId: "s_other", userId: author.user.id, username: "x", text: "not here", createdAt: "2026-01-03 10:00:00" },
    ]);
    await User.updateOne({ id: commenter.user.id }, { username: "NewName" });

    const res = await api().get(`/api/stories/${story.id}`);
    expect(res.status).toBe(200);
    expect(res.body.comments).toBe(3);
    expect(res.body.commentList.map((c: { id: string }) => c.id)).toEqual(["c_new", "c_ghost", "c_old"]);
    const byId = Object.fromEntries(res.body.commentList.map((c: { id: string }) => [c.id, c]));
    expect(byId.c_old.username).toBe("NewName");
    expect(byId.c_ghost.username).toBe("Departed"); // falls back to stored name
    expect(byId.c_new.username).toBe(author.user.username);
    for (const c of res.body.commentList) expect(c).not.toHaveProperty("_id");
  });

  it("reports likedByUser for the viewer", async () => {
    const author = await registerUser();
    const story = await createStory(author.token);
    await api().post(`/api/stories/${story.id}/like`).set(auth(author.token));
    expect((await api().get(`/api/stories/${story.id}`).set(auth(author.token))).body.likedByUser).toBe(true);
    expect((await api().get(`/api/stories/${story.id}`)).body.likedByUser).toBe(false);
    const bad = await api().get(`/api/stories/${story.id}`).set("Authorization", "Bearer garbage");
    expect(bad.status).toBe(200);
    expect(bad.body.likedByUser).toBe(false);
  });

  it("returns a JSON 404 for a missing story", async () => {
    const res = await api().get("/api/stories/s_does_not_exist");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toEqual({ error: expect.any(String) });
  });
});

// ---------------------------------------------------------------------------
// POST /api/stories
// ---------------------------------------------------------------------------

describe("POST /api/stories", () => {
  const valid = { title: "The Hollow", content: "Something knocks.", category: "Paranormal" };

  it("requires auth", async () => {
    const res = await api().post("/api/stories").send(valid);
    expect(res.status).toBe(401);
    expect(await Story.countDocuments()).toBe(0);
  });

  it("rejects an invalid token", async () => {
    const res = await api().post("/api/stories").set("Authorization", "Bearer nope").send(valid);
    expect(res.status).toBe(401);
  });

  it("creates a story and returns the enriched shape (201)", async () => {
    const u = await registerUser({ username: "Creator" });
    const res = await api().post("/api/stories").set(auth(u.token)).send(valid);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: "The Hollow",
      content: "Something knocks.",
      category: "Paranormal",
      authorId: u.user.id,
      views: 0,
      likes: 0,
      comments: 0,
      likedByUser: false,
      featured: false,
      author: { id: u.user.id, username: "Creator", avatar: "" },
    });
    expect(res.body.id).toMatch(/^s_[a-f0-9]{24}$/);
    expect(res.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.body).not.toHaveProperty("_id");
    expect(await Story.countDocuments({ id: res.body.id, authorId: u.user.id })).toBe(1);
  });

  it("trims title and content", async () => {
    const u = await registerUser();
    const res = await api().post("/api/stories").set(auth(u.token)).send({ ...valid, title: "  Spaced  ", content: "  body  " });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Spaced");
    expect(res.body.content).toBe("body");
  });

  it.each(CATEGORIES)("accepts category %j", async (category) => {
    const u = await registerUser();
    const res = await api().post("/api/stories").set(auth(u.token)).send({ ...valid, category });
    expect(res.status).toBe(201);
    expect(res.body.category).toBe(category);
  });

  it.each([
    ["missing title", { content: "c", category: "Paranormal" }],
    ["missing content", { title: "t", category: "Paranormal" }],
    ["missing category", { title: "t", content: "c" }],
    ["empty title", { title: "", content: "c", category: "Paranormal" }],
    ["whitespace title", { title: "   ", content: "c", category: "Paranormal" }],
    ["whitespace content", { title: "t", content: "   ", category: "Paranormal" }],
    ["title > 200", { title: "x".repeat(201), content: "c", category: "Paranormal" }],
    ["content > 50000", { title: "t", content: "x".repeat(50_001), category: "Paranormal" }],
    ["unknown category", { title: "t", content: "c", category: "Comedy" }],
    ["wrong-case category", { title: "t", content: "c", category: "paranormal" }],
    ["All category", { title: "t", content: "c", category: "All" }],
    ["javascript: cover", { ...valid, coverImage: "javascript:alert(1)" }],
    ["data: cover", { ...valid, coverImage: "data:image/png;base64,AAAA" }],
    ["relative cover outside uploads", { ...valid, coverImage: "/etc/passwd" }],
    ["non-string title", { title: 123, content: "c", category: "Paranormal" }],
  ])("rejects %s with 400", async (_label, body) => {
    const u = await registerUser();
    const res = await api().post("/api/stories").set(auth(u.token)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
    expect(await Story.countDocuments()).toBe(0);
  });

  it("accepts a title of exactly 200 characters", async () => {
    const u = await registerUser();
    const res = await api().post("/api/stories").set(auth(u.token)).send({ ...valid, title: "x".repeat(200) });
    expect(res.status).toBe(201);
  });

  it("generates a default Pollinations cover when none is provided", async () => {
    const u = await registerUser();
    const res = await api().post("/api/stories").set(auth(u.token)).send(valid);
    expect(res.body.coverImage).toMatch(/^https:\/\/image\.pollinations\.ai\/prompt\//);
    expect(res.body.coverImage).toContain(encodeURIComponent("The Hollow"));

    const empty = await api().post("/api/stories").set(auth(u.token)).send({ ...valid, coverImage: "" });
    expect(empty.status).toBe(201);
    expect(empty.body.coverImage).toMatch(/^https:\/\/image\.pollinations\.ai\//);
  });

  it.each(["/api/uploads/img_abc123", "https://example.com/cover.jpg", "http://example.com/c.png", "/images/stock.jpg"])(
    "keeps a provided cover %j",
    async (coverImage) => {
      const u = await registerUser();
      const res = await api().post("/api/stories").set(auth(u.token)).send({ ...valid, coverImage });
      expect(res.status).toBe(201);
      expect(res.body.coverImage).toBe(coverImage);
    },
  );

  it("strips unknown/privileged body fields", async () => {
    const u = await registerUser();
    const res = await api()
      .post("/api/stories")
      .set(auth(u.token))
      .send({ ...valid, featured: true, views: 9999, likes: 500, comments: 77, authorId: "someone", id: "s_chosen", createdAt: "1999-01-01" });
    expect(res.status).toBe(201);
    expect(res.body.featured).toBe(false);
    expect(res.body.views).toBe(0);
    expect(res.body.likes).toBe(0);
    expect(res.body.comments).toBe(0);
    expect(res.body.authorId).toBe(u.user.id);
    expect(res.body.id).not.toBe("s_chosen");
    expect(res.body.createdAt).not.toBe("1999-01-01");

    const stored = await Story.findOne({ id: res.body.id }).lean();
    expect(stored).toMatchObject({ featured: false, views: 0, likes: 0, comments: 0, authorId: u.user.id });
  });
});

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

describe("POST /api/stories/:id/like", () => {
  it("toggles like on and off with correct counts", async () => {
    const u = await registerUser();
    const story = await createStory(u.token);

    const on = await api().post(`/api/stories/${story.id}/like`).set(auth(u.token));
    expect(on.status).toBe(200);
    expect(on.body).toEqual({ liked: true, likes: 1 });

    const off = await api().post(`/api/stories/${story.id}/like`).set(auth(u.token));
    expect(off.status).toBe(200);
    expect(off.body).toEqual({ liked: false, likes: 0 });

    const again = await api().post(`/api/stories/${story.id}/like`).set(auth(u.token));
    expect(again.body).toEqual({ liked: true, likes: 1 });
    expect(await Like.countDocuments({ storyId: story.id })).toBe(1);
  });

  it("counts likes from multiple users independently", async () => {
    const a = await registerUser();
    const b = await registerUser();
    const story = await createStory(a.token);

    expect((await api().post(`/api/stories/${story.id}/like`).set(auth(a.token))).body).toEqual({ liked: true, likes: 1 });
    expect((await api().post(`/api/stories/${story.id}/like`).set(auth(b.token))).body).toEqual({ liked: true, likes: 2 });
    expect((await api().post(`/api/stories/${story.id}/like`).set(auth(a.token))).body).toEqual({ liked: false, likes: 1 });

    const asB = await api().get(`/api/stories/${story.id}`).set(auth(b.token));
    expect(asB.body).toMatchObject({ likes: 1, likedByUser: true });
    const asA = await api().get(`/api/stories/${story.id}`).set(auth(a.token));
    expect(asA.body).toMatchObject({ likes: 1, likedByUser: false });
  });

  it("does not affect likes on other stories", async () => {
    const u = await registerUser();
    const s1 = await createStory(u.token, { title: "One" });
    const s2 = await createStory(u.token, { title: "Two" });
    await api().post(`/api/stories/${s1.id}/like`).set(auth(u.token));
    const res = await api().get(`/api/stories/${s2.id}`).set(auth(u.token));
    expect(res.body).toMatchObject({ likes: 0, likedByUser: false });
  });

  it("returns 404 for a missing story", async () => {
    const u = await registerUser();
    const res = await api().post("/api/stories/s_missing/like").set(auth(u.token));
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual(expect.any(String));
    expect(await Like.countDocuments()).toBe(0);
  });

  it("requires auth", async () => {
    const u = await registerUser();
    const story = await createStory(u.token);
    const res = await api().post(`/api/stories/${story.id}/like`);
    expect(res.status).toBe(401);
  });

  it("never creates more than one Like for concurrent double-likes", async () => {
    const u = await registerUser();
    const story = await createStory(u.token);
    const results = await Promise.all([
      api().post(`/api/stories/${story.id}/like`).set(auth(u.token)),
      api().post(`/api/stories/${story.id}/like`).set(auth(u.token)),
    ]);
    for (const r of results) expect(r.status).toBe(200);
    const count = await Like.countDocuments({ storyId: story.id, userId: u.user.id });
    expect(count).toBeLessThanOrEqual(1);
    for (const r of results) expect(r.body.likes).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

describe("POST /api/stories/:id/comments", () => {
  it("adds a trimmed comment (201) with the caller's identity", async () => {
    const author = await registerUser();
    const commenter = await registerUser({ username: "Whisperer" });
    const story = await createStory(author.token);

    const res = await api().post(`/api/stories/${story.id}/comments`).set(auth(commenter.token)).send({ text: "   hello there   " });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ storyId: story.id, userId: commenter.user.id, username: "Whisperer", text: "hello there" });
    expect(res.body.id).toMatch(/^c_[a-f0-9]{24}$/);
    expect(res.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(res.body).not.toHaveProperty("_id");

    const detail = await api().get(`/api/stories/${story.id}`);
    expect(detail.body.comments).toBe(1);
    expect(detail.body.commentList[0].text).toBe("hello there");
  });

  it("ignores spoofed identity fields in the body", async () => {
    const author = await registerUser();
    const story = await createStory(author.token);
    const res = await api()
      .post(`/api/stories/${story.id}/comments`)
      .set(auth(author.token))
      .send({ text: "hi", userId: "u_victim", username: "Admin", storyId: "s_other" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ userId: author.user.id, username: author.user.username, storyId: story.id });
  });

  it.each([
    ["empty", { text: "" }],
    ["whitespace", { text: "    " }],
    ["missing", {}],
    ["too long", { text: "x".repeat(2001) }],
    ["non-string", { text: 42 }],
  ])("rejects %s text with 400", async (_label, body) => {
    const u = await registerUser();
    const story = await createStory(u.token);
    const res = await api().post(`/api/stories/${story.id}/comments`).set(auth(u.token)).send(body);
    expect(res.status).toBe(400);
    expect(await Comment.countDocuments()).toBe(0);
  });

  it("accepts exactly 2000 characters", async () => {
    const u = await registerUser();
    const story = await createStory(u.token);
    const res = await api().post(`/api/stories/${story.id}/comments`).set(auth(u.token)).send({ text: "x".repeat(2000) });
    expect(res.status).toBe(201);
  });

  it("returns 404 for a missing story and 401 without auth", async () => {
    const u = await registerUser();
    const missing = await api().post("/api/stories/s_missing/comments").set(auth(u.token)).send({ text: "hi" });
    expect(missing.status).toBe(404);
    const story = await createStory(u.token);
    const anon = await api().post(`/api/stories/${story.id}/comments`).send({ text: "hi" });
    expect(anon.status).toBe(401);
    expect(await Comment.countDocuments()).toBe(0);
  });
});

describe("DELETE /api/stories/:id/comments/:commentId", () => {
  const setup = async () => {
    const storyAuthor = await registerUser();
    const commenter = await registerUser();
    const stranger = await registerUser();
    const admin = await registerAdmin();
    const story = await createStory(storyAuthor.token);
    const comment = await addComment(commenter.token, story.id);
    return { storyAuthor, commenter, stranger, admin, story, comment };
  };

  it.each(["commenter", "storyAuthor", "admin"] as const)("allows the %s to delete", async (who) => {
    const ctx = await setup();
    const res = await api().delete(`/api/stories/${ctx.story.id}/comments/${ctx.comment.id}`).set(auth(ctx[who].token));
    expect(res.status).toBe(200);
    expect(res.body.message).toEqual(expect.any(String));
    expect(await Comment.countDocuments({ id: ctx.comment.id })).toBe(0);
  });

  it("forbids a random user (403)", async () => {
    const ctx = await setup();
    const res = await api().delete(`/api/stories/${ctx.story.id}/comments/${ctx.comment.id}`).set(auth(ctx.stranger.token));
    expect(res.status).toBe(403);
    expect(await Comment.countDocuments({ id: ctx.comment.id })).toBe(1);
  });

  it("does not let a story author delete a comment via their own story id when it belongs to another story (404)", async () => {
    const ctx = await setup();
    const ownStory = await createStory(ctx.stranger.token, { title: "Mine" });
    const res = await api().delete(`/api/stories/${ownStory.id}/comments/${ctx.comment.id}`).set(auth(ctx.stranger.token));
    expect(res.status).toBe(404);
    expect(await Comment.countDocuments({ id: ctx.comment.id })).toBe(1);
  });

  it("returns 404 for a missing comment or missing story", async () => {
    const ctx = await setup();
    const noComment = await api().delete(`/api/stories/${ctx.story.id}/comments/c_missing`).set(auth(ctx.admin.token));
    expect(noComment.status).toBe(404);
    const noStory = await api().delete(`/api/stories/s_missing/comments/${ctx.comment.id}`).set(auth(ctx.admin.token));
    expect(noStory.status).toBe(404);
    expect(await Comment.countDocuments()).toBe(1);
  });

  it("requires auth", async () => {
    const ctx = await setup();
    const res = await api().delete(`/api/stories/${ctx.story.id}/comments/${ctx.comment.id}`);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/stories/:id
// ---------------------------------------------------------------------------

describe("DELETE /api/stories/:id", () => {
  it("lets the author delete their story", async () => {
    const u = await registerUser();
    const story = await createStory(u.token);
    const res = await api().delete(`/api/stories/${story.id}`).set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.message).toEqual(expect.any(String));
    expect(await Story.countDocuments({ id: story.id })).toBe(0);
    expect((await api().get(`/api/stories/${story.id}`)).status).toBe(404);
  });

  it("lets an admin delete any story", async () => {
    const u = await registerUser();
    const admin = await registerAdmin();
    const story = await createStory(u.token);
    const res = await api().delete(`/api/stories/${story.id}`).set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(await Story.countDocuments({ id: story.id })).toBe(0);
  });

  it("forbids other users (403)", async () => {
    const u = await registerUser();
    const other = await registerUser();
    const story = await createStory(u.token);
    const res = await api().delete(`/api/stories/${story.id}`).set(auth(other.token));
    expect(res.status).toBe(403);
    expect(await Story.countDocuments({ id: story.id })).toBe(1);
  });

  it("returns 404 for missing and 401 without auth", async () => {
    const u = await registerUser();
    expect((await api().delete("/api/stories/s_missing").set(auth(u.token))).status).toBe(404);
    const story = await createStory(u.token);
    expect((await api().delete(`/api/stories/${story.id}`)).status).toBe(401);
  });

  it("cascades to comments, likes and applications of that story only", async () => {
    const author = await registerUser();
    const fan = await registerUser();
    const doomed = await createStory(author.token, { title: "Doomed" });
    const survivor = await createStory(author.token, { title: "Survivor" });

    for (const s of [doomed, survivor]) {
      await api().post(`/api/stories/${s.id}/like`).set(auth(fan.token));
      await addComment(fan.token, s.id);
      const apply = await api().post(`/api/stories/${s.id}/apply`).set(auth(fan.token)).send({ notes: "pls" });
      expect(apply.status).toBe(201);
    }

    const res = await api().delete(`/api/stories/${doomed.id}`).set(auth(author.token));
    expect(res.status).toBe(200);

    expect(await Comment.countDocuments({ storyId: doomed.id })).toBe(0);
    expect(await Like.countDocuments({ storyId: doomed.id })).toBe(0);
    expect(await Application.countDocuments({ storyId: doomed.id })).toBe(0);

    expect(await Comment.countDocuments({ storyId: survivor.id })).toBe(1);
    expect(await Like.countDocuments({ storyId: survivor.id })).toBe(1);
    expect(await Application.countDocuments({ storyId: survivor.id })).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Adoption applications
// ---------------------------------------------------------------------------

describe("POST /api/stories/:id/apply", () => {
  it("creates a pending application (201)", async () => {
    const author = await registerUser();
    const applicant = await registerUser({ username: "Adopter" });
    const story = await createStory(author.token, { title: "Orphan Tale" });

    const res = await api().post(`/api/stories/${story.id}/apply`).set(auth(applicant.token)).send({ notes: "  I will cherish it  " });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      userId: applicant.user.id,
      username: "Adopter",
      storyId: story.id,
      storyTitle: "Orphan Tale",
      notes: "I will cherish it",
      status: "pending",
    });
    expect(res.body.id).toMatch(/^app_[a-f0-9]{24}$/);
    expect(res.body).not.toHaveProperty("_id");
  });

  it("makes notes optional", async () => {
    const author = await registerUser();
    const applicant = await registerUser();
    const story = await createStory(author.token);
    const res = await api().post(`/api/stories/${story.id}/apply`).set(auth(applicant.token)).send({});
    expect(res.status).toBe(201);
    expect(res.body.notes).toBe("");
  });

  it("ignores a client-supplied status", async () => {
    const author = await registerUser();
    const applicant = await registerUser();
    const story = await createStory(author.token);
    const res = await api().post(`/api/stories/${story.id}/apply`).set(auth(applicant.token)).send({ status: "approved", userId: "u_x" });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pending");
    expect(res.body.userId).toBe(applicant.user.id);
  });

  it("rejects notes > 2000 chars (400)", async () => {
    const author = await registerUser();
    const applicant = await registerUser();
    const story = await createStory(author.token);
    const res = await api().post(`/api/stories/${story.id}/apply`).set(auth(applicant.token)).send({ notes: "x".repeat(2001) });
    expect(res.status).toBe(400);
  });

  it("forbids applying to your own story (400)", async () => {
    const author = await registerUser();
    const story = await createStory(author.token);
    const res = await api().post(`/api/stories/${story.id}/apply`).set(auth(author.token)).send({});
    expect(res.status).toBe(400);
    expect(await Application.countDocuments()).toBe(0);
  });

  it("rejects a duplicate pending application (409) but allows reapplying after a decision", async () => {
    const author = await registerUser();
    const applicant = await registerUser();
    const admin = await registerAdmin();
    const story = await createStory(author.token);

    const first = await api().post(`/api/stories/${story.id}/apply`).set(auth(applicant.token)).send({});
    expect(first.status).toBe(201);
    const dup = await api().post(`/api/stories/${story.id}/apply`).set(auth(applicant.token)).send({});
    expect(dup.status).toBe(409);
    expect(await Application.countDocuments()).toBe(1);

    await api().patch(`/api/stories/applications/${first.body.id}`).set(auth(admin.token)).send({ status: "rejected" });
    const again = await api().post(`/api/stories/${story.id}/apply`).set(auth(applicant.token)).send({});
    expect(again.status).toBe(201);
  });

  it("returns 404 for a missing story and 401 without auth", async () => {
    const u = await registerUser();
    expect((await api().post("/api/stories/s_missing/apply").set(auth(u.token)).send({})).status).toBe(404);
    const story = await createStory(u.token);
    expect((await api().post(`/api/stories/${story.id}/apply`).send({})).status).toBe(401);
  });
});

describe("GET /api/stories/applications", () => {
  it("returns only the caller's applications for users and all for admins", async () => {
    const author = await registerUser();
    const a = await registerUser();
    const b = await registerUser();
    const admin = await registerAdmin();
    const story = await createStory(author.token);
    await api().post(`/api/stories/${story.id}/apply`).set(auth(a.token)).send({ notes: "a" });
    await api().post(`/api/stories/${story.id}/apply`).set(auth(b.token)).send({ notes: "b" });

    const asA = await api().get("/api/stories/applications").set(auth(a.token));
    expect(asA.status).toBe(200);
    expect(Array.isArray(asA.body)).toBe(true);
    expect(asA.body).toHaveLength(1);
    expect(asA.body[0]).toMatchObject({ userId: a.user.id, notes: "a" });
    expect(asA.body[0]).not.toHaveProperty("_id");

    const asAuthor = await api().get("/api/stories/applications").set(auth(author.token));
    expect(asAuthor.body).toEqual([]);

    const asAdmin = await api().get("/api/stories/applications").set(auth(admin.token));
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body).toHaveLength(2);
    expect(asAdmin.body.map((x: { userId: string }) => x.userId).sort()).toEqual([a.user.id, b.user.id].sort());
    for (const app of asAdmin.body) expect(app).not.toHaveProperty("_id");
  });

  it("requires auth", async () => {
    expect((await api().get("/api/stories/applications")).status).toBe(401);
  });
});

describe("PATCH /api/stories/applications/:id", () => {
  const setup = async () => {
    const author = await registerUser();
    const applicant = await registerUser();
    const admin = await registerAdmin();
    const story = await createStory(author.token);
    const app = await api().post(`/api/stories/${story.id}/apply`).set(auth(applicant.token)).send({});
    return { author, applicant, admin, appId: app.body.id as string };
  };

  it("forbids non-admins (403), including the applicant and story author", async () => {
    const ctx = await setup();
    for (const who of [ctx.applicant, ctx.author]) {
      const res = await api().patch(`/api/stories/applications/${ctx.appId}`).set(auth(who.token)).send({ status: "approved" });
      expect(res.status).toBe(403);
    }
    expect((await Application.findOne({ id: ctx.appId }).lean())!.status).toBe("pending");
  });

  it("requires auth", async () => {
    const ctx = await setup();
    expect((await api().patch(`/api/stories/applications/${ctx.appId}`).send({ status: "approved" })).status).toBe(401);
  });

  it.each([["bogus"], [""], [undefined], ["APPROVED"]])("rejects invalid status %j (400)", async (status) => {
    const ctx = await setup();
    const res = await api().patch(`/api/stories/applications/${ctx.appId}`).set(auth(ctx.admin.token)).send({ status });
    expect(res.status).toBe(400);
    expect((await Application.findOne({ id: ctx.appId }).lean())!.status).toBe("pending");
  });

  it.each(["approved", "rejected", "pending"])("updates status to %s", async (status) => {
    const ctx = await setup();
    const res = await api().patch(`/api/stories/applications/${ctx.appId}`).set(auth(ctx.admin.token)).send({ status });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: ctx.appId, status, userId: ctx.applicant.user.id });
    expect(res.body).not.toHaveProperty("_id");
    expect((await Application.findOne({ id: ctx.appId }).lean())!.status).toBe(status);
  });

  it("returns 404 for a missing application", async () => {
    const admin = await registerAdmin();
    const res = await api().patch("/api/stories/applications/app_missing").set(auth(admin.token)).send({ status: "approved" });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

describe("POST /api/stories/contact", () => {
  const valid = { name: "Visitor", email: "visitor@void.test", message: "Hello from beyond" };

  it("accepts submissions without auth (201)", async () => {
    const res = await api().post("/api/stories/contact").send(valid);
    expect(res.status).toBe(201);
    expect(res.body.message).toEqual(expect.any(String));
    const stored = await ContactSubmission.findOne().lean();
    expect(stored).toMatchObject(valid);
    expect(stored!.userId).toBeUndefined();
  });

  it("records the userId when authenticated, and tolerates an invalid token", async () => {
    const u = await registerUser();
    const authed = await api().post("/api/stories/contact").set(auth(u.token)).send(valid);
    expect(authed.status).toBe(201);
    expect((await ContactSubmission.findOne({ userId: u.user.id }).lean())).not.toBeNull();

    const bad = await api().post("/api/stories/contact").set("Authorization", "Bearer garbage").send(valid);
    expect(bad.status).toBe(201);
  });

  it.each([
    ["bad email", { ...valid, email: "not-an-email" }],
    ["empty message", { ...valid, message: "" }],
    ["whitespace message", { ...valid, message: "   " }],
    ["missing name", { email: valid.email, message: valid.message }],
    ["message too long", { ...valid, message: "x".repeat(5001) }],
  ])("rejects %s (400)", async (_label, body) => {
    const res = await api().post("/api/stories/contact").send(body);
    expect(res.status).toBe(400);
    expect(await ContactSubmission.countDocuments()).toBe(0);
  });
});

describe("GET /api/stories/contacts", () => {
  it("is admin-only", async () => {
    const u = await registerUser();
    expect((await api().get("/api/stories/contacts")).status).toBe(401);
    expect((await api().get("/api/stories/contacts").set(auth(u.token))).status).toBe(403);
  });

  it("lists submissions for admins without _id", async () => {
    const admin = await registerAdmin();
    await api().post("/api/stories/contact").send({ name: "One", email: "one@void.test", message: "m1" });
    await api().post("/api/stories/contact").send({ name: "Two", email: "two@void.test", message: "m2" });
    const res = await api().get("/api/stories/contacts").set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((c: { name: string }) => c.name).sort()).toEqual(["One", "Two"]);
    for (const c of res.body) expect(c).not.toHaveProperty("_id");
  });
});
