import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { AudioTrack, Comment, Like, Story, User } from "../models";
import { BCRYPT_ROUNDS, CASE_INSENSITIVE } from "../utils/helpers";

const DEFAULT_TRACKS = [
  { id: "t1", title: "Tense Horror Background", url: "/audio/tense-horror-background.mp3", duration: "3:12", credit: "Eerie Echoes Ambient Soundscape" },
  { id: "t2", title: "Scary Horror Music", url: "/audio/scary-horror-music.mp3", duration: "2:45", credit: "Eerie Echoes Orchestral Tension" },
  { id: "t3", title: "Horror Music Box", url: "/audio/horror-music-box.mp3", duration: "2:15", credit: "Eerie Echoes Creepy Music Box" },
];

const DEMO_USERS = [
  { id: "u2", username: "NightCrawler", email: "nightcrawler@void.com", createdAt: "2026-01-02" },
  { id: "u3", username: "MirrorWatcher", email: "mirrorwatcher@void.com", createdAt: "2026-01-03" },
  { id: "u4", username: "UrbanPhantom", email: "urbanphantom@void.com", createdAt: "2026-01-04" },
  { id: "u5", username: "GrimFable", email: "grimfable@void.com", createdAt: "2026-01-05" },
  { id: "u6", username: "MidnightCaller", email: "midnightcaller@void.com", createdAt: "2026-01-06" },
];

export const DEMO_PASSWORD = "darkness123";

const DEMO_STORIES = [
  { id: "1", title: "The Whispering Walls of Ashmore Estate", content: "The first night I spent in Ashmore Estate, I heard them. Not the creaks of an old house settling—those I expected. No, these were whispers. Faint, desperate murmurs seeping through the wallpaper like blood through a bandage...", authorId: "u1", coverImage: "/images/Whispering walls.png", category: "Paranormal", views: 1890, createdAt: "2026-02-28" },
  { id: "2", title: "Room 309 Never Checks Out", content: "Every hotel has its stories. But the Blackwater Inn has Room 309—the room that's always occupied, even when it's empty. The maid found the bed made with military precision each morning, sheets cold as marble...", authorId: "u2", coverImage: "/images/room 309.png", category: "True Horror", views: 3200, createdAt: "2026-02-25" },
  { id: "3", title: "The Face Behind Your Reflection", content: "You've felt it before—that split second where your reflection moves a heartbeat too late. Where the eyes in the mirror seem to track something you can't see. Dr. Sarah Chen studied this phenomenon for twelve years...", authorId: "u3", coverImage: "/images/reflection.png", category: "Psychological", views: 5400, createdAt: "2026-02-20" },
  { id: "4", title: "The Subway That Goes Nowhere", content: "Platform 13 doesn't exist on any transit map. But if you stand at Grand Central at exactly 3:33 AM, you'll hear the screech of rusted wheels on forgotten tracks. The train arrives empty. It always arrives empty...", authorId: "u4", coverImage: "/images/subway.png", category: "Urban Legends", views: 4100, createdAt: "2026-02-18" },
  { id: "5", title: "The Keeper of Lost Children", content: "In the kingdom of Ashenvale, where the trees grow teeth and the rivers run with ink, there lives a creature older than memory itself. The villagers call it the Keeper...", authorId: "u5", coverImage: "/images/Keeper.png", category: "Dark Fantasy", views: 2800, createdAt: "2026-02-15" },
  { id: "6", title: "Don't Answer the Door After Midnight", content: "The knocking started at 12:01 AM. Three slow, deliberate knocks. My dog, Max, who barks at everything—squirrels, mailmen, his own shadow—pressed himself flat against the floor and whimpered...", authorId: "u6", coverImage: "/images/Midnight.png", category: "True Horror", views: 7800, createdAt: "2026-02-12" },
];

const DEMO_COMMENTS = [
  { id: "c1", storyId: "1", userId: "u2", username: "NightCrawler", text: "I lived near Ashmore. Nobody goes there after sunset. The sounds are real.", createdAt: "2026-03-01 12:00:00" },
  { id: "c2", storyId: "1", userId: "u3", username: "MirrorWatcher", text: "Has anyone tried peeling back the wallpaper? What is behind it?", createdAt: "2026-03-01 14:30:00" },
  { id: "c3", storyId: "1", userId: "u4", username: "UrbanPhantom", text: "This writing is beautiful yet terrifying. I felt like I was in that corridor.", createdAt: "2026-03-02 09:15:00" },
  { id: "c4", storyId: "2", userId: "u1", username: "DarkScribe", text: "I stayed at the Blackwater Inn once. Saw room 309. Felt an icy chill just walking past.", createdAt: "2026-02-26 10:20:00" },
  { id: "c5", storyId: "2", userId: "u5", username: "GrimFable", text: "They say a young woman disappeared in that room in the 70s. Spooky.", createdAt: "2026-02-26 11:45:00" },
  { id: "c6", storyId: "3", userId: "u6", username: "MidnightCaller", text: "Mirror staring is a known psychological phenomenon. But this makes it feel so mystical.", createdAt: "2026-02-21 08:00:00" },
  { id: "c7", storyId: "4", userId: "u2", username: "NightCrawler", text: "Reminds me of the midnight meat train. Extremely spooky ambiance.", createdAt: "2026-02-19 15:30:00" },
  { id: "c8", storyId: "5", userId: "u3", username: "MirrorWatcher", text: "Ashenvale fantasy setting is amazing. Hope we get a part 2 of this keeper story.", createdAt: "2026-02-16 19:40:00" },
  { id: "c9", storyId: "6", userId: "u4", username: "UrbanPhantom", text: "Never open the door. The knocking rules must be obeyed.", createdAt: "2026-02-13 22:10:00" },
];

const DEMO_LIKES = [
  { userId: "u2", storyId: "1" }, { userId: "u3", storyId: "1" }, { userId: "u4", storyId: "1" },
  { userId: "u1", storyId: "2" }, { userId: "u5", storyId: "2" }, { userId: "u6", storyId: "3" },
  { userId: "u2", storyId: "4" }, { userId: "u3", storyId: "5" }, { userId: "u4", storyId: "6" },
];

/**
 * Idempotent, NON-destructive seeding.
 *
 * - Audio tracks: inserted when the collection is empty.
 * - Admin: created from ADMIN_EMAIL/ADMIN_PASSWORD when no admin exists. In
 *   non-production with demo seeding on, falls back to the demo admin.
 * - Demo users/stories/comments/likes: only when SEED_DEMO_DATA is on AND the
 *   stories collection is empty. Existing data is never deleted.
 */
export const seedDatabase = async (): Promise<void> => {
  try {
    if ((await AudioTrack.countDocuments()) === 0) {
      logger.info("Seeding default audio tracks...");
      await AudioTrack.insertMany(DEFAULT_TRACKS);
    }

    const hasAdmin = await User.exists({ role: "admin" });
    if (!hasAdmin) {
      const adminEmail = env.ADMIN_EMAIL ?? (env.SEED_DEMO_DATA ? "darkscribe@void.com" : undefined);
      const adminPassword = env.ADMIN_PASSWORD ?? (env.SEED_DEMO_DATA ? DEMO_PASSWORD : undefined);
      if (adminEmail && adminPassword) {
        const taken = await User.exists({ $or: [{ email: adminEmail }, { username: env.ADMIN_USERNAME }] }).collation(CASE_INSENSITIVE);
        if (!taken) {
          logger.info(`Seeding admin account ${env.ADMIN_USERNAME}`);
          await User.create({
            id: "u1",
            username: env.ADMIN_USERNAME,
            email: adminEmail,
            passwordHash: await bcrypt.hash(adminPassword, BCRYPT_ROUNDS),
            role: "admin",
            isVerified: true,
            createdAt: "2026-01-01",
          });
        }
      } else {
        logger.warn("No admin account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD to create one.");
      }
    }

    if (env.SEED_DEMO_DATA && (await Story.countDocuments()) === 0) {
      logger.info("Seeding demo users, stories, comments and likes...");
      const demoHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
      for (const u of DEMO_USERS) {
        const exists = await User.exists({ $or: [{ id: u.id }, { email: u.email }, { username: u.username }] }).collation(CASE_INSENSITIVE);
        if (!exists) await User.create({ ...u, passwordHash: demoHash, role: "user", isVerified: true });
      }
      await Story.insertMany(DEMO_STORIES);
      await Comment.insertMany(DEMO_COMMENTS, { ordered: false }).catch(() => undefined);
      await Like.insertMany(DEMO_LIKES, { ordered: false }).catch(() => undefined);
    }

    logger.info("Database initialised");
  } catch (error) {
    // Seeding must never take the API down.
    logger.error("Database seeding failed", error);
  }
};
