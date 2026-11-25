import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../../src/config/env";
import { Story, Upload } from "../../src/models";
import {
  aiCoverUploadId,
  describeScene,
  fallbackScenePrompt,
  generateStoryCover,
} from "../../src/services/aiCover.service";
import { api, auth, createStory, registerAdmin, registerUser, PNG_BYTES } from "../helpers";

// waitUntil just runs the promise in tests; capture it so we can await generation.
const pending: Promise<unknown>[] = [];
vi.mock("@vercel/functions", () => ({ waitUntil: (p: Promise<unknown>) => pending.push(p) }));

const flush = async () => {
  await Promise.all(pending.splice(0));
};

const imageResponse = () => new Response(new Uint8Array(PNG_BYTES), { status: 200, headers: { "Content-Type": "image/png" } });

const STORY = {
  title: "The Lighthouse Keeper's Daughter",
  content: "Every night the lamp turned toward the drowned village beneath the bay, and every night a pale girl climbed the stairs.",
  category: "Paranormal",
};

describe("AI story covers", () => {
  const original = { enabled: env.AI_COVERS_ENABLED, key: env.ANTHROPIC_API_KEY };

  beforeEach(() => {
    env.AI_COVERS_ENABLED = true;
    env.ANTHROPIC_API_KEY = undefined; // no Claude by default: exercises the fallback prompt
  });

  afterEach(() => {
    env.AI_COVERS_ENABLED = original.enabled;
    env.ANTHROPIC_API_KEY = original.key;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    pending.length = 0;
  });

  it("creates the story immediately with a placeholder, then stores a permanent AI cover in MongoDB", async () => {
    const fetchMock = vi.fn().mockResolvedValue(imageResponse());
    vi.stubGlobal("fetch", fetchMock);
    const u = await registerUser();

    const res = await api().post("/api/stories").set(auth(u.token)).send(STORY);
    expect(res.status).toBe(201);
    expect(res.body.coverStatus).toBe("generating");
    expect(res.body.coverImage).toMatch(/^https:\/\/image\.pollinations\.ai\//);

    await flush();

    const story = await Story.findOne({ id: res.body.id }).lean();
    expect(story?.coverStatus).toBe("ready");
    expect(story?.coverImage).toMatch(/^\/api\/uploads\/ai_[a-f0-9]+$/);
    expect(story?.coverPrompt).toContain("Lighthouse Keeper");

    // The image prompt was built from the story text, not just the title.
    const requested = decodeURIComponent(String(fetchMock.mock.calls[0][0]));
    expect(requested).toContain("drowned village");

    // Stored bytes are served from our own API.
    const img = await api().get(story!.coverImage);
    expect(img.status).toBe(200);
    expect(img.headers["content-type"]).toBe("image/png");
  });

  it("keeps an author-supplied cover and never calls the image API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const u = await registerUser();

    const res = await api().post("/api/stories").set(auth(u.token)).send({ ...STORY, coverImage: "https://example.com/mine.png" });
    await flush();

    expect(res.body.coverStatus).toBe("none");
    expect(res.body.coverImage).toBe("https://example.com/mine.png");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("marks the cover failed (keeping the placeholder) when the image API is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("busy", { status: 503 })));
    const u = await registerUser();

    const res = await api().post("/api/stories").set(auth(u.token)).send(STORY);
    await flush();

    const story = await Story.findOne({ id: res.body.id }).lean();
    expect(story?.coverStatus).toBe("failed");
    expect(story?.coverImage).toBe(res.body.coverImage);
    expect(await Upload.countDocuments()).toBe(0);
  });

  it("retries when the image API is briefly overloaded", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("slow down", { status: 429 }))
      .mockResolvedValueOnce(imageResponse());
    vi.stubGlobal("fetch", fetchMock);
    const u = await registerUser();

    const res = await api().post("/api/stories").set(auth(u.token)).send(STORY);
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((await Story.findOne({ id: res.body.id }).lean())?.coverStatus).toBe("ready");
  });

  it("does not retry a 4xx client error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("bad", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    const u = await registerUser();
    const res = await api().post("/api/stories").set(auth(u.token)).send(STORY);
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await Story.findOne({ id: res.body.id }).lean())?.coverStatus).toBe("failed");
  });

  it("rejects a non-image response from the image API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>oops</html>", { status: 200 })));
    const u = await registerUser();
    const s = await createStory(u.token, STORY);
    await Story.updateOne({ id: s.id }, { coverStatus: "generating" });

    expect(await generateStoryCover(s.id)).toBe("failed");
  });

  it("does not overwrite a story that no longer wants an AI cover", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse()));
    const u = await registerUser();
    const s = await createStory(u.token, { ...STORY, coverImage: "https://example.com/mine.png" });

    expect(await generateStoryCover(s.id)).toBe("none");
    expect((await Story.findOne({ id: s.id }).lean())?.coverImage).toBe("https://example.com/mine.png");
    expect(await Upload.countDocuments()).toBe(0);
  });

  describe("GET/POST /api/stories/:id/cover", () => {
    it("reports cover status without counting a view", async () => {
      const u = await registerUser();
      const s = await createStory(u.token, STORY);
      const before = (await Story.findOne({ id: s.id }).lean())!.views;

      const res = await api().get(`/api/stories/${s.id}/cover`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ coverImage: expect.any(String), coverStatus: expect.any(String) });
      expect((await Story.findOne({ id: s.id }).lean())!.views).toBe(before);
    });

    it("404s for an unknown story", async () => {
      expect((await api().get("/api/stories/nope/cover")).status).toBe(404);
    });

    it("lets the author repaint, replacing the cover", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse()));
      const u = await registerUser();
      const s = await createStory(u.token, { ...STORY, coverImage: "https://example.com/old.png" });

      const res = await api().post(`/api/stories/${s.id}/cover`).set(auth(u.token));
      expect(res.status).toBe(202);
      await flush();

      const story = await Story.findOne({ id: s.id }).lean();
      expect(story?.coverStatus).toBe("ready");
      expect(story?.coverImage).toMatch(/^\/api\/uploads\/ai_/);
    });

    it("lets an admin repaint but forbids other users", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse()));
      const author = await registerUser();
      const other = await registerUser();
      const admin = await registerAdmin();
      const s = await createStory(author.token, { ...STORY, coverImage: "https://example.com/old.png" });

      expect((await api().post(`/api/stories/${s.id}/cover`).set(auth(other.token))).status).toBe(403);
      expect((await api().post(`/api/stories/${s.id}/cover`)).status).toBe(401);
      expect((await api().post(`/api/stories/${s.id}/cover`).set(auth(admin.token))).status).toBe(202);
      await flush();
    });

    it("returns 503 when AI covers are disabled", async () => {
      env.AI_COVERS_ENABLED = false;
      const u = await registerUser();
      const s = await createStory(u.token, STORY);
      expect((await api().post(`/api/stories/${s.id}/cover`).set(auth(u.token))).status).toBe(503);
    });
  });

  it("deletes the stored AI image when the story is deleted", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse()));
    const u = await registerUser();
    const res = await api().post("/api/stories").set(auth(u.token)).send(STORY);
    await flush();
    expect(await Upload.countDocuments()).toBe(1);

    expect((await api().delete(`/api/stories/${res.body.id}`).set(auth(u.token))).status).toBe(200);
    expect(await Upload.countDocuments()).toBe(0);
  });
});

describe("describeScene (Claude)", () => {
  const originalKey = env.ANTHROPIC_API_KEY;
  afterEach(() => {
    env.ANTHROPIC_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it("returns null without an API key so the fallback prompt is used", async () => {
    env.ANTHROPIC_API_KEY = undefined;
    expect(await describeScene("t", "Paranormal", "c")).toBeNull();
  });

  it("uses Claude's scene description and treats refusals as no description", async () => {
    env.ANTHROPIC_API_KEY = "sk-ant-test";
    const create = vi.spyOn(Anthropic.Beta.Messages.prototype, "create");

    create.mockResolvedValueOnce({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "A fog-choked lighthouse at night, a pale girl on the spiral stair." }],
    } as never);
    expect(await describeScene(STORY.title, STORY.category, STORY.content)).toMatch(/^A fog-choked lighthouse.*no text$/);

    const request = create.mock.calls[0][0] as { model: string; system: string; messages: { content: string }[] };
    expect(request.model).toBe(env.AI_COVER_MODEL);
    expect(request.messages[0].content).toContain(STORY.content);

    create.mockResolvedValueOnce({ stop_reason: "refusal", stop_details: { category: null }, content: [] } as never);
    expect(await describeScene(STORY.title, STORY.category, STORY.content)).toBeNull();

    create.mockRejectedValueOnce(new Error("network down"));
    expect(await describeScene(STORY.title, STORY.category, STORY.content)).toBeNull();
  });
});

describe("helpers", () => {
  it("builds a fallback prompt from title, category and opening lines", () => {
    const p = fallbackScenePrompt("The Hollow", "Urban Legends", "  The   tree  whispered.\n\nAgain. ");
    expect(p).toContain('"The Hollow"');
    expect(p).toContain("Urban Legends");
    expect(p).toContain("The tree whispered. Again.");
  });

  it("recognises only AI cover upload ids", () => {
    expect(aiCoverUploadId("/api/uploads/ai_abc123")).toBe("ai_abc123");
    expect(aiCoverUploadId("/api/uploads/img_abc123")).toBeNull();
    expect(aiCoverUploadId("https://image.pollinations.ai/prompt/x")).toBeNull();
  });
});
