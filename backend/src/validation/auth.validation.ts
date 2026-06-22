import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
  const schema = z.object({
    username: z.string().min(1, "Username is required"),
    email: z.string().email("Email must be valid"),
    password: z.string().min(6, "Password must be at least 6 characters long")
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }
  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const schema = z.object({
    email: z.string().email("Email must be valid"),
    password: z.string().min(1, "Password is required")
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }
  next();
};
