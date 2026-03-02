import { useState } from "react";
import { motion } from "framer-motion";
import { Flame, TrendingUp, Clock, Search } from "lucide-react";
import HorrorLayout from "@/components/HorrorLayout";
import StoryCard from "@/components/StoryCard";
import { mockStories, categories } from "@/data/mockStories";

const HomePage = () => {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = mockStories.filter((s) => {
    if (activeCategory !== "All" && s.category !== activeCategory) return false;
    if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <HorrorLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12">
          
          <h1 className="font-horror text-3xl sm:text-5xl text-primary text-glow-red mb-3">

          </h1>
          <p className="text-muted-foreground font-typewriter text-sm sm:text-base max-w-lg mx-auto">
            Enter the realm where nightmares are written and fear is shared.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-md mx-auto mb-8">
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search the darkness..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-input border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors" />
            
          </div>
        </motion.div>

        {/* Categories */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-2 mb-10">
          
          {["All", ...categories].map((cat) =>
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeCategory === cat ?
            "bg-primary/20 text-primary horror-border" :
            "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"}`
            }>
            
              {cat}
            </button>
          )}
        </motion.div>

        {/* Trending section */}
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="font-creepy text-xl text-foreground">Trending Horrors</h2>
        </div>

        {/* Story Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((story, i) =>
          <StoryCard key={story.id} story={story} index={i} />
          )}
        </div>

        {filtered.length === 0 &&
        <div className="text-center py-20">
            <p className="text-muted-foreground font-typewriter">No horrors found in the void...</p>
          </div>
        }
      </div>
    </HorrorLayout>);

};

export default HomePage;