import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, ArrowLeft, Loader2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const { login, resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Required fields",
        description: "Please fill in all the details.",
      });
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password, rememberMe);
      toast({
        title: "Welcome back",
        description: "You have re-entered the void.",
      });
      navigate("/home");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: err.message || "Invalid email or password.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!resetEmail || !newPassword) return;
    setResetting(true);
    try {
      await resetPassword(resetEmail, newPassword);
      toast({
        title: "Password Reset",
        description: "Your new passphrase is set.",
      });
      setShowReset(false);
      setResetEmail("");
      setNewPassword("");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to Reset",
        description: err.message || "Could not reset password.",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-horror-gradient flex items-center justify-center px-4 bg-cover bg-center relative"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.82), rgba(0, 0, 0, 0.94)), url('/images/auth_background.png')`
      }}
    >
      <div className="absolute top-6 left-6 z-10">
        <Link to="/home" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <Flame className="w-10 h-10 text-primary mx-auto mb-3 animate-pulseGlow" />
          <h1 className="font-horror text-2xl text-primary text-glow-red">Eerie Echoes</h1>
          <p className="text-sm text-muted-foreground mt-2">Enter if you dare</p>
        </div>

        <form onSubmit={handleSubmit} className="horror-card p-6 space-y-4 relative">
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
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="accent-primary" />
              Remember Me
            </label>
            <button type="button" onClick={() => setShowReset(true)} className="text-xs text-primary hover:underline">
              Forgot Password?
            </button>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Entering..." : "Enter the Void"}
          </button>
          <p className="text-center text-xs text-muted-foreground pt-2">
            New to the darkness?{" "}
            <Link to="/register" className="text-primary hover:underline">Register</Link>
          </p>
        </form>
      </motion.div>

      {/* Forgot Password Modal */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background border border-border rounded-lg p-6 max-w-sm w-full horror-card relative">
            <button onClick={() => setShowReset(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-creepy text-xl text-foreground mb-2">Reset Password</h3>
            <p className="text-xs text-muted-foreground font-typewriter mb-4">
              Enter your email and a new password to forge a new key.
            </p>
            <div className="space-y-4 mb-6">
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Account Email"
                className="w-full bg-input border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
                className="w-full bg-input border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <button 
              onClick={handleReset} 
              disabled={resetting || !resetEmail || !newPassword} 
              className="w-full py-2 rounded bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {resetting && <Loader2 className="w-4 h-4 animate-spin" />}
              {resetting ? "Resetting..." : "Forge Key"}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
