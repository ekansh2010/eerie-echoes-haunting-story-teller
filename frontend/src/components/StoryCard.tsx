import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Eye, MessageCircle, Flame } from "lucide-react";
import { Story } from "@/types/story";

const categoryColors: Record<string, string> = {
  Paranormal: "bg-purple-900/40 text-purple-300",
  Psychological: "bg-blue-900/40 text-blue-300",
  "Urban Legends": "bg-amber-900/40 text-amber-300",
  "True Horror": "bg-primary/20 text-primary",
  "Dark Fantasy": "bg-emerald-900/40 text-emerald-300",
};

const StoryCard = ({ story, index }: { story: Story; index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <Link to={`/story/${story.id}`} className="block group">
        <div className="horror-card overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_30px_hsl(0_85%_45%/0.1)]">

          <div className="h-48 bg-horror-gradient relative overflow-hidden">
            <img
              src={story.coverImage}
              alt={story.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
            <div className="absolute top-3 left-3">
              <span className={`text-xs px-2 py-1 rounded-full ${categoryColors[story.category] || "bg-secondary text-secondary-foreground"}`}>
                {story.category}
              </span>
            </div>
            {story.featured && (
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-950/80 border border-primary/50 text-primary px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider text-glow-red animate-pulse">
                <Flame className="w-3 h-3 fill-primary text-primary" /> FEATURED
              </div>
            )}
            <div className="absolute bottom-3 left-3 right-3">
              <h3 className="font-creepy text-xl text-foreground group-hover:text-primary transition-colors line-clamp-2 text-glow-red">
                {story.title}
              </h3>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 font-typewriter">
              {story.content}
            </p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">by {story.author.username}</span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" /> {story.likes}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {story.views}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> {story.comments}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default StoryCard;
