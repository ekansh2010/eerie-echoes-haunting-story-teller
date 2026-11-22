import { Router } from "express";
import { banUser, getAdminStats, getUsers, toggleFeatureStory } from "../controllers/admin.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParam } from "../validation/common.js";

const router = Router();

// Every admin endpoint requires a valid token AND the admin role.
router.use(authenticate, requireAdmin);

router.get("/stats", getAdminStats);
router.get("/users", getUsers);
router.delete("/users/:id", validate(idParam, "params"), banUser);
router.post("/stories/:id/feature", validate(idParam, "params"), toggleFeatureStory);

export default router;
