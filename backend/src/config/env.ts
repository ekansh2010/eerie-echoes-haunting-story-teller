import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true });

const booleanFromEnv = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? fallback : ["1", "true", "yes", "on"].includes(v.toLowerCase())));

const DEV_JWT_SECRET = "dev-only-insecure-jwt-secret-change-me";
const KNOWN_WEAK_SECRETS = new Set([DEV_JWT_SECRET, "haunting_eerie_echoes_secret_key_666"]);

const nodeEnv = (process.env.NODE_ENV || "development") as "development" | "production" | "test";
const isProduction = nodeEnv === "production";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/eerie_echoes"),
  JWT_SECRET: z.string().min(1).default(DEV_JWT_SECRET),
  JWT_EXPIRES_IN: z.string().default("7d"),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  CORS_ORIGIN: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('"Eerie Echoes" <noreply@eerieechoes.com>'),
  ADMIN_USERNAME: z.string().default("DarkScribe"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  SEED_DEMO_DATA: booleanFromEnv(!isProduction),
  RATE_LIMIT_ENABLED: booleanFromEnv(nodeEnv !== "test"),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "silent"]).default(nodeEnv === "test" ? "silent" : "info"),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Parses and validates process.env. Fails fast in production when critical
 * secrets are missing or left at insecure defaults.
 */
export const loadEnv = (source: NodeJS.ProcessEnv = process.env): Env => {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  const env = parsed.data;

  if (env.NODE_ENV === "production") {
    if (!source.MONGODB_URI) throw new Error("MONGODB_URI must be set in production");
    if (!source.JWT_SECRET || KNOWN_WEAK_SECRETS.has(env.JWT_SECRET)) {
      throw new Error("JWT_SECRET must be set to a strong, unique value in production");
    }
  }
  return env;
};

export const env: Env = loadEnv();

export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
