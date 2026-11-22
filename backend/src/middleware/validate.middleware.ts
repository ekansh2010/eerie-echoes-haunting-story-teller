import { Request, Response, NextFunction } from "express";
import { ZodTypeAny } from "zod";

type Source = "body" | "query" | "params";

/**
 * Validates and *replaces* the given request part with the parsed (coerced,
 * trimmed, stripped-of-unknown-keys) value. ZodErrors are formatted by the
 * central error handler.
 */
export const validate =
  (schema: ZodTypeAny, source: Source = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) return next(result.error);
    // Express 5 exposes req.query as a getter, so redefine it rather than assign.
    Object.defineProperty(req, source, { value: result.data, writable: true, enumerable: true, configurable: true });
    next();
  };
