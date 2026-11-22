/** Upper bound below Vercel's 4.5 MB serverless request body limit. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
export type ImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/**
 * Detects the real image type from magic bytes. The client-supplied mimetype
 * and file extension are NOT trusted (they are trivial to spoof).
 */
export const sniffImageType = (buf: Buffer): ImageType | null => {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 6 && ["GIF87a", "GIF89a"].includes(buf.subarray(0, 6).toString("ascii"))) return "image/gif";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
};
