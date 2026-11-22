import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import multer from "multer";
import { HttpError } from "../utils/httpError.js";
import { logger } from "../utils/logger.js";

/** JSON 404 for unknown API routes (instead of falling through to the SPA). */
export const apiNotFound = (req: Request, _res: Response, next: NextFunction) => {
  next(HttpError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

const isBodyParserError = (err: unknown): err is { type: string; status: number } =>
  typeof err === "object" && err !== null && "type" in err && "status" in err;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return;

  if (err instanceof HttpError) {
    return res.status(err.status).json(err.details ? { error: err.message, details: err.details } : { error: err.message });
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return res.status(400).json({ error: err.issues[0]?.message ?? "Invalid request", details });
  }

  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({ error: `Upload error: ${err.message}` });
  }

  if (err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: err.message });
  }

  if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
    return res.status(409).json({ error: "Resource already exists" });
  }

  if (isBodyParserError(err)) {
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Malformed JSON body" });
    if (err.type === "entity.too.large") return res.status(413).json({ error: "Request body too large" });
  }

  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, err);
  return res.status(500).json({ error: "Internal server error" });
};
