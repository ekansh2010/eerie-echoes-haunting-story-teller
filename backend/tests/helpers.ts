import request from "supertest";
import { createApp } from "../src/app";
import { User, Story } from "../src/models";
import { testOutbox } from "../src/services/email.service";

/** App under test: DB is connected by tests/setup.ts, no static hosting. */
export const app = createApp({ staticDir: null, autoConnect: false });

export const api = () => request(app);

let counter = 0;

export interface TestUser {
  token: string;
  user: { id: string; username: string; email: string; role: string; isVerified: boolean; avatar: string; createdAt: string };
  password: string;
}

export const registerUser = async (overrides: Partial<{ username: string; email: string; password: string }> = {}): Promise<TestUser> => {
  counter += 1;
  const body = {
    username: overrides.username ?? `ghost_${counter}`,
    email: overrides.email ?? `ghost${counter}@void.test`,
    password: overrides.password ?? "Spooky123",
  };
  const res = await api().post("/api/auth/register").send(body);
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.token, user: res.body.user, password: body.password };
};

/** Registers a user and promotes them to admin directly in the DB. */
export const registerAdmin = async (): Promise<TestUser> => {
  const admin = await registerUser();
  await User.updateOne({ id: admin.user.id }, { role: "admin" });
  return { ...admin, user: { ...admin.user, role: "admin" } };
};

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export const createStory = async (
  token: string,
  overrides: Partial<{ title: string; content: string; category: string; coverImage: string }> = {},
) => {
  const res = await api()
    .post("/api/stories")
    .set(auth(token))
    .send({ title: "The Hollow", content: "Something knocks.", category: "Paranormal", ...overrides });
  if (res.status !== 201) throw new Error(`createStory failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { id: string; authorId: string; title: string };
};

/** Inserts a story directly with a fixed createdAt (for ordering/pagination tests). */
export const insertStory = (fields: Partial<{ id: string; title: string; content: string; category: string; authorId: string; createdAt: string }>) =>
  Story.create({ id: `s_${Math.random().toString(36).slice(2)}`, title: "T", content: "C", category: "Paranormal", authorId: "nobody", createdAt: "2026-01-01", ...fields });

/** Extracts the raw token from the last captured email link. */
export const lastEmailToken = (): string => {
  const mail = testOutbox.at(-1);
  if (!mail) throw new Error("no email captured");
  return new URL(mail.link).searchParams.get("token")!;
};

/** Minimal valid image buffers (magic bytes) for upload tests. */
export const PNG_BYTES = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a0d20000000049454e44ae426082",
  "hex",
);
export const GIF_BYTES = Buffer.from("47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b", "hex");
