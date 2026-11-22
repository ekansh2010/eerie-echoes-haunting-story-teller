import { z } from "zod";
import { imageUrl } from "./common.js";

export const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(128, "Password must be at most 128 characters long")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/\d/, "Password must contain at least one number");

const email = z.string().trim().toLowerCase().email("Email must be valid").max(254);

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[A-Za-z0-9_.-]+$/, "Username may only contain letters, numbers, '_', '.' and '-'"),
  email,
  password: passwordRule,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(128),
});

export const emailOnlySchema = z.object({ email });

export const tokenSchema = z.object({
  token: z.string().trim().regex(/^[a-f0-9]{64}$/i, "Token is invalid"),
});

export const resetPasswordConfirmSchema = z.object({
  token: z.string().trim().min(1, "Token and new password are required."),
  newPassword: passwordRule,
});

export const avatarSchema = z.object({
  avatar: imageUrl.refine((v) => v.length > 0, "Avatar URL is required."),
});
