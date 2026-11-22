import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, Image } from "lucide-react";
import HorrorLayout from "@/components/HorrorLayout";
import { categories } from "@/data/mockStories";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import type { ApiError, Story, UploadResponse } from "@/types/story";

interface PublishStoryPayload {
  title: string;
  content: string;
  category: string;
  coverImage?: string;
}

const UploadPage = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const { user, authFetch } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Protect route
  useEffect(() => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You must enter the void to write a story.",
      });
      navigate("/login");
    }
  }, [user, navigate, toast]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await authFetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data: UploadResponse & Partial<ApiError> = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setCoverImage(data.url);
      toast({
        title: "Cover Uploaded",
        description: "Your custom image is sealed for this story.",
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: getErrorMessage(err, "An error occurred."),
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const publishMutation = useMutation({
    mutationKey: ["publishStory"],
    mutationFn: async () => {
      const payload: PublishStoryPayload = { title, content, category };
      if (coverImage) {
        payload.coverImage = coverImage;
      }

      const res = await authFetch("/api/stories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data: Story & Partial<ApiError> = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to publish");
      }
      return data as Story;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast({
        title: "Nightmare Unleashed",
        description: "Your story is now whispering in the dark.",
      });
      navigate("/home");
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not publish",
        description: err.message || "An error occurred.",
      });
    },
  });

  const handlePublish = () => {
    if (!title.trim() || !content.trim() || !category) {
      toast({
        variant: "destructive",
        title: "Incomplete story",
        description: "You must provide a title, category, and text.",
      });
      return;
    }
    publishMutation.mutate();
  };

  return (
    <HorrorLayout bgImage="/images/write_background.png">
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

            {/* Cover image upload */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Cover Image</label>
              <div className="horror-card p-6 flex flex-col items-center justify-center border-dashed border-2 hover:border-primary/40 transition-colors relative cursor-pointer min-h-[140px]">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                {coverImage ? (
                  <div className="text-center w-full">
                    <img src={coverImage} alt="Cover Preview" className="mx-auto max-h-40 rounded mb-2 border border-border" />
                    <p className="text-xs text-primary font-typewriter">Custom cover uploaded. Click or drag to replace.</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Image className="w-8 h-8 text-muted-foreground mb-2 mx-auto" />
                    <p className="text-xs text-muted-foreground font-typewriter">
                      {uploadingImage ? "Uploading to the void..." : "Click or drag an image here to upload custom cover"}
                    </p>
                    <span className="text-[10px] text-muted-foreground/60 block mt-1">Leaves empty for auto-generated AI cover</span>
                  </div>
                )}
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
            <button
              onClick={handlePublish}
              disabled={publishMutation.isPending || uploadingImage}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {publishMutation.isPending ? "Unleashing..." : "Publish to the Void"}
            </button>
          </div>
        </motion.div>
      </div>
    </HorrorLayout>
  );
};

export default UploadPage;
