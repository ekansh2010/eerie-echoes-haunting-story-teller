import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Image } from "lucide-react";
import HorrorLayout from "@/components/HorrorLayout";
import { categories } from "@/data/mockStories";

const UploadPage = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");

  return (
    <HorrorLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-creepy text-3xl text-foreground mb-2">Unleash Your Horror</h1>
          <p className="text-sm text-muted-foreground mb-8 font-typewriter">
            Write a tale that haunts the reader long after the last word.
          </p>

          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Name your nightmare..."
                className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                      category === cat
                        ? "bg-primary/20 text-primary horror-border"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Cover image */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Cover Image</label>
              <div className="horror-card p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 transition-colors">
                <Image className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload cover</p>
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Your Story</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="It was a dark and stormy night..."
                rows={12}
                className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 resize-none font-typewriter"
              />
            </div>

            {/* Submit */}
            <button className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" />
              Publish to the Void
            </button>
          </div>
        </motion.div>
      </div>
    </HorrorLayout>
  );
};

export default UploadPage;
