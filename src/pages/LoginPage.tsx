import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-horror-gradient flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <Flame className="w-10 h-10 text-primary mx-auto mb-3 animate-pulseGlow" />
          <h1 className="font-horror text-2xl text-primary text-glow-red">PhantomVeil</h1>
          <p className="text-sm text-muted-foreground mt-2">Enter if you dare</p>
        </div>

        <div className="horror-card p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <button className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Enter the Void
          </button>
          <p className="text-center text-xs text-muted-foreground">
            New to the darkness?{" "}
            <Link to="/register" className="text-primary hover:underline">Register</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
