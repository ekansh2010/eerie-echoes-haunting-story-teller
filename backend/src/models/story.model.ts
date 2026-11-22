import mongoose, { Schema, Model } from "mongoose";

export const STORY_CATEGORIES = ["Paranormal", "Psychological", "Urban Legends", "True Horror", "Dark Fantasy"] as const;

export interface IStory {
  id: string;
  title: string;
  content: string;
  authorId: string;
  coverImage: string;
  category: string;
  views: number;
  /**
   * Legacy denormalised counters. Responses always use live counts from the
   * Like/Comment collections, so these are never trusted for output.
   */
  likes: number;
  comments: number;
  featured: boolean;
  createdAt: string;
}

const StorySchema = new Schema<IStory>(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 50000 },
    authorId: { type: String, required: true, index: true },
    coverImage: { type: String, default: "" },
    category: { type: String, required: true, index: true },
    views: { type: Number, default: 0, min: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    createdAt: { type: String, required: true },
  },
  { versionKey: false },
);
StorySchema.index({ createdAt: -1, _id: -1 });

export const Story: Model<IStory> = mongoose.models.Story || mongoose.model<IStory>("Story", StorySchema);
