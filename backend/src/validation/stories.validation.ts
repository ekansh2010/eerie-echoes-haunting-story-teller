import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const validateCreateStory = (req: Request, res: Response, next: NextFunction) => {
  const schema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    category: z.string().min(1, "Category is required"),
    coverImage: z.string().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }
  next();
};

export const validateComment = (req: Request, res: Response, next: NextFunction) => {
  const schema = z.object({
    text: z.string().trim().min(1, "Whisper text cannot be empty")
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }
  next();
};
