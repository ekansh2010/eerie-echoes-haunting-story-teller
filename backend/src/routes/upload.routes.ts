import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { Upload } from "../models/index.js";
import { authenticate, currentUser } from "../middleware/auth.middleware.js";
import { writeLimiter } from "../middleware/rateLimit.middleware.js";
import { MAX_UPLOAD_BYTES, sniffImageType } from "../services/upload.service.js";
import { HttpError } from "../utils/httpError.js";
import { generateId } from "../utils/helpers.js";

/**
 * Images are stored in MongoDB (not on local disk) so uploads survive
 * restarts/redeploys and work on read-only serverless filesystems.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

export const uploadRouter = Router();

// POST /api/upload  (multipart, field name "image")
uploadRouter.post(
  "/",
  authenticate,
  writeLimiter,
  (req: Request, res: Response, next: NextFunction) => upload.single("image")(req, res, next),
  async (req: Request, res: Response) => {
    if (!req.file) throw HttpError.badRequest("No file uploaded. Please upload a file with fieldname 'image'.");

    const contentType = sniffImageType(req.file.buffer);
    if (!contentType) throw HttpError.badRequest("Only images of type jpg, jpeg, png, gif, or webp are allowed.");

    const id = generateId("img");
    await Upload.create({
      id,
      ownerId: currentUser(req).id,
      contentType,
      size: req.file.size,
      data: req.file.buffer,
    });
    res.status(201).json({ message: "File uploaded successfully", url: `/api/uploads/${id}` });
  },
);

export const serveUploadRouter = Router();

// GET /api/uploads/:id  — streams a stored image
serveUploadRouter.get("/:id", async (req, res) => {
  // Hydrated (not lean) so `data` is cast to a proper, exactly-sized Buffer.
  const file = await Upload.findOne({ id: req.params.id }, { contentType: 1, data: 1 });
  if (!file) throw HttpError.notFound("Image not found");
  res.set({
    "Content-Type": file.contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  });
  res.send(file.data);
});
