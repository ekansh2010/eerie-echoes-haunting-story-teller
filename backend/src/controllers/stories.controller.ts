import { Response } from "express";
import jwt from "jsonwebtoken";
import { Story, Comment, Like, Application, ContactSubmission, User } from "../database/mongoDb";
import { AuthRequest } from "../middleware/auth.middleware";

const JWT_SECRET = process.env.JWT_SECRET || "haunting_eerie_echoes_secret_key_666";

const getOptionalUserId = (req: AuthRequest): string | null => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    return decoded.id;
  } catch {
    return null;
  }
};

export const getStories = async (req: AuthRequest, res: Response) => {
  try {
    const { category, search } = req.query;
    const currentUserId = getOptionalUserId(req);

    const filter: any = {};
    if (category && category !== "All") {
      filter.category = new RegExp(`^${category}$`, "i");
    }
    
    if (search) {
      const q = new RegExp(search as string, "i");
      filter.$or = [
        { title: q },
        { content: q }
      ];
    }

    const stories = await Story.find(filter).sort({ createdAt: -1 }).lean();

    const result = await Promise.all(stories.map(async (story) => {
      const author = await User.findOne({ id: story.authorId }).lean();
      const likedByUser = currentUserId ? await Like.exists({ storyId: story.id, userId: currentUserId }) : false;
      const likesCount = await Like.countDocuments({ storyId: story.id });
      const commentsCount = await Comment.countDocuments({ storyId: story.id });

      return {
        ...story,
        author: author ? { id: author.id, username: author.username, avatar: author.avatar } : { id: story.authorId, username: "Unknown Ghost", avatar: "" },
        likes: likesCount,
        comments: commentsCount,
        likedByUser: !!likedByUser
      };
    }));

    return res.json(result);
  } catch (error) {
    console.error("Fetch stories error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getStoryDetail = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const currentUserId = getOptionalUserId(req);

    const story = await Story.findOneAndUpdate(
      { id },
      { $inc: { views: 1 } },
      { new: true }
    ).lean();

    if (!story) {
      return res.status(404).json({ error: "Story not found in the void..." });
    }

    const author = await User.findOne({ id: story.authorId }).lean();
    const comments = await Comment.find({ storyId: id }).sort({ createdAt: -1 }).lean();
    const likedByUser = currentUserId ? await Like.exists({ storyId: id, userId: currentUserId }) : false;

    // Fetch comment authors
    const commentList = await Promise.all(comments.map(async (c) => {
      const commentUser = await User.findOne({ id: c.userId }).lean();
      return {
        ...c,
        username: commentUser ? commentUser.username : c.username
      };
    }));

    const likesCount = await Like.countDocuments({ storyId: id });
    const commentsCount = await Comment.countDocuments({ storyId: id });

    return res.json({
      ...story,
      author: author ? { id: author.id, username: author.username, avatar: author.avatar } : { id: story.authorId, username: "Unknown Ghost", avatar: "" },
      likes: likesCount,
      comments: commentsCount,
      commentList,
      likedByUser: !!likedByUser
    });
  } catch (error) {
    console.error("Fetch story detail error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const createStory = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, category, coverImage } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Generate a unique AI cover image using the free Pollinations AI engine based on story title and category
    const cleanTitle = title.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 100);
    const generatedPrompt = `creepy gothic horror illustration, ${cleanTitle}, theme of ${category}, dark atmosphere, digital art, 4k`;
    const finalCover = coverImage || `https://image.pollinations.ai/prompt/${encodeURIComponent(generatedPrompt)}?width=800&height=450&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;

    const newStory = new Story({
      id: `s_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      content,
      authorId: userId,
      coverImage: finalCover,
      category,
      views: 0,
      createdAt: new Date().toISOString().split("T")[0]
    });

    await newStory.save();

    const authorUser = await User.findOne({ id: userId }).lean();

    return res.status(201).json({
      ...newStory.toObject(),
      author: authorUser ? { id: authorUser.id, username: authorUser.username, avatar: authorUser.avatar } : { id: userId, username: "Unknown Guest", avatar: "" },
      likes: 0,
      comments: 0,
      likedByUser: false
    });
  } catch (error) {
    console.error("Create story error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const storyExists = await Story.exists({ id });
    if (!storyExists) {
      return res.status(404).json({ error: "Story not found" });
    }

    const existingLike = await Like.findOne({ storyId: id, userId });
    let liked = false;

    if (existingLike) {
      await Like.deleteOne({ _id: existingLike._id });
      await Story.updateOne({ id }, { $inc: { likes: -1 } });
    } else {
      await Like.create({ userId, storyId: id });
      await Story.updateOne({ id }, { $inc: { likes: 1 } });
      liked = true;
    }

    const updatedStory = await Story.findOne({ id }).lean();
    const totalLikes = updatedStory ? updatedStory.likes : 0;

    return res.json({ liked, likes: totalLikes });
  } catch (error) {
    console.error("Toggle like error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { text } = req.body;
    const userId = req.user?.id;
    const username = req.user?.username;

    if (!userId || !username) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const storyExists = await Story.exists({ id });
    if (!storyExists) {
      return res.status(404).json({ error: "Story not found" });
    }

    const newComment = await Comment.create({
      id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      storyId: id,
      userId,
      username,
      text,
      createdAt: new Date().toISOString().replace("T", " ").split(".")[0]
    });

    await Story.updateOne({ id }, { $inc: { comments: 1 } });

    return res.status(201).json(newComment);
  } catch (error) {
    console.error("Add comment error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteStory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const story = await Story.findOne({ id });

    if (!story) {
      return res.status(404).json({ error: "Story not found in the void..." });
    }

    const userObj = await User.findOne({ id: userId });
    const isAdmin = userObj?.role === "admin";

    // Check if current user is the author of this story OR an admin
    if (story.authorId !== userId && !isAdmin) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to banish this story" });
    }

    // Delete story
    await Story.deleteOne({ id });

    // Delete related comments & likes
    await Comment.deleteMany({ storyId: id });
    await Like.deleteMany({ storyId: id });
    await Application.deleteMany({ storyId: id });

    return res.json({ message: "Story vanished into the void successfully" });
  } catch (error) {
    console.error("Delete story error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id, commentId } = req.params as { id: string; commentId: string };
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const story = await Story.findOne({ id });
    if (!story) {
      return res.status(404).json({ error: "Story not found in the void..." });
    }

    const comment = await Comment.findOne({ id: commentId, storyId: id });
    if (!comment) {
      return res.status(404).json({ error: "Whisper not found in the dark..." });
    }

    const userObj = await User.findOne({ id: userId });
    const isAdmin = userObj?.role === "admin";

    // Check if the current user is the author of the comment OR the author of the story OR an admin
    if (comment.userId !== userId && story.authorId !== userId && !isAdmin) {
      return res.status(403).json({ error: "Forbidden: You cannot silence this whisper" });
    }

    // Delete comment
    await Comment.deleteOne({ id: commentId });
    await Story.updateOne({ id }, { $inc: { comments: -1 } });

    return res.json({ message: "Whisper silenced successfully" });
  } catch (error) {
    console.error("Delete comment error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const applyForAdoption = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { notes } = req.body;
    const userId = req.user?.id;
    const username = req.user?.username;

    if (!userId || !username) return res.status(401).json({ error: "Unauthorized" });

    const story = await Story.findOne({ id });
    if (!story) return res.status(404).json({ error: "Story not found" });

    const newApp = await Application.create({
      id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      username,
      storyId: id,
      storyTitle: story.title,
      notes: notes || "",
      status: "pending",
      createdAt: new Date().toISOString()
    });

    return res.status(201).json(newApp);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getApplications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await User.findOne({ id: userId });
    
    if (user?.role === "admin") {
      const apps = await Application.find().sort({ createdAt: -1 }).lean();
      return res.json(apps);
    }
    
    const userApps = await Application.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.json(userApps);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateApplicationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { status } = req.body;
    const userId = req.user?.id;
    
    const user = await User.findOne({ id: userId });
    if (user?.role !== "admin") return res.status(403).json({ error: "Forbidden" });

    const updatedApp = await Application.findOneAndUpdate(
      { id },
      { status },
      { new: true }
    );

    if (!updatedApp) return res.status(404).json({ error: "Application not found" });

    return res.json(updatedApp);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const submitContact = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, message } = req.body;
    const userId = getOptionalUserId(req) || undefined;

    await ContactSubmission.create({
      id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      name,
      email,
      message,
      createdAt: new Date().toISOString()
    });

    return res.status(201).json({ message: "Message sent to the void." });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getContacts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const user = await User.findOne({ id: userId });
    if (user?.role !== "admin") return res.status(403).json({ error: "Forbidden" });

    const contacts = await ContactSubmission.find().sort({ createdAt: -1 }).lean();
    return res.json(contacts);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};
