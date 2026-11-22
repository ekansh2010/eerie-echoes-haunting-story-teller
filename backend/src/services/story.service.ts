import { Application, Comment, IStory, Like, Story, Upload, User } from "../models";
import { stripInternal } from "./serializers";

export interface StoryAuthor {
  id: string;
  username: string;
  avatar: string;
}

export type EnrichedStory = Omit<IStory, "likes" | "comments"> & {
  author: StoryAuthor;
  likes: number;
  comments: number;
  likedByUser: boolean;
};

const countBy = async (model: typeof Like | typeof Comment, storyIds: string[]) => {
  const rows = await (model as typeof Like).aggregate<{ _id: string; n: number }>([
    { $match: { storyId: { $in: storyIds } } },
    { $group: { _id: "$storyId", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.n]));
};

/**
 * Attaches author, live like/comment counts and `likedByUser` to a batch of
 * stories using a constant number of queries (no N+1).
 */
export const enrichStories = async (stories: IStory[], viewerId?: string): Promise<EnrichedStory[]> => {
  if (stories.length === 0) return [];
  const storyIds = stories.map((s) => s.id);
  const authorIds = [...new Set(stories.map((s) => s.authorId))];

  const [authors, likeCounts, commentCounts, viewerLikes] = await Promise.all([
    User.find({ id: { $in: authorIds } }, { id: 1, username: 1, avatar: 1 }).lean(),
    countBy(Like, storyIds),
    countBy(Comment, storyIds),
    viewerId ? Like.find({ userId: viewerId, storyId: { $in: storyIds } }, { storyId: 1 }).lean() : Promise.resolve([]),
  ]);

  const authorMap = new Map(authors.map((a) => [a.id, a]));
  const likedSet = new Set(viewerLikes.map((l) => l.storyId));

  return stories.map((story) => {
    const author = authorMap.get(story.authorId);
    return {
      ...stripInternal(story),
      featured: !!story.featured,
      author: author
        ? { id: author.id, username: author.username, avatar: author.avatar ?? "" }
        : { id: story.authorId, username: "Unknown Ghost", avatar: "" },
      likes: likeCounts.get(story.id) ?? 0,
      comments: commentCounts.get(story.id) ?? 0,
      likedByUser: likedSet.has(story.id),
    };
  });
};

/** Deletes stories and everything hanging off them (comments, likes, applications). */
export const deleteStoriesCascade = async (storyIds: string[]): Promise<void> => {
  if (storyIds.length === 0) return;
  await Promise.all([
    Story.deleteMany({ id: { $in: storyIds } }),
    Comment.deleteMany({ storyId: { $in: storyIds } }),
    Like.deleteMany({ storyId: { $in: storyIds } }),
    Application.deleteMany({ storyId: { $in: storyIds } }),
  ]);
};

/** Removes a user and every trace of them, including content on their stories. */
export const deleteUserCascade = async (userId: string): Promise<void> => {
  const ownStories = await Story.find({ authorId: userId }, { id: 1 }).lean();
  await deleteStoriesCascade(ownStories.map((s) => s.id));
  await Promise.all([
    User.deleteOne({ id: userId }),
    Comment.deleteMany({ userId }),
    Like.deleteMany({ userId }),
    Application.deleteMany({ userId }),
    Upload.deleteMany({ ownerId: userId }),
  ]);
};

/** Default AI cover via Pollinations when the author didn't upload one. */
export const generateCoverUrl = (title: string, category: string): string => {
  const cleanTitle = title.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 100);
  const prompt = `creepy gothic horror illustration, ${cleanTitle}, theme of ${category}, dark atmosphere, digital art, 4k`;
  const seed = Math.floor(Math.random() * 100000);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=450&nologo=true&seed=${seed}`;
};
