import { Request, Response } from "express";
import { Application, ApplicationStatus, Comment, ContactSubmission, Like, Story, User } from "../models/index.js";
import { currentUser } from "../middleware/auth.middleware.js";
import { deleteStoriesCascade, enrichStories, generateCoverUrl } from "../services/story.service.js";
import { stripInternal } from "../services/serializers.js";
import { HttpError } from "../utils/httpError.js";
import { escapeRegex, generateId, nowTimestamp, today } from "../utils/helpers.js";
import { ListStoriesQuery, MAX_ALL_RESULTS } from "../validation/stories.validation.js";

const NOT_FOUND = "Story not found in the void...";

const buildFilter = ({ category, search }: ListStoriesQuery) => {
  const filter: Record<string, unknown> = {};
  if (category && category !== "All") {
    filter.category = new RegExp(`^${escapeRegex(category)}$`, "i");
  }
  if (search) {
    const q = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ title: q }, { content: q }];
  }
  return filter;
};

export const getStories = async (req: Request, res: Response) => {
  const query = req.query as unknown as ListStoriesQuery;
  const filter = buildFilter(query);
  const viewerId = req.user?.id;
  const sort = { createdAt: -1 as const, _id: -1 as const };

  // `limit=all` (Profile/Admin pages) returns a bare array, capped for safety.
  if (query.limit === "all") {
    const stories = await Story.find(filter).sort(sort).limit(MAX_ALL_RESULTS).lean();
    return res.json(await enrichStories(stories, viewerId));
  }

  const { page, limit } = query;
  const [totalStories, stories] = await Promise.all([
    Story.countDocuments(filter),
    Story.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
  ]);

  res.json({
    stories: await enrichStories(stories, viewerId),
    page,
    totalPages: Math.ceil(totalStories / limit),
    totalStories,
    limit,
  });
};

export const getStoryDetail = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const story = await Story.findOneAndUpdate({ id }, { $inc: { views: 1 } }, { returnDocument: "after" }).lean();
  if (!story) throw HttpError.notFound(NOT_FOUND);

  const [[enriched], comments] = await Promise.all([
    enrichStories([story], req.user?.id),
    Comment.find({ storyId: id }).sort({ createdAt: -1 }).lean(),
  ]);

  // Show current usernames (users may have been renamed); fall back to the stored one.
  const commenters = await User.find({ id: { $in: [...new Set(comments.map((c) => c.userId))] } }, { id: 1, username: 1 }).lean();
  const nameMap = new Map(commenters.map((u) => [u.id, u.username]));
  const commentList = comments.map((c) => ({ ...stripInternal(c), username: nameMap.get(c.userId) ?? c.username }));

  res.json({ ...enriched, commentList });
};

export const createStory = async (req: Request, res: Response) => {
  const user = currentUser(req);
  const { title, content, category, coverImage } = req.body as {
    title: string;
    content: string;
    category: string;
    coverImage?: string;
  };

  const story = await Story.create({
    id: generateId("s"),
    title,
    content,
    authorId: user.id,
    coverImage: coverImage || generateCoverUrl(title, category),
    category,
    views: 0,
    createdAt: today(),
  });

  const [enriched] = await enrichStories([story.toObject()], user.id);
  res.status(201).json(enriched);
};

export const toggleLike = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const userId = currentUser(req).id;

  if (!(await Story.exists({ id }))) throw HttpError.notFound("Story not found");

  // Atomic toggle: try to remove first; if nothing was removed, add. The unique
  // index on (userId, storyId) makes concurrent double-likes impossible.
  const removed = await Like.deleteOne({ storyId: id, userId });
  let liked = false;
  if (removed.deletedCount === 0) {
    try {
      await Like.create({ storyId: id, userId });
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
    }
    liked = true;
  }

  const likes = await Like.countDocuments({ storyId: id });
  res.json({ liked, likes });
};

export const addComment = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const user = currentUser(req);
  if (!(await Story.exists({ id }))) throw HttpError.notFound("Story not found");

  const comment = await Comment.create({
    id: generateId("c"),
    storyId: id,
    userId: user.id,
    username: user.username,
    text: (req.body as { text: string }).text,
    createdAt: nowTimestamp(),
  });
  res.status(201).json(stripInternal(comment.toObject()));
};

export const deleteStory = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const user = currentUser(req);

  const story = await Story.findOne({ id }).lean();
  if (!story) throw HttpError.notFound(NOT_FOUND);
  if (story.authorId !== user.id && user.role !== "admin") {
    throw HttpError.forbidden("Forbidden: You are not authorized to banish this story");
  }

  await deleteStoriesCascade([id]);
  res.json({ message: "Story vanished into the void successfully" });
};

export const deleteComment = async (req: Request, res: Response) => {
  const { id, commentId } = req.params as { id: string; commentId: string };
  const user = currentUser(req);

  const story = await Story.findOne({ id }).lean();
  if (!story) throw HttpError.notFound(NOT_FOUND);
  const comment = await Comment.findOne({ id: commentId, storyId: id }).lean();
  if (!comment) throw HttpError.notFound("Whisper not found in the dark...");

  const allowed = comment.userId === user.id || story.authorId === user.id || user.role === "admin";
  if (!allowed) throw HttpError.forbidden("Forbidden: You cannot silence this whisper");

  await Comment.deleteOne({ id: commentId });
  res.json({ message: "Whisper silenced successfully" });
};

export const applyForAdoption = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const user = currentUser(req);

  const story = await Story.findOne({ id }).lean();
  if (!story) throw HttpError.notFound("Story not found");
  if (story.authorId === user.id) throw HttpError.badRequest("You cannot adopt your own story");
  if (await Application.exists({ userId: user.id, storyId: id, status: "pending" })) {
    throw HttpError.conflict("You already have a pending application for this story");
  }

  const application = await Application.create({
    id: generateId("app"),
    userId: user.id,
    username: user.username,
    storyId: id,
    storyTitle: story.title,
    notes: (req.body as { notes: string }).notes,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  res.status(201).json(stripInternal(application.toObject()));
};

export const getApplications = async (req: Request, res: Response) => {
  const user = currentUser(req);
  const filter = user.role === "admin" ? {} : { userId: user.id };
  const apps = await Application.find(filter).sort({ createdAt: -1 }).lean();
  res.json(apps.map(stripInternal));
};

export const updateApplicationStatus = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { status } = req.body as { status: ApplicationStatus };
  const updated = await Application.findOneAndUpdate({ id }, { status }, { returnDocument: "after", runValidators: true }).lean();
  if (!updated) throw HttpError.notFound("Application not found");
  res.json(stripInternal(updated));
};

export const submitContact = async (req: Request, res: Response) => {
  const { name, email, message } = req.body as { name: string; email: string; message: string };
  await ContactSubmission.create({
    id: generateId("contact"),
    userId: req.user?.id,
    name,
    email,
    message,
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ message: "Message sent to the void." });
};

export const getContacts = async (_req: Request, res: Response) => {
  const contacts = await ContactSubmission.find().sort({ createdAt: -1 }).lean();
  res.json(contacts.map(stripInternal));
};
