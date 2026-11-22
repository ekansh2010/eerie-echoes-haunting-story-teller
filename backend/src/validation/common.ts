import { z } from "zod";

/**
 * Image references we accept from clients: absolute http(s) URLs, our own
 * uploads, or bundled static images. Blocks `javascript:`/`data:` and other
 * schemes that could be abused when rendered.
 */
export const imageUrl = z
  .string()
  .trim()
  .max(2048, "Image URL is too long")
  .refine(
    (v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v) || /^\/(api\/uploads|images)\/[^\s]*$/.test(v),
    "Image must be an http(s) URL or an uploaded image",
  );

export const idParam = z.object({ id: z.string().trim().min(1).max(100) });

export const commentParams = idParam.extend({ commentId: z.string().trim().min(1).max(100) });
