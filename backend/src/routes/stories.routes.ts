import { Router } from "express";
import {
  addComment,
  applyForAdoption,
  createStory,
  deleteComment,
  deleteStory,
  getApplications,
  getContacts,
  getStories,
  getStoryDetail,
  submitContact,
  toggleLike,
  updateApplicationStatus,
} from "../controllers/stories.controller.js";
import { authenticate, optionalAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { contactLimiter, writeLimiter } from "../middleware/rateLimit.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { commentParams, idParam } from "../validation/common.js";
import {
  applicationStatusSchema,
  applySchema,
  commentSchema,
  contactSchema,
  createStorySchema,
  listStoriesQuery,
} from "../validation/stories.validation.js";

const router = Router();

// Static paths must be registered before the "/:id" routes.
router.get("/", optionalAuth, validate(listStoriesQuery, "query"), getStories);
router.post("/", authenticate, writeLimiter, validate(createStorySchema), createStory);

router.get("/applications", authenticate, getApplications);
router.patch("/applications/:id", authenticate, requireAdmin, validate(idParam, "params"), validate(applicationStatusSchema), updateApplicationStatus);
router.post("/contact", contactLimiter, optionalAuth, validate(contactSchema), submitContact);
router.get("/contacts", authenticate, requireAdmin, getContacts);

router.get("/:id", optionalAuth, validate(idParam, "params"), getStoryDetail);
router.delete("/:id", authenticate, validate(idParam, "params"), deleteStory);
router.post("/:id/like", authenticate, validate(idParam, "params"), toggleLike);
router.post("/:id/comments", authenticate, writeLimiter, validate(idParam, "params"), validate(commentSchema), addComment);
router.delete("/:id/comments/:commentId", authenticate, validate(commentParams, "params"), deleteComment);
router.post("/:id/apply", authenticate, writeLimiter, validate(idParam, "params"), validate(applySchema), applyForAdoption);

export default router;
