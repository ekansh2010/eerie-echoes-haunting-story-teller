import { motion } from "framer-motion";
import { Shield, Users, BookOpen, MessageCircle, BarChart3, Trash2, Ban, Star } from "lucide-react";
import HorrorLayout from "@/components/HorrorLayout";

const stats = [
  { label: "Total Stories", value: "1,247", icon: BookOpen },
  { label: "Active Users", value: "8,932", icon: Users },
  { label: "Comments", value: "23.4k", icon: MessageCircle },
  { label: "Reports", value: "12", icon: Shield },
];

const AdminPage = () => {
  return (
    <HorrorLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-8">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="font-creepy text-3xl text-foreground">Admin Sanctum</h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.label} className="horror-card p-5">
                <stat.icon className="w-5 h-5 text-primary mb-2" />
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <h2 className="font-creepy text-xl text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button className="horror-card p-4 flex items-center gap-3 hover:border-primary/40 transition-colors text-left">
              <Star className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Feature Content</p>
                <p className="text-xs text-muted-foreground">Highlight top stories</p>
              </div>
            </button>
            <button className="horror-card p-4 flex items-center gap-3 hover:border-destructive/40 transition-colors text-left">
              <Ban className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-foreground">Ban Users</p>
                <p className="text-xs text-muted-foreground">Manage violations</p>
              </div>
            </button>
            <button className="horror-card p-4 flex items-center gap-3 hover:border-destructive/40 transition-colors text-left">
              <Trash2 className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-foreground">Delete Stories</p>
                <p className="text-xs text-muted-foreground">Remove content</p>
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    </HorrorLayout>
  );
};

export default AdminPage;
