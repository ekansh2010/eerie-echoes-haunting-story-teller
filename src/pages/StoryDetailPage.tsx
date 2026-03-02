import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Eye, MessageCircle, ArrowLeft, Bookmark, Share2 } from "lucide-react";
import HorrorLayout from "@/components/HorrorLayout";
import { mockStories } from "@/data/mockStories";

const StoryDetailPage = () => {
  const { id } = useParams();
  const story = mockStories.find((s) => s.id === id);

  if (!story) {
    return (
      <HorrorLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground font-typewriter">This story has vanished into the void...</p>
        </div>
      </HorrorLayout>
    );
  }

  return (
    <HorrorLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Back */}
          <Link to="/home" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to feed
          </Link>

          {/* Cover */}
          <div className="h-64 bg-horror-gradient rounded-lg mb-8 relative overflow-hidden horror-border">
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            <div className="absolute bottom-4 left-4">
              <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                {story.category}
              </span>
            </div>
          </div>

          {/* Title */}
          <h1 className="font-creepy text-3xl sm:text-4xl text-foreground mb-4 text-glow-red">
            {story.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-sm font-medium text-foreground">{story.author.username[0]}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{story.author.username}</p>
                <p className="text-xs text-muted-foreground">{story.createdAt}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-primary">
                <Bookmark className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="font-typewriter text-foreground/90 leading-relaxed text-base whitespace-pre-line mb-10">
            {story.content}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 py-4 border-t border-border">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <Heart className="w-5 h-5" /> {story.likes}
            </button>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="w-5 h-5" /> {story.views}
            </span>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="w-5 h-5" /> {story.comments}
            </span>
          </div>

          {/* Comments placeholder */}
          <div className="mt-10">
            <h3 className="font-creepy text-xl text-foreground mb-4">Whispers ({story.comments})</h3>
            <div className="horror-card p-4">
              <textarea
                placeholder="Leave a whisper in the dark..."
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none h-20"
              />
              <div className="flex justify-end mt-2">
                <button className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">
                  Whisper
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </HorrorLayout>
  );
};

export default StoryDetailPage;
