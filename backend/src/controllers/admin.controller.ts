import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { Story, User, Comment, ContactSubmission, Like, Application } from "../database/mongoDb";

export const getAdminStats = async (req: AuthRequest, res: Response) => {
  try {
    const totalStories = await Story.countDocuments();
    const activeUsers = await User.countDocuments();
    const totalComments = await Comment.countDocuments();
    const totalReports = await ContactSubmission.countDocuments();

    return res.json({
      totalStories,
      activeUsers,
      totalComments,
      totalReports,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 }).lean();
    return res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const banUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (id === req.user?.id) {
      return res.status(400).json({ error: "You cannot ban yourself from the void." });
    }

    const userExists = await User.exists({ id });
    if (!userExists) {
      return res.status(404).json({ error: "User not found" });
    }

    // Perform wipe / ban: delete user and all their footprints
    await User.deleteOne({ id });
    await Story.deleteMany({ authorId: id });
    await Comment.deleteMany({ userId: id });
    await Like.deleteMany({ userId: id });
    await Application.deleteMany({ userId: id });

    return res.json({ message: "User banished and footprints wiped successfully" });
  } catch (error) {
    console.error("Ban user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const toggleFeatureStory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const story = await Story.findOne({ id });
    if (!story) {
      return res.status(404).json({ error: "Story not found in the void" });
    }

    story.featured = !story.featured;
    await story.save();

    return res.json({ featured: story.featured });
  } catch (error) {
    console.error("Toggle feature error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
