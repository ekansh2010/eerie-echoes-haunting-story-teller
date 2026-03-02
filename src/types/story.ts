export interface Author {
  id: string;
  username: string;
  avatar: string;
}

export interface Story {
  id: string;
  title: string;
  content: string;
  author: Author;
  coverImage: string;
  category: string;
  likes: number;
  views: number;
  comments: number;
  createdAt: string;
}
