import crypto from "crypto";

/** Escapes a user-supplied string so it can be embedded literally in a RegExp. */
export const escapeRegex = (input: string): string => input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Generates a prefixed, collision-resistant public id, e.g. `s_9f2c...`. */
export const generateId = (prefix: string): string => `${prefix}_${crypto.randomBytes(12).toString("hex")}`;

/** Random URL-safe token for email links (sent to the user, never stored raw). */
export const generateToken = (): string => crypto.randomBytes(32).toString("hex");

/** One-way hash used to store email/reset tokens at rest. */
export const hashToken = (token: string): string => crypto.createHash("sha256").update(token).digest("hex");

/** `YYYY-MM-DD` — date format used for stories and users (kept for frontend compatibility). */
export const today = (): string => new Date().toISOString().split("T")[0];

/** `YYYY-MM-DD HH:MM:SS` (UTC) — timestamp format used for comments. */
export const nowTimestamp = (): string => new Date().toISOString().replace("T", " ").split(".")[0];

/** Case-insensitive collation used for unique-ish lookups (email/username/category). */
export const CASE_INSENSITIVE = { locale: "en", strength: 2 } as const;

/** bcrypt work factor — lowered only under test to keep the suite fast. */
export const BCRYPT_ROUNDS = process.env.NODE_ENV === "test" ? 4 : 12;
