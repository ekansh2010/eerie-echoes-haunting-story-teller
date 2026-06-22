import { Router } from "express";
import { getAdminStats, getUsers, banUser, toggleFeatureStory } from "../controllers/admin.controller";
import { authenticateToken, requireAdmin } from "../middleware/auth.middleware";

const router = Router();

// Secure all admin endpoints
router.use(authenticateToken, requireAdmin);

router.get("/stats", getAdminStats);
router.get("/users", getUsers);
router.delete("/users/:id", banUser);
router.post("/stories/:id/feature", toggleFeatureStory);

export default router;
