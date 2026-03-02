import { motion } from "framer-motion";
import { Skull, BookOpen, Users, Award } from "lucide-react";
import HorrorLayout from "@/components/HorrorLayout";
import StoryCard from "@/components/StoryCard";
import { mockStories } from "@/data/mockStories";

const ProfilePage = () => {
  const userStories = mockStories.slice(0, 3);

  return (
    <HorrorLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Profile header */}
          <div className="horror-card p-8 mb-8 text-center">
            <div className="w-24 h-24 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
              <Skull className="w-10 h-10 text-primary" />
            </div>
            <h1 className="font-creepy text-2xl text-foreground mb-1">DarkScribe</h1>
            <p className="text-sm text-muted-foreground font-typewriter mb-4">
              Collector of nightmares. Writer of things best left unread.
            </p>

            {/* Stats */}
            <div className="flex justify-center gap-8 mb-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">12</p>
                <p className="text-xs text-muted-foreground">Stories</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">1.2k</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">89</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </div>
            </div>

            {/* Fear Level badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 horror-border">
              <Award className="w-4 h-4 text-primary" />
              <span className="text-xs text-primary font-medium">Fear Level: Dread Master</span>
            </div>
          </div>

          {/* User stories */}
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-4 h-4 text-primary" />
            <h2 className="font-creepy text-xl text-foreground">Published Horrors</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {userStories.map((story, i) => (
              <StoryCard key={story.id} story={story} index={i} />
            ))}
          </div>
        </motion.div>
      </div>
    </HorrorLayout>
  );
};

export default ProfilePage;
