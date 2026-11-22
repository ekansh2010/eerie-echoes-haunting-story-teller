import { Request, Response } from "express";
import { Comment, ContactSubmission, Story, User } from "../models/index.js";
import { currentUser } from "../middleware/auth.middleware.js";
import { deleteUserCascade } from "../services/story.service.js";
import { toPublicUser } from "../services/serializers.js";
import { HttpError } from "../utils/httpError.js";

export const getAdminStats = async (_req: Request, res: Response) => {
  const [totalStories, activeUsers, totalComments, totalReports] = await Promise.all([
    Story.countDocuments(),
    User.countDocuments(),
    Comment.countDocuments(),
    ContactSubmission.countDocuments(),
  ]);
  res.json({ totalStories, activeUsers, totalComments, totalReports });
};

export const getUsers = async (_req: Request, res: Response) => {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  res.json(users.map(toPublicUser));
};

export const banUser = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  if (id === currentUser(req).id) throw HttpError.badRequest("You cannot ban yourself from the void.");

  const target = await User.findOne({ id }, { role: 1 }).lean();
  if (!target) throw HttpError.notFound("User not found");
  if (target.role === "admin") throw HttpError.forbidden("Admins cannot be banished by other admins.");

  await deleteUserCascade(id);
  res.json({ message: "User banished and footprints wiped successfully" });
};

export const toggleFeatureStory = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  // Single atomic update using an aggregation pipeline to flip the flag.
  const story = await Story.findOneAndUpdate(
    { id },
    [{ $set: { featured: { $not: [{ $ifNull: ["$featured", false] }] } } }],
    { returnDocument: "after", updatePipeline: true } as Record<string, unknown>,
  ).lean();
  if (!story) throw HttpError.notFound("Story not found in the void");
  res.json({ featured: story.featured });
};
