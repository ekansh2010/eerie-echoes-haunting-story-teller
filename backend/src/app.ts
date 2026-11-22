import express, { Express, Request, Response, NextFunction } from "express";
import cors, { CorsOptions } from "cors";
import helmet from "helmet";
import compression from "compression";
import fs from "fs";
import path from "path";
import { env, isProd, isTest } from "./config/env.js";
import { connectDb, isDbConnected } from "./database/connection.js";
import authRoutes from "./routes/auth.routes.js";
import storyRoutes from "./routes/stories.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import audioRoutes from "./routes/audio.routes.js";
import { uploadRouter, serveUploadRouter } from "./routes/upload.routes.js";
import { apiLimiter } from "./middleware/rateLimit.middleware.js";
import { apiNotFound, errorHandler } from "./middleware/error.middleware.js";
import { logger } from "./utils/logger.js";

export interface AppOptions {
  /** Directory of the built frontend to serve (SPA). Omit to disable. */
  staticDir?: string | null;
  /** Ensure a DB connection before each API request (serverless-friendly). */
  autoConnect?: boolean;
}

const buildCorsOptions = (): CorsOptions => {
  if (env.CORS_ORIGIN) {
    const allowed = env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);
    return { origin: allowed.includes("*") ? true : allowed };
  }
  // Production default: same-origin only (frontend and API share a domain on Vercel).
  return { origin: !isProd };
};

const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`);
  });
  next();
};

export const createApp = (options: AppOptions = {}): Express => {
  const { staticDir = null, autoConnect = true } = options;
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY); // correct client IPs behind Vercel/NGINX for rate limiting

  app.use(
    helmet({
      // The SPA loads remote AI cover art and fonts; CSP is left to the hosting layer.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(cors(buildCorsOptions()));
  app.use(compression());
  if (!isTest) app.use(requestLogger);
  app.use(express.json({ limit: "200kb" }));
  app.use(express.urlencoded({ extended: false, limit: "200kb" }));

  // Health checks (both paths, since Vercel only routes /api/* to the function).
  const health = (_req: Request, res: Response) => {
    const db = isDbConnected();
    res.status(db ? 200 : 503).json({ status: db ? "alive in the void" : "degraded", db: db ? "connected" : "disconnected", time: new Date().toISOString() });
  };
  app.get("/health", health);
  app.get("/api/health", health);

  app.use("/api", apiLimiter);
  if (autoConnect) {
    app.use("/api", async (_req, _res, next) => {
      try {
        await connectDb();
        next();
      } catch (err) {
        logger.error("Database unavailable", err);
        next(Object.assign(new Error("Database unavailable"), { status: 503 }));
      }
    });
  }

  app.use("/api/auth", authRoutes);
  app.use("/api/stories", storyRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/upload", uploadRouter);
  app.use("/api/uploads", serveUploadRouter);
  app.use("/api/audio-tracks", audioRoutes);
  app.use("/api", apiNotFound);

  // Optional SPA hosting for single-server deployments (Docker/Render/Railway).
  if (staticDir && fs.existsSync(path.join(staticDir, "index.html"))) {
    app.use(express.static(staticDir, { index: false, maxAge: isProd ? "1h" : 0 }));
    app.get("/*splat", (_req, res) => res.sendFile(path.join(staticDir, "index.html")));
  }

  // 503 for DB outages, everything else via the central handler.
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof Error && (err as Error & { status?: number }).status === 503 && err.message === "Database unavailable") {
      return res.status(503).json({ error: "Service temporarily unavailable. Please try again." });
    }
    next(err);
  });
  app.use(errorHandler);

  return app;
};
