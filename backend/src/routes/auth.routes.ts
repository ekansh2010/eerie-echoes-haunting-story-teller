import { Router } from "express";
import { register, login, me, verifyEmail, resetPassword } from "../controllers/auth.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { validateRegister, validateLogin } from "../validation/auth.validation";

const router = Router();

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.get("/me", authenticateToken, me);
router.post("/verify", authenticateToken, verifyEmail);
router.post("/reset-password", resetPassword);

export default router;
