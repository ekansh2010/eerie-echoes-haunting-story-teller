import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Eye, MessageCircle, ArrowLeft, Bookmark, Share2, Trash2, Hand } from "lucide-react";
import HorrorLayout from "@/components/HorrorLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const StoryDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [adoptNotes, setAdoptNotes] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [showDeleteStoryConfirm, setShowDeleteStoryConfirm] = useState(false);

  const adoptMutation = useMutation({
    mutationFn: async (notes: string) => {
      const res = await authFetch(`/api/stories/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Could not form covenant");
      return res.json();
    },
    onSuccess: () => {
      setShowAdoptModal(false);
      setAdoptNotes("");
      toast({
        title: "Covenant Formed",
        description: "Your request to adopt this horror has been submitted.",
      });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Failed",
        description: err.message || "Failed to submit covenant",
      });
    }
  });

  const deleteStoryMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/stories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Could not delete story");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast({
        title: "Vanished",
        description: "Your story has been wiped from the dark void.",
      });
      navigate("/home");
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to delete story",
      });
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await authFetch(`/api/stories/${id}/comments/${commentId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Could not delete whisper");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["story", id] });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast({
        title: "Silenced",
        description: "The whisper has been silenced.",
      });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to delete whisper",
      });
    }
  });

  const { data: story, isLoading, error } = useQuery<any>({
    queryKey: ["story", id],
    queryFn: async () => {
      const res = await authFetch(`/api/stories/${id}`);
      if (!res.ok) {
        throw new Error("Failed to summon story detail");
      }
      return res.json();
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/stories/${id}/like`, { method: "POST" });
      if (!res.ok) {
        throw new Error("Could not toggle like");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["story", id] });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast({
        title: data.liked ? "Liked" : "Unliked",
        description: data.liked ? "You left a mark of dread." : "Your fear receded.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You must enter the void to like stories.",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await authFetch(`/api/stories/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        throw new Error("Could not post whisper");
      }
      return res.json();
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["story", id] });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast({
        title: "Whispered",
        description: "Your voice echoes in the dark.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You must enter the void to leave a whisper.",
      });
    },
  });

  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    if (!id) return;
    const bookmarks = JSON.parse(localStorage.getItem("eerie_echoes_bookmarks") || "[]");
    setIsBookmarked(bookmarks.includes(id));
  }, [id]);

  const toggleBookmark = () => {
    if (!id) return;
    const bookmarks = JSON.parse(localStorage.getItem("eerie_echoes_bookmarks") || "[]");
    let newBookmarks;
    if (bookmarks.includes(id)) {
      newBookmarks = bookmarks.filter((bId: string) => bId !== id);
      setIsBookmarked(false);
      toast({
        title: "Unsaved",
        description: "The memory faded back into the dark.",
      });
    } else {
      newBookmarks = [...bookmarks, id];
      setIsBookmarked(true);
      toast({
        title: "Saved",
        description: "You have bound this nightmare to your memory.",
      });
    }
    localStorage.setItem("eerie_echoes_bookmarks", JSON.stringify(newBookmarks));
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share && story) {
      navigator.share({
        title: story.title,
        text: story.content.substring(0, 100) + "...",
        url: url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url)
        .then(() => {
          toast({
            title: "Link Copied",
            description: "The path to this nightmare is now in your clipboard.",
          });
        })
        .catch(() => {
          toast({
            variant: "destructive",
            title: "Failed to share",
            description: "Could not copy link to clipboard.",
          });
        });
    }
  };

  if (isLoading) {
    return (
      <HorrorLayout bgImage="/images/detail_background.png">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground font-typewriter animate-pulse">Summoning details from the void...</p>
        </div>
      </HorrorLayout>
    );
  }

  if (error || !story) {
    return (
      <HorrorLayout bgImage="/images/detail_background.png">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground font-typewriter">This story has vanished into the void...</p>
        </div>
      </HorrorLayout>
    );
  }

  return (
    <HorrorLayout bgImage="/images/detail_background.png">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Back */}
          <Link to="/home" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to feed
          </Link>

          {/* Cover */}
          <div className="h-64 bg-horror-gradient rounded-lg mb-8 relative overflow-hidden horror-border">
            <img src={story.coverImage} alt={story.title} className="absolute inset-0 w-full h-full object-cover"/>
            
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
              {user && (story.authorId === user.id || user.role === "admin") && (
                <div className="relative">
                  {!showDeleteStoryConfirm ? (
                    <button
                      onClick={() => setShowDeleteStoryConfirm(true)}
                      className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-destructive"
                      title="Delete story"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="absolute right-0 top-0 bg-background border border-border p-2 rounded-md shadow-lg z-50 flex items-center gap-2 min-w-[150px] horror-card animate-in fade-in zoom-in-95 duration-150">
                      <span className="text-[10px] text-foreground font-typewriter">Banish?</span>
                      <button
                        onClick={() => deleteStoryMutation.mutate()}
                        disabled={deleteStoryMutation.isPending}
                        className="px-2 py-1 bg-destructive text-destructive-foreground text-[10px] rounded hover:bg-destructive/80 transition-colors"
                      >
                        {deleteStoryMutation.isPending ? "..." : "Yes"}
                      </button>
                      <button
                        onClick={() => setShowDeleteStoryConfirm(false)}
                        className="px-2 py-1 bg-secondary text-foreground text-[10px] rounded hover:bg-secondary/80 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button 
                onClick={toggleBookmark}
                className={`p-2 rounded-md hover:bg-secondary transition-colors ${isBookmarked ? "text-primary text-glow-red" : "text-muted-foreground hover:text-primary"}`}
                title={isBookmarked ? "Remove from bound memory" : "Bind memory (Save)"}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-primary" : ""}`} />
              </button>
              <button 
                onClick={handleShare}
                className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                title="Spread the dread (Share)"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="font-typewriter text-foreground/90 leading-relaxed text-base whitespace-pre-line mb-10">
            {story.content}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between py-4 border-t border-border">
            <div className="flex items-center gap-6">
              <button
                onClick={() => likeMutation.mutate()}
                disabled={likeMutation.isPending}
                className={`flex items-center gap-2 text-sm transition-colors ${
                  story.likedByUser
                    ? "text-primary text-glow-red"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                <Heart className={`w-5 h-5 ${story.likedByUser ? "fill-primary" : ""}`} /> {story.likes}
              </button>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="w-5 h-5" /> {story.views}
              </span>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageCircle className="w-5 h-5" /> {story.comments}
              </span>
            </div>
            {user && story.authorId !== user.id && (
              <button
                onClick={() => setShowAdoptModal(true)}
                className="px-4 py-1.5 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Hand className="w-4 h-4" /> Adopt Horror
              </button>
            )}
          </div>

          {/* Comments section */}
          <div className="mt-10">
            <h3 className="font-creepy text-xl text-foreground mb-4">Whispers ({story.comments})</h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (commentText.trim()) {
                commentMutation.mutate(commentText);
              }
            }} className="horror-card p-4 mb-6">
              <textarea
                placeholder={user ? "Leave a whisper in the dark..." : "You must enter the void to leave a whisper..."}
                disabled={!user || commentMutation.isPending}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none h-20"
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={!user || commentMutation.isPending || !commentText.trim()}
                  className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {commentMutation.isPending ? "Whispering..." : "Whisper"}
                </button>
              </div>
            </form>

            <div className="space-y-4">
              {story.commentList && story.commentList.length > 0 ? (
                story.commentList.map((comment: any) => (
                   <div key={comment.id} className="horror-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary">{comment.username}</span>
                        {user && (comment.userId === user.id || story.authorId === user.id || user.role === "admin") && (
                          <div className="relative inline-block">
                            {deletingCommentId !== comment.id ? (
                              <button
                                onClick={() => setDeletingCommentId(comment.id)}
                                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"
                                title="Delete whisper"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <div className="absolute right-0 bottom-0 bg-background border border-border p-1.5 rounded-md shadow-lg z-50 flex items-center gap-1.5 min-w-[120px] horror-card animate-in fade-in zoom-in-95 duration-150">
                                <span className="text-[9px] text-foreground font-typewriter">Silence?</span>
                                <button
                                  onClick={() => {
                                    deleteCommentMutation.mutate(comment.id);
                                    setDeletingCommentId(null);
                                  }}
                                  disabled={deleteCommentMutation.isPending}
                                  className="px-1.5 py-0.5 bg-destructive text-destructive-foreground text-[9px] rounded hover:bg-destructive/80 transition-colors"
                                >
                                  {deleteCommentMutation.isPending ? "..." : "Yes"}
                                </button>
                                <button
                                  onClick={() => setDeletingCommentId(null)}
                                  className="px-1.5 py-0.5 bg-secondary text-foreground text-[9px] rounded hover:bg-secondary/80 transition-colors"
                                >
                                  No
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{comment.createdAt}</span>
                    </div>
                    <p className="text-sm text-foreground/90 font-typewriter whitespace-pre-wrap">{comment.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground font-typewriter text-center py-4">
                  Only silence echoes here...
                </p>
              )}
            </div>
          </div>

          {/* Adopt Modal */}
          {showAdoptModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background border border-border rounded-lg p-6 max-w-md w-full horror-card">
                <h3 className="font-creepy text-2xl text-foreground mb-4">Form a Covenant</h3>
                <p className="text-sm text-muted-foreground font-typewriter mb-4">
                  Why do you wish to bind yourself to this nightmare? Speak your intentions clearly...
                </p>
                <textarea
                  value={adoptNotes}
                  onChange={(e) => setAdoptNotes(e.target.value)}
                  placeholder="Your reasoning..."
                  rows={4}
                  className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none font-typewriter mb-4"
                />
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowAdoptModal(false)} className="px-4 py-2 rounded text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Flee
                  </button>
                  <button onClick={() => adoptMutation.mutate(adoptNotes)} disabled={adoptMutation.isPending} className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">
                    {adoptMutation.isPending ? "Binding..." : "Submit Covenant"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </HorrorLayout>
  );
};

export default StoryDetailPage;
