import { z } from "zod";
import { APPLICATION_STATUSES, STORY_CATEGORIES } from "../models";
import { imageUrl } from "./common";

export const MAX_PAGE_SIZE = 50;
export const MAX_ALL_RESULTS = 1000;

export const listStoriesQuery = z.object({
  category: z.string().trim().max(50).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z
    .union([z.literal("all"), z.coerce.number().int().min(1).max(MAX_PAGE_SIZE)])
    .default(6),
});
export type ListStoriesQuery = z.infer<typeof listStoriesQuery>;

export const createStorySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be at most 200 characters"),
  content: z.string().trim().min(1, "Content is required").max(50_000, "Content is too long"),
  category: z.enum(STORY_CATEGORIES, {
    errorMap: () => ({ message: `Category must be one of: ${STORY_CATEGORIES.join(", ")}` }),
  }),
  coverImage: imageUrl.optional(),
});

export const commentSchema = z.object({
  text: z.string().trim().min(1, "Whisper text cannot be empty").max(2000, "Whisper is too long"),
});

export const applySchema = z.object({
  notes: z.string().trim().max(2000).optional().default(""),
});

export const applicationStatusSchema = z.object({
  status: z.enum(APPLICATION_STATUSES, { errorMap: () => ({ message: "Status must be pending, approved or rejected" }) }),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Email must be valid").max(254),
  message: z.string().trim().min(1, "Message is required").max(5000),
});
