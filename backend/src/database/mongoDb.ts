import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

// --- Users ---
export interface IUser extends Document {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  avatar: string;
  role: "user" | "admin";
  createdAt: string;
  isVerified?: boolean;
}

const UserSchema = new Schema<IUser>({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  avatar: { type: String, default: "" },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  createdAt: { type: String, required: true },
  isVerified: { type: Boolean, default: false }
});

export const User = mongoose.model<IUser>("User", UserSchema);


// --- Stories ---
export interface IStory extends Document {
  id: string;
  title: string;
  content: string;
  authorId: string;
  coverImage: string;
  category: string;
  views: number;
  likes: number;
  comments: number;
  featured?: boolean;
  createdAt: string;
}

const StorySchema = new Schema<IStory>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  authorId: { type: String, required: true },
  coverImage: { type: String, default: "" },
  category: { type: String, required: true },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
  createdAt: { type: String, required: true }
});

export const Story = mongoose.model<IStory>("Story", StorySchema);


// --- Comments ---
export interface IComment extends Document {
  id: string;
  storyId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
}

const CommentSchema = new Schema<IComment>({
  id: { type: String, required: true, unique: true },
  storyId: { type: String, required: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: String, required: true }
});

export const Comment = mongoose.model<IComment>("Comment", CommentSchema);


// --- Likes ---
export interface ILike extends Document {
  userId: string;
  storyId: string;
}

const LikeSchema = new Schema<ILike>({
  userId: { type: String, required: true },
  storyId: { type: String, required: true }
});
LikeSchema.index({ userId: 1, storyId: 1 }, { unique: true });

export const Like = mongoose.model<ILike>("Like", LikeSchema);


// --- Applications ---
export interface IApplication extends Document {
  id: string;
  userId: string;
  username: string;
  storyId: string;
  storyTitle: string;
  notes: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

const ApplicationSchema = new Schema<IApplication>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  storyId: { type: String, required: true },
  storyTitle: { type: String, required: true },
  notes: { type: String, default: "" },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  createdAt: { type: String, required: true }
});

export const Application = mongoose.model<IApplication>("Application", ApplicationSchema);


// --- ContactSubmissions ---
export interface IContactSubmission extends Document {
  id: string;
  userId?: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

const ContactSubmissionSchema = new Schema<IContactSubmission>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: false },
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: String, required: true }
});

export const ContactSubmission = mongoose.model<IContactSubmission>("ContactSubmission", ContactSubmissionSchema);


// --- Database Initialization & Seeding ---
export const initDb = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const adminUsername = process.env.ADMIN_USERNAME || "DarkScribe";
      const adminEmail = process.env.ADMIN_EMAIL || "darkscribe@void.com";
      const adminPassword = process.env.ADMIN_PASSWORD || "darkness123";

      console.log("Seeding default users...");
      const salt = bcrypt.genSaltSync(10);
      const adminHash = bcrypt.hashSync(adminPassword, salt);
      const defaultHash = bcrypt.hashSync("darkness123", salt);

      const seededUsers = [
        { id: "u1", username: adminUsername, email: adminEmail, passwordHash: adminHash, avatar: "", role: "admin", createdAt: "2026-01-01" },
        { id: "u2", username: "NightCrawler", email: "nightcrawler@void.com", passwordHash: defaultHash, avatar: "", role: "user", createdAt: "2026-01-02" },
        { id: "u3", username: "MirrorWatcher", email: "mirrorwatcher@void.com", passwordHash: defaultHash, avatar: "", role: "user", createdAt: "2026-01-03" },
        { id: "u4", username: "UrbanPhantom", email: "urbanphantom@void.com", passwordHash: defaultHash, avatar: "", role: "user", createdAt: "2026-01-04" },
        { id: "u5", username: "GrimFable", email: "grimfable@void.com", passwordHash: defaultHash, avatar: "", role: "user", createdAt: "2026-01-05" },
        { id: "u6", username: "MidnightCaller", email: "midnightcaller@void.com", passwordHash: defaultHash, avatar: "", role: "user", createdAt: "2026-01-06" }
      ];

      await User.insertMany(seededUsers);
    }

    const hasSeededComments = await Comment.exists({ id: "c1" });
    if (!hasSeededComments) {
      console.log("Database incomplete or missing seeded comments. Performing complete fresh seed of stories, comments and likes...");
      await Story.deleteMany({});
      await Comment.deleteMany({});
      await Like.deleteMany({});
      
      const seededStories = [
        {
          id: "1", title: "The Whispering Walls of Ashmore Estate",
          content: "The first night I spent in Ashmore Estate, I heard them. Not the creaks of an old house settling—those I expected. No, these were whispers. Faint, desperate murmurs seeping through the wallpaper like blood through a bandage...",
          authorId: "u1", coverImage: "/images/Whispering walls.png", category: "Paranormal", views: 1890, likes: 3, comments: 3, createdAt: "2026-02-28"
        },
        {
          id: "2", title: "Room 309 Never Checks Out",
          content: "Every hotel has its stories. But the Blackwater Inn has Room 309—the room that's always occupied, even when it's empty. The maid found the bed made with military precision each morning, sheets cold as marble...",
          authorId: "u2", coverImage: "/images/room 309.png", category: "True Horror", views: 3200, likes: 2, comments: 2, createdAt: "2026-02-25"
        },
        {
          id: "3", title: "The Face Behind Your Reflection",
          content: "You've felt it before—that split second where your reflection moves a heartbeat too late. Where the eyes in the mirror seem to track something you can't see. Dr. Sarah Chen studied this phenomenon for twelve years...",
          authorId: "u3", coverImage: "/images/reflection.png", category: "Psychological", views: 5400, likes: 1, comments: 1, createdAt: "2026-02-20"
        },
        {
          id: "4", title: "The Subway That Goes Nowhere",
          content: "Platform 13 doesn't exist on any transit map. But if you stand at Grand Central at exactly 3:33 AM, you'll hear the screech of rusted wheels on forgotten tracks. The train arrives empty. It always arrives empty...",
          authorId: "u4", coverImage: "/images/subway.png", category: "Urban Legends", views: 4100, likes: 1, comments: 1, createdAt: "2026-02-18"
        },
        {
          id: "5", title: "The Keeper of Lost Children",
          content: "In the kingdom of Ashenvale, where the trees grow teeth and the rivers run with ink, there lives a creature older than memory itself. The villagers call it the Keeper...",
          authorId: "u5", coverImage: "/images/Keeper.png", category: "Dark Fantasy", views: 2800, likes: 1, comments: 1, createdAt: "2026-02-15"
        },
        {
          id: "6", title: "Don't Answer the Door After Midnight",
          content: "The knocking started at 12:01 AM. Three slow, deliberate knocks. My dog, Max, who barks at everything—squirrels, mailmen, his own shadow—pressed himself flat against the floor and whimpered...",
          authorId: "u6", coverImage: "/images/Midnight.png", category: "True Horror", views: 7800, likes: 1, comments: 1, createdAt: "2026-02-12"
        }
      ];

      await Story.insertMany(seededStories);

      console.log("Seeding default comments...");
      const seededComments = [
        {
          id: "c1", storyId: "1", userId: "u2", username: "NightCrawler",
          text: "I lived near Ashmore. Nobody goes there after sunset. The sounds are real.",
          createdAt: "2026-03-01 12:00:00"
        },
        {
          id: "c2", storyId: "1", userId: "u3", username: "MirrorWatcher",
          text: "Has anyone tried peeling back the wallpaper? What is behind it?",
          createdAt: "2026-03-01 14:30:00"
        },
        {
          id: "c3", storyId: "1", userId: "u4", username: "UrbanPhantom",
          text: "This writing is beautiful yet terrifying. I felt like I was in that corridor.",
          createdAt: "2026-03-02 09:15:00"
        },
        {
          id: "c4", storyId: "2", userId: "u1", username: "DarkScribe",
          text: "I stayed at the Blackwater Inn once. Saw room 309. Felt an icy chill just walking past.",
          createdAt: "2026-02-26 10:20:00"
        },
        {
          id: "c5", storyId: "2", userId: "u5", username: "GrimFable",
          text: "They say a young woman disappeared in that room in the 70s. Spooky.",
          createdAt: "2026-02-26 11:45:00"
        },
        {
          id: "c6", storyId: "3", userId: "u6", username: "MidnightCaller",
          text: "Mirror staring is a known psychological phenomenon. But this makes it feel so mystical.",
          createdAt: "2026-02-21 08:00:00"
        },
        {
          id: "c7", storyId: "4", userId: "u2", username: "NightCrawler",
          text: "Reminds me of the midnight meat train. Extremely spooky ambiance.",
          createdAt: "2026-02-19 15:30:00"
        },
        {
          id: "c8", storyId: "5", userId: "u3", username: "MirrorWatcher",
          text: "Ashenvale fantasy setting is amazing. Hope we get a part 2 of this keeper story.",
          createdAt: "2026-02-16 19:40:00"
        },
        {
          id: "c9", storyId: "6", userId: "u4", username: "UrbanPhantom",
          text: "Never open the door. The knocking rules must be obeyed.",
          createdAt: "2026-02-13 22:10:00"
        }
      ];
      await Comment.insertMany(seededComments);

      console.log("Seeding default likes...");
      const seededLikes = [
        { userId: "u2", storyId: "1" },
        { userId: "u3", storyId: "1" },
        { userId: "u4", storyId: "1" },
        { userId: "u1", storyId: "2" },
        { userId: "u5", storyId: "2" },
        { userId: "u6", storyId: "3" },
        { userId: "u2", storyId: "4" },
        { userId: "u3", storyId: "5" },
        { userId: "u4", storyId: "6" }
      ];
      await Like.insertMany(seededLikes);
    }
    
    console.log("Database initialized successfully!");
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
};
