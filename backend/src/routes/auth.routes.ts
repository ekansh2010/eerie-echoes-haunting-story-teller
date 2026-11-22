import { Router } from "express";
import {
  forgotPassword,
  login,
  me,
  register,
  resendVerification,
  resetPasswordConfirm,
  updateAvatar,
  verifyEmailToken,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authLimiter, emailLimiter } from "../middleware/rateLimit.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  avatarSchema,
  emailOnlySchema,
  loginSchema,
  registerSchema,
  resetPasswordConfirmSchema,
  tokenSchema,
} from "../validation/auth.validation";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.get("/me", authenticate, me);

// Email verification: /verify (auth) re-sends the link, /verify-token consumes it.
router.post("/verify", emailLimiter, authenticate, resendVerification);
router.post("/verify-token", authLimiter, validate(tokenSchema), verifyEmailToken);

// Password reset: request a link, then confirm with the emailed token.
router.post("/forgot-password", emailLimiter, validate(emailOnlySchema), forgotPassword);
router.post("/reset-password", emailLimiter, validate(emailOnlySchema), forgotPassword); // legacy alias
router.post("/reset-password-confirm", authLimiter, validate(resetPasswordConfirmSchema), resetPasswordConfirm);

router.patch("/avatar", authenticate, validate(avatarSchema), updateAvatar);

export default router;
