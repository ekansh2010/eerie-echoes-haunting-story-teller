import { describe, expect, it } from "vitest";
import { Upload } from "../../src/models";
import { MAX_UPLOAD_BYTES } from "../../src/services/upload.service";
import { api, auth, GIF_BYTES, PNG_BYTES, registerUser } from "../helpers";

const binaryParser = (res: NodeJS.ReadableStream & { setEncoding: (e: string) => void }, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on("data", (c: Buffer) => chunks.push(Buffer.from(c)));
  res.on("end", () => cb(null, Buffer.concat(chunks)));
};

describe("POST /api/upload", () => {
  it("requires authentication", async () => {
    const res = await api().post("/api/upload").attach("image", PNG_BYTES, "a.png");
    expect(res.status).toBe(401);
    expect(await Upload.countDocuments()).toBe(0);
  });

  it.each([
    ["png", PNG_BYTES, "a.png", "image/png"],
    ["gif", GIF_BYTES, "a.gif", "image/gif"],
  ])("accepts a %s and serves back the exact bytes", async (_label, bytes, filename, contentType) => {
    const user = await registerUser();
    const res = await api().post("/api/upload").set(auth(user.token)).attach("image", bytes, filename);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: expect.any(String), url: expect.stringMatching(/^\/api\/uploads\/img_[a-f0-9]{24}$/) });

    const stored = await Upload.findOne({ id: res.body.url.split("/").pop() }).lean();
    expect(stored).toMatchObject({ ownerId: user.user.id, contentType, size: bytes.length });

    const get = await api().get(res.body.url).buffer(true).parse(binaryParser as never);
    expect(get.status).toBe(200);
    expect(get.headers["content-type"]).toBe(contentType);
    expect(get.headers["x-content-type-options"]).toBe("nosniff");
    expect(get.headers["cache-control"]).toMatch(/max-age=31536000/);
    expect(get.headers["cache-control"]).toMatch(/immutable/);
    expect(Buffer.isBuffer(get.body)).toBe(true);
    expect((get.body as Buffer).equals(bytes)).toBe(true);
  });

  it("detects the type from content, ignoring the filename (png named .gif)", async () => {
    const user = await registerUser();
    const res = await api().post("/api/upload").set(auth(user.token)).attach("image", PNG_BYTES, { filename: "x.gif", contentType: "image/gif" });
    expect(res.status).toBe(201);
    const get = await api().get(res.body.url);
    expect(get.headers["content-type"]).toBe("image/png");
  });

  it("rejects a spoofed file (text content claiming to be image/png)", async () => {
    const user = await registerUser();
    const res = await api()
      .post("/api/upload")
      .set(auth(user.token))
      .attach("image", Buffer.from("<script>alert(1)</script>"), { filename: "evil.png", contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/jpg|png|gif|webp/i);
    expect(await Upload.countDocuments()).toBe(0);
  });

  it("rejects a request with no file (400)", async () => {
    const user = await registerUser();
    const res = await api().post("/api/upload").set(auth(user.token)).field("note", "nothing here");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No file uploaded/);
  });

  it("rejects a non-multipart request with no file (400)", async () => {
    const user = await registerUser();
    const res = await api().post("/api/upload").set(auth(user.token)).send({});
    expect(res.status).toBe(400);
  });

  it("rejects the wrong field name (400)", async () => {
    const user = await registerUser();
    const res = await api().post("/api/upload").set(auth(user.token)).attach("file", PNG_BYTES, "a.png");
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
    expect(await Upload.countDocuments()).toBe(0);
  });

  it("rejects files over 4MB with 413", async () => {
    const user = await registerUser();
    const big = Buffer.concat([PNG_BYTES, Buffer.alloc(MAX_UPLOAD_BYTES + 1 - PNG_BYTES.length + 10)]);
    const res = await api().post("/api/upload").set(auth(user.token)).attach("image", big, "big.png");
    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/Upload error/);
    expect(await Upload.countDocuments()).toBe(0);
  });
});

describe("GET /api/uploads/:id", () => {
  it("returns 404 JSON for an unknown id", async () => {
    const res = await api().get("/api/uploads/img_doesnotexist");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it("is public (no auth needed) and sets a sandboxing CSP", async () => {
    const user = await registerUser();
    const up = await api().post("/api/upload").set(auth(user.token)).attach("image", PNG_BYTES, "a.png");
    const res = await api().get(up.body.url);
    expect(res.status).toBe(200);
    expect(res.headers["content-security-policy"]).toMatch(/sandbox/);
  });
});
