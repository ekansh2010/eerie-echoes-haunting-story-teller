import rateLimit, { Options } from "express-rate-limit";
import { RequestHandler } from "express";
import { env } from "../config/env.js";

const passthrough: RequestHandler = (_req, _res, next) => next();

const limiter = (options: Partial<Options>): RequestHandler =>
  env.RATE_LIMIT_ENABLED
    ? rateLimit({
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: { error: "Too many requests. The spirits need rest — try again later." },
        ...options,
      })
    : passthrough;

/** Broad limit for every /api request. */
export const apiLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 600 });

/** Brute-force protection for credential endpoints. */
export const authLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 20, skipSuccessfulRequests: true });

/** Email-sending endpoints (forgot password, resend verification). */
export const emailLimiter = limiter({ windowMs: 60 * 60 * 1000, limit: 5 });

/** Public contact form spam guard. */
export const contactLimiter = limiter({ windowMs: 60 * 60 * 1000, limit: 10 });

/** Content creation (stories, comments, uploads). */
export const writeLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 100 });
