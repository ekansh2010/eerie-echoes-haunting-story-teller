import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { seedDatabase } from "./seed.js";

/**
 * Serverless-safe connection cache. On Vercel each warm function instance
 * reuses the same promise instead of opening a new connection per request.
 */
let connectionPromise: Promise<typeof mongoose> | null = null;

export const connectDb = async (uri: string = env.MONGODB_URI): Promise<typeof mongoose> => {
  // Await the in-flight promise (connect + seed) so early requests never race seeding.
  if (connectionPromise) return connectionPromise;
  if (mongoose.connection.readyState === 1) return mongoose;

  mongoose.set("strictQuery", true);
  connectionPromise = mongoose
    .connect(uri, { serverSelectionTimeoutMS: 10_000, maxPoolSize: 10 })
    .then(async (conn) => {
      logger.info("Connected to MongoDB");
      await seedDatabase();
      return conn;
    })
    .catch((err) => {
      // Reset so the next request can retry instead of being stuck on a rejected promise.
      connectionPromise = null;
      throw err;
    });
  return connectionPromise;
};

export const disconnectDb = async (): Promise<void> => {
  connectionPromise = null;
  await mongoose.disconnect();
};

export const isDbConnected = (): boolean => mongoose.connection.readyState === 1;

/**
 * Health-check helper. After a serverless instance is frozen and thawed the
 * driver may be mid-reconnect (readyState 0/2) for a moment; queries simply
 * buffer, so give the connection a short window before reporting "down".
 */
export const waitForDb = async (timeoutMs = 5000): Promise<boolean> => {
  if (isDbConnected()) return true;
  try {
    await connectDb();
  } catch {
    return false;
  }
  if (isDbConnected()) return true;
  return new Promise<boolean>((resolve) => {
    const onConnected = () => {
      clearTimeout(timer);
      resolve(true);
    };
    const timer = setTimeout(() => {
      mongoose.connection.off("connected", onConnected);
      resolve(isDbConnected());
    }, timeoutMs);
    mongoose.connection.once("connected", onConnected);
  });
};
