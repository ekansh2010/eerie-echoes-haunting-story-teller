import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Users, BookOpen, MessageCircle, Star, Ban, Trash2, ArrowLeft, Search, Check, X, Flame } from "lucide-react";
import HorrorLayout from "@/components/HorrorLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const AdminPage = () => {
  const { authFetch, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<"overview" | "feature" | "users" | "stories">("overview");

  // Search terms
  const [storySearch, setStorySearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // Confirmation states
  const [banningUserId, setBanningUserId] = useState<string | null>(null);
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);

  // Stats Query
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/stats");
      if (!res.ok) throw new Error("Could not summon statistics");
      return res.json();
    }
  });

  // Users Query
  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/users");
      if (!res.ok) throw new Error("Could not summon users");
      return res.json();
    },
    enabled: activeView === "users"
  });

  // Stories Query
  const { data: stories = [], isLoading: storiesLoading } = useQuery<any[]>({
    queryKey: ["adminStories", storySearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (storySearch) params.append("search", storySearch);
      const res = await authFetch(`/api/stories?${params.toString()}`);
      if (!res.ok) throw new Error("Could not summon stories");
      return res.json();
    },
    enabled: activeView === "feature" || activeView === "stories"
  });

  // Feature Toggle Mutation
  const toggleFeatureMutation = useMutation({
    mutationFn: async (storyId: string) => {
      const res = await authFetch(`/api/admin/stories/${storyId}/feature`, { method: "POST" });
      if (!res.ok) throw new Error("Could not toggle feature status");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["adminStories"] });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast({
        title: data.featured ? "Featured Content" : "Unfeatured Content",
        description: data.featured ? "This nightmare is now highlighted on the feed." : "The horror has retreated back to the shadows.",
      });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Failed to feature content",
        description: err.message || "Something went wrong in the void.",
      });
    }
  });

  // Ban User Mutation
  const banUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await authFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not banish user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      setBanningUserId(null);
      toast({
        title: "Banishment Successful",
        description: "The trespasser and all of their whispers have been wiped from existence.",
      });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Banishment Failed",
        description: err.message || "Something went wrong in the void.",
      });
    }
  });

  // Delete Story Mutation
  const deleteStoryMutation = useMutation({
    mutationFn: async (storyId: string) => {
      const res = await authFetch(`/api/stories/${storyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete story");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminStories"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      setDeletingStoryId(null);
      toast({
        title: "Story Vanished",
        description: "The story has been wiped from the dark void.",
      });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Purge Failed",
        description: err.message || "Something went wrong in the void.",
      });
    }
  });

  // User filter
  const filteredUsers = users.filter((u: any) =>
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (!user || user.role !== "admin") {
    return (
      <HorrorLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Shield className="w-16 h-16 text-destructive animate-pulse mb-4" />
          <h1 className="font-creepy text-3xl text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground font-typewriter text-sm max-w-md">
            Only shadows of high authority can enter the Admin Sanctum. Turn back before the darkness claims you.
          </p>
        </div>
      </HorrorLayout>
    );
  }

  return (
    <HorrorLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary text-glow-red animate-pulse" />
              <h1 className="font-creepy text-3xl text-foreground">Admin Sanctum</h1>
            </div>
            {activeView !== "overview" && (
              <button
                onClick={() => {
                  setActiveView("overview");
                  setStorySearch("");
                  setUserSearch("");
                }}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors font-typewriter"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="horror-card p-5">
              <BookOpen className="w-5 h-5 text-primary mb-2" />
              <p className="text-2xl font-semibold text-foreground">
                {statsLoading ? <span className="animate-pulse">...</span> : stats?.totalStories ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Total Stories</p>
            </div>

            <div className="horror-card p-5">
              <Users className="w-5 h-5 text-primary mb-2" />
              <p className="text-2xl font-semibold text-foreground">
                {statsLoading ? <span className="animate-pulse">...</span> : stats?.activeUsers ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Active Users</p>
            </div>

            <div className="horror-card p-5">
              <MessageCircle className="w-5 h-5 text-primary mb-2" />
              <p className="text-2xl font-semibold text-foreground">
                {statsLoading ? <span className="animate-pulse">...</span> : stats?.totalComments ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Total Whispers</p>
            </div>

            <div className="horror-card p-5">
              <Shield className="w-5 h-5 text-primary mb-2" />
              <p className="text-2xl font-semibold text-foreground">
                {statsLoading ? <span className="animate-pulse">...</span> : stats?.totalReports ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Dread Inquiries</p>
            </div>
          </div>

          {/* Views Container */}
          <AnimatePresence mode="wait">
            
            {/* 1. Overview Dashboard */}
            {activeView === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h2 className="font-creepy text-xl text-foreground mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveView("feature")}
                    className="horror-card p-4 flex items-center gap-3 hover:border-primary/40 transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.1)] text-left group"
                  >
                    <Star className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Feature Content</p>
                      <p className="text-xs text-muted-foreground">Highlight stories on feed</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveView("users")}
                    className="horror-card p-4 flex items-center gap-3 hover:border-destructive/40 transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.1)] text-left group"
                  >
                    <Ban className="w-5 h-5 text-destructive group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Ban Users</p>
                      <p className="text-xs text-muted-foreground">Exile malicious souls</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveView("stories")}
                    className="horror-card p-4 flex items-center gap-3 hover:border-destructive/40 transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.1)] text-left group"
                  >
                    <Trash2 className="w-5 h-5 text-destructive group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Delete Stories</p>
                      <p className="text-xs text-muted-foreground">Purge nightmare records</p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* 2. Feature Content Management */}
            {activeView === "feature" && (
              <motion.div
                key="feature"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="font-creepy text-xl text-foreground">Highlight Content</h2>
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search stories..."
                      value={storySearch}
                      onChange={(e) => setStorySearch(e.target.value)}
                      className="w-full bg-input border border-border rounded-md pl-9 pr-4 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                </div>

                {storiesLoading ? (
                  <p className="text-xs text-muted-foreground font-typewriter animate-pulse py-8 text-center">Summoning stories...</p>
                ) : stories.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-typewriter py-8 text-center">Only echoes remain in this query.</p>
                ) : (
                  <div className="horror-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-typewriter border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-secondary/35 text-muted-foreground">
                            <th className="p-3">Title</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Author</th>
                            <th className="p-3 text-center">Featured</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stories.map((story) => (
                            <tr key={story.id} className="border-b border-border/40 hover:bg-secondary/10 transition-colors">
                              <td className="p-3 font-medium text-foreground">{story.title}</td>
                              <td className="p-3 text-muted-foreground">{story.category}</td>
                              <td className="p-3 text-muted-foreground">{story.author?.username || "Unknown"}</td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => toggleFeatureMutation.mutate(story.id)}
                                  disabled={toggleFeatureMutation.isPending}
                                  className="p-1.5 rounded hover:bg-secondary transition-colors"
                                  title={story.featured ? "Remove highlight" : "Highlight story"}
                                >
                                  {story.featured ? (
                                    <Star className="w-4 h-4 fill-primary text-primary drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                                  ) : (
                                    <Star className="w-4 h-4 text-muted-foreground hover:text-primary" />
                                  )}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 3. Ban / Exile Users Management */}
            {activeView === "users" && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="font-creepy text-xl text-foreground">Exile Trespassers</h2>
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full bg-input border border-border rounded-md pl-9 pr-4 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                </div>

                {usersLoading ? (
                  <p className="text-xs text-muted-foreground font-typewriter animate-pulse py-8 text-center">Summoning users...</p>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-typewriter py-8 text-center">No souls wander into this search.</p>
                ) : (
                  <div className="horror-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-typewriter border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-secondary/35 text-muted-foreground">
                            <th className="p-3">Username</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Joined</th>
                            <th className="p-3">Role</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((u) => (
                            <tr key={u.id} className="border-b border-border/40 hover:bg-secondary/10 transition-colors">
                              <td className="p-3 font-semibold text-foreground flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px]">
                                  {u.username[0]}
                                </span>
                                {u.username}
                              </td>
                              <td className="p-3 text-muted-foreground">{u.email}</td>
                              <td className="p-3 text-muted-foreground">{u.createdAt}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${u.role === "admin" ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"}`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                {u.id === user.id ? (
                                  <span className="text-[10px] text-muted-foreground italic">You</span>
                                ) : (
                                  <div className="relative inline-block">
                                    {banningUserId !== u.id ? (
                                      <button
                                        onClick={() => setBanningUserId(u.id)}
                                        className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"
                                        title="Exile User"
                                      >
                                        <Ban className="w-4 h-4" />
                                      </button>
                                    ) : (
                                      <div className="absolute right-0 bottom-0 bg-background border border-border p-1.5 rounded-md shadow-lg z-50 flex items-center gap-1.5 min-w-[120px] horror-card animate-in fade-in duration-100">
                                        <span className="text-[9px] text-foreground">Exile?</span>
                                        <button
                                          onClick={() => banUserMutation.mutate(u.id)}
                                          disabled={banUserMutation.isPending}
                                          className="p-1 bg-destructive text-destructive-foreground text-[8px] rounded hover:bg-destructive/80"
                                        >
                                          Yes
                                        </button>
                                        <button
                                          onClick={() => setBanningUserId(null)}
                                          className="p-1 bg-secondary text-foreground text-[8px] rounded hover:bg-secondary/80"
                                        >
                                          No
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 4. Delete Nightmare Records Management */}
            {activeView === "stories" && (
              <motion.div
                key="stories"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="font-creepy text-xl text-foreground">Purge Nightmare Records</h2>
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search title/content..."
                      value={storySearch}
                      onChange={(e) => setStorySearch(e.target.value)}
                      className="w-full bg-input border border-border rounded-md pl-9 pr-4 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                </div>

                {storiesLoading ? (
                  <p className="text-xs text-muted-foreground font-typewriter animate-pulse py-8 text-center">Summoning records...</p>
                ) : stories.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-typewriter py-8 text-center">No record details exist in this darkness.</p>
                ) : (
                  <div className="horror-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-typewriter border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-secondary/35 text-muted-foreground">
                            <th className="p-3">Title</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Author</th>
                            <th className="p-3">Created</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stories.map((story) => (
                            <tr key={story.id} className="border-b border-border/40 hover:bg-secondary/10 transition-colors">
                              <td className="p-3 font-medium text-foreground">{story.title}</td>
                              <td className="p-3 text-muted-foreground">{story.category}</td>
                              <td className="p-3 text-muted-foreground">{story.author?.username || "Unknown"}</td>
                              <td className="p-3 text-muted-foreground">{story.createdAt}</td>
                              <td className="p-3 text-center">
                                <div className="relative inline-block">
                                  {deletingStoryId !== story.id ? (
                                    <button
                                      onClick={() => setDeletingStoryId(story.id)}
                                      className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"
                                      title="Purge Story"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <div className="absolute right-0 bottom-0 bg-background border border-border p-1.5 rounded-md shadow-lg z-50 flex items-center gap-1.5 min-w-[120px] horror-card animate-in fade-in duration-100">
                                      <span className="text-[9px] text-foreground">Banish?</span>
                                      <button
                                        onClick={() => deleteStoryMutation.mutate(story.id)}
                                        disabled={deleteStoryMutation.isPending}
                                        className="p-1 bg-destructive text-destructive-foreground text-[8px] rounded hover:bg-destructive/80"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        onClick={() => setDeletingStoryId(null)}
                                        className="p-1 bg-secondary text-foreground text-[8px] rounded hover:bg-secondary/80"
                                      >
                                        No
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>

        </motion.div>
      </div>
    </HorrorLayout>
  );
};

export default AdminPage;
