import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import { PASSWORD_RULE_MESSAGE, validatePassword } from "@/lib/validation";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { confirmPasswordReset } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!password || !confirmPassword) {
      toast({
        variant: "destructive",
        title: "Required fields",
        description: "Please fill in all the details.",
      });
      return;
    }

    if (!validatePassword(password)) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: PASSWORD_RULE_MESSAGE,
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Password Mismatch",
        description: "Passwords do not match.",
      });
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const message = await confirmPasswordReset(token, password);
      toast({
        title: "Key Forged",
        description: `${message} Please log in again.`,
      });
      navigate("/login");
    } catch (err: unknown) {
      const description = getErrorMessage(err, "This reset link is invalid or has expired.");
      setError(description);
      toast({
        variant: "destructive",
        title: "Failed to Reset",
        description,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-horror-gradient flex items-center justify-center px-4 bg-cover bg-center relative"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.82), rgba(0, 0, 0, 0.94)), url('/images/auth_background.webp')`
      }}
    >
      <div className="absolute top-6 left-6 z-10">
        <Link to="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border">
          <ArrowLeft className="w-4 h-4" /> Back to Login
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
          <p className="text-sm text-muted-foreground mt-2">Forge a new key</p>
        </div>

        {!token ? (
          <div className="horror-card p-6 space-y-4 text-center">
            <h3 className="font-creepy text-xl text-foreground">Broken Link</h3>
            <p className="text-xs text-muted-foreground font-typewriter">
              This reset link is missing its token. Request a new one from the login page.
            </p>
            <Link
              to="/login"
              className="block w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="horror-card p-6 space-y-4 relative">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            {error && (
              <p className="text-xs text-destructive font-typewriter">
                {error} You can request a new link from the{" "}
                <Link to="/login" className="text-primary hover:underline">login page</Link>.
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Forging..." : "Set New Password"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
