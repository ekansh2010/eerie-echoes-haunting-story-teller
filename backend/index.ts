import path from "path";
import { fileURLToPath } from "url";
import { env } from "./src/config/env";
import { createApp } from "./src/app";
import { connectDb, disconnectDb } from "./src/database/connection";
import { logger } from "./src/utils/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Single-server mode also serves the built React app from frontend/dist. */
const app = createApp({ staticDir: path.join(__dirname, "../frontend/dist") });

const isDirectRun = !process.env.VERCEL && process.env.NODE_ENV !== "test";

if (isDirectRun) {
  const server = app.listen(env.PORT, () => {
    logger.info(`[Eerie Echoes Server] whispering on port ${env.PORT}...`);
  });

  // Connect eagerly at boot (requests also lazily ensure a connection).
  connectDb().catch((err) => logger.error("Initial MongoDB connection failed; will retry on demand", err));

  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await disconnectDb().catch(() => undefined);
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => logger.error("Unhandled promise rejection", reason));
}

export default app;
