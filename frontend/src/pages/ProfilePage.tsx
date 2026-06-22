import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Skull, BookOpen, Award, CheckCircle, Hand } from "lucide-react";
import HorrorLayout from "@/components/HorrorLayout";
import StoryCard from "@/components/StoryCard";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const ProfilePage = () => {
  const { user, authFetch, verifyEmail } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"stories" | "likes" | "covenants">("stories");

  useEffect(() => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You must enter the void to view your profile.",
      });
      navigate("/login");
    }
  }, [user, navigate, toast]);

  const { data: stories = [], isLoading } = useQuery<any[]>({
    queryKey: ["stories"],
    queryFn: async () => {
      const res = await authFetch("/api/stories");
      if (!res.ok) {
        throw new Error("Failed to summon stories");
      }
      return res.json();
    },
    enabled: !!user,
  });

  const { data: applications = [] } = useQuery<any[]>({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await authFetch("/api/stories/applications");
      if (!res.ok) throw new Error("Failed to summon covenants");
      return res.json();
    },
    enabled: !!user,
  });

  if (!user) return null;

  const userStories = stories.filter((s) => s.authorId === user.id);
  const likedStories = stories.filter((s) => s.likedByUser);

  const handleVerify = async () => {
    try {
      await verifyEmail();
      toast({
        title: "Verified",
        description: "Your soul has been recognized by the void.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed",
        description: "Could not verify your email.",
      });
    }
  };

  // Determine Fear badge level based on number of stories published
  const getFearLevel = (count: number) => {
    if (count === 0) return "Fearless Initiate";
    if (count < 3) return "Shadow Walker";
    if (count < 5) return "Specter Hunter";
    return "Dread Master";
  };

  return (
    <HorrorLayout bgImage="/images/profile_background.png">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Profile header */}
          <div className="horror-card p-8 mb-8 text-center">
            <div className="w-24 h-24 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
              <Skull className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <h1 className="font-creepy text-2xl text-foreground mb-1">{user.username}</h1>
            <p className="text-sm text-muted-foreground font-typewriter mb-4">
              Collector of nightmares. Writer of things best left unread.
            </p>

            {/* Stats */}
            <div className="flex justify-center gap-8 mb-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">{userStories.length}</p>
                <p className="text-xs text-muted-foreground">Stories</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">
                  {userStories.reduce((acc, curr) => acc + (curr.likes || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Likes</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">
                  {userStories.reduce((acc, curr) => acc + (curr.views || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Views</p>
              </div>
            </div>

            {/* Fear Level badge and Verify */}
            <div className="flex flex-col items-center gap-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 horror-border">
                <Award className="w-4 h-4 text-primary" />
                <span className="text-xs text-primary font-medium">
                  Fear Level: {getFearLevel(userStories.length)}
                </span>
              </div>

              <div className="inline-flex items-center gap-2">
                {user.isVerified ? (
                  <span className="text-xs text-green-500 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Soul Verified
                  </span>
                ) : (
                  <button onClick={handleVerify} className="text-xs text-primary hover:text-primary/80 font-medium underline">
                    Verify Your Soul
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-border pb-2">
            <button
              onClick={() => setActiveTab("stories")}
              className={`text-sm font-medium transition-colors flex items-center gap-1 ${activeTab === "stories" ? "text-primary text-glow-red" : "text-muted-foreground hover:text-foreground"}`}
            >
              <BookOpen className="w-4 h-4" /> Published Horrors
            </button>
            <button
              onClick={() => setActiveTab("likes")}
              className={`text-sm font-medium transition-colors ${activeTab === "likes" ? "text-primary text-glow-red" : "text-muted-foreground hover:text-foreground"}`}
            >
              Favorited Whispers
            </button>
            <button
              onClick={() => setActiveTab("covenants")}
              className={`text-sm font-medium transition-colors ${activeTab === "covenants" ? "text-primary text-glow-red" : "text-muted-foreground hover:text-foreground"}`}
            >
              Adoption Covenants
            </button>
          </div>

          {activeTab === "stories" && (
            isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground font-typewriter animate-pulse">Summoning your nightmares...</p>
              </div>
            ) : userStories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {userStories.map((story, i) => (
                  <StoryCard key={story.id} story={story} index={i} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 horror-card p-6">
                <p className="text-muted-foreground font-typewriter mb-2">You haven't whispered any horrors yet...</p>
                <button
                  onClick={() => navigate("/upload")}
                  className="text-xs px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Write Your First Tale
                </button>
              </div>
            )
          )}

          {activeTab === "likes" && (
            likedStories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {likedStories.map((story, i) => (
                  <StoryCard key={story.id} story={story} index={i} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 horror-card p-6">
                <p className="text-muted-foreground font-typewriter">No favorited horrors yet...</p>
              </div>
            )
          )}

          {activeTab === "covenants" && (
            applications.length > 0 ? (
              <div className="space-y-4">
                {applications.map((app: any) => (
                  <div key={app.id} className="horror-card p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-foreground text-glow-red mb-1">{app.storyTitle}</h4>
                      <p className="text-xs text-muted-foreground font-typewriter">{app.notes}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${app.status === "approved" ? "bg-green-500/20 text-green-500" : app.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"}`}>
                      {app.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 horror-card p-6">
                <p className="text-muted-foreground font-typewriter">No covenants formed yet...</p>
              </div>
            )
          )}
        </motion.div>
      </div>
    </HorrorLayout>
  );
};

export default ProfilePage;
