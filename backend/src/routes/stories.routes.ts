import { Router } from "express";
import { getStories, getStoryDetail, createStory, toggleLike, addComment, deleteStory, deleteComment, applyForAdoption, getApplications, updateApplicationStatus, submitContact, getContacts } from "../controllers/stories.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { validateCreateStory, validateComment } from "../validation/stories.validation";

const router = Router();

router.get("/", getStories);
router.get("/applications", authenticateToken, getApplications);
router.patch("/applications/:id", authenticateToken, updateApplicationStatus);
router.get("/contacts", authenticateToken, getContacts);
router.post("/contact", submitContact);
router.get("/:id", getStoryDetail);
router.post("/:id/apply", authenticateToken, applyForAdoption);
router.post("/", authenticateToken, validateCreateStory, createStory);
router.post("/:id/like", authenticateToken, toggleLike);
router.post("/:id/comments", authenticateToken, validateComment, addComment);
router.delete("/:id", authenticateToken, deleteStory);
router.delete("/:id/comments/:commentId", authenticateToken, deleteComment);

export default router;
