import { describe, expect, it } from "vitest";
import { sniffImageType } from "../../src/services/upload.service";
import { stripInternal, toPublicUser } from "../../src/services/serializers";
import { generateCoverUrl } from "../../src/services/story.service";
import { GIF_BYTES, PNG_BYTES } from "../helpers";

describe("sniffImageType", () => {
  it("detects jpeg", () => {
    expect(sniffImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]))).toBe("image/jpeg");
  });
  it("detects png", () => {
    expect(sniffImageType(PNG_BYTES)).toBe("image/png");
  });
  it("detects gif87a and gif89a", () => {
    expect(sniffImageType(GIF_BYTES)).toBe("image/gif");
    expect(sniffImageType(Buffer.from("GIF87a\x01\x00", "binary"))).toBe("image/gif");
  });
  it("detects webp", () => {
    const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x24, 0, 0, 0]), Buffer.from("WEBPVP8 ")]);
    expect(sniffImageType(webp)).toBe("image/webp");
  });
  it.each([
    ["empty", Buffer.alloc(0)],
    ["text", Buffer.from("<script>alert(1)</script>")],
    ["truncated png", PNG_BYTES.subarray(0, 7)],
    ["two jpeg bytes", Buffer.from([0xff, 0xd8])],
    ["RIFF but not WEBP", Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WAVE")])],
    ["GIF90a", Buffer.from("GIF90a")],
    ["svg", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
  ])("rejects %s", (_l, buf) => {
    expect(sniffImageType(buf)).toBeNull();
  });
});

describe("serializers", () => {
  it("toPublicUser keeps only public fields", () => {
    const raw = {
      _id: "mongo",
      __v: 0,
      id: "u_1",
      username: "Ghost",
      email: "g@void.test",
      avatar: undefined,
      role: "user" as const,
      createdAt: "2026-01-01",
      isVerified: undefined,
      passwordHash: "$2b$hash",
      verificationToken: "vt",
      verificationExpires: new Date(),
      resetPasswordToken: "rt",
      resetPasswordExpires: new Date(),
      tokenVersion: 3,
    };
    const pub = toPublicUser(raw as never);
    expect(pub).toEqual({ id: "u_1", username: "Ghost", email: "g@void.test", avatar: "", role: "user", createdAt: "2026-01-01", isVerified: false });
  });

  it("stripInternal removes _id and __v only", () => {
    expect(stripInternal({ _id: "x", __v: 1, id: "a", title: "t" })).toEqual({ id: "a", title: "t" });
    const input = { id: "b" };
    expect(stripInternal(input)).toEqual({ id: "b" });
  });
});

describe("generateCoverUrl", () => {
  it("is a pollinations URL with sanitised title and category", () => {
    const url = generateCoverUrl("The <Haunted> House! & \"stuff\"", "Paranormal");
    const parsed = new URL(url);
    expect(parsed.protocol).toBe("https:");
    expect(parsed.hostname).toBe("image.pollinations.ai");
    expect(parsed.pathname.startsWith("/prompt/")).toBe(true);
    const prompt = decodeURIComponent(parsed.pathname.slice("/prompt/".length));
    expect(prompt).toContain("The Haunted House  stuff");
    expect(prompt).not.toMatch(/[<>!&"]/);
    expect(prompt).toContain("Paranormal");
    expect(parsed.searchParams.get("width")).toBe("800");
    expect(parsed.searchParams.get("height")).toBe("450");
    expect(parsed.searchParams.get("seed")).toMatch(/^\d+$/);
  });

  it("truncates very long titles to 100 chars", () => {
    const url = generateCoverUrl("a".repeat(500), "Dark Fantasy");
    const prompt = decodeURIComponent(new URL(url).pathname.slice("/prompt/".length));
    expect(prompt).toContain("a".repeat(100));
    expect(prompt).not.toContain("a".repeat(101));
  });

  it("strips path/query characters so the URL cannot be broken out of", () => {
    const url = generateCoverUrl("../../x?y=1#z/", "Paranormal");
    const parsed = new URL(url);
    expect(parsed.hostname).toBe("image.pollinations.ai");
    expect(parsed.hash).toBe("");
    expect(parsed.searchParams.get("y")).toBeNull();
  });
});
