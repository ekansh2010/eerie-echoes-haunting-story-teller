export interface Author {
  id: string;
  username: string;
  avatar: string;
}

export interface Story {
  id: string;
  title: string;
  content: string;
  authorId?: string;
  author: Author;
  coverImage: string;
  /** "generating" while the AI is painting the cover from the story text. */
  coverStatus?: "none" | "generating" | "ready" | "failed";
  coverPrompt?: string;
  category: string;
  likes: number;
  views: number;
  comments: number;
  featured?: boolean;
  createdAt: string;
  likedByUser?: boolean;
}

export interface Comment {
  id: string;
  storyId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
}

export interface StoryDetail extends Story {
  commentList: Comment[];
}

/** Response of `GET /api/stories` when paginated (i.e. `limit` is not "all"). */
export interface PaginatedStories {
  stories: Story[];
  page: number;
  totalPages: number;
  totalStories: number;
  limit: number;
}

export interface UploadResponse {
  message: string;
  url: string;
}

/** Error payload returned by the API. */
export interface ApiError {
  error: string;
  details?: unknown;
}

export interface Application {
  id: string;
  userId: string;
  username: string;
  storyId: string;
  storyTitle: string;
  notes: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}
