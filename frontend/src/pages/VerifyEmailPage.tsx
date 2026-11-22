import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, ArrowLeft, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/utils";

type VerifyStatus = "verifying" | "success" | "error";

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { user, verifyEmailToken } = useAuth();
  const [status, setStatus] = useState<VerifyStatus>(token ? "verifying" : "error");
  const [message, setMessage] = useState(
    token ? "" : "This verification link is missing its token."
  );
  // Tokens are single-use: guard against the effect running more than once for the same token.
  const attemptedToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token || attemptedToken.current === token) return;
    attemptedToken.current = token;

    verifyEmailToken(token)
      .then(() => {
        setStatus("success");
        setMessage("Your soul has been recognized by the void.");
      })
      .catch((err: unknown) => {
        setStatus("error");
        setMessage(getErrorMessage(err, "This verification link is invalid or has expired."));
      });
  }, [token, verifyEmailToken]);

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
          <p className="text-sm text-muted-foreground mt-2">Soul verification</p>
        </div>

        <div className="horror-card p-6 space-y-4 text-center">
          {status === "verifying" && (
            <>
              <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
              <p className="text-xs text-muted-foreground font-typewriter">Consulting the void...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
              <h3 className="font-creepy text-xl text-foreground">Soul Verified</h3>
              <p className="text-xs text-muted-foreground font-typewriter">{message}</p>
              <Link
                to={user ? "/profile" : "/login"}
                className="block w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {user ? "Go to Profile" : "Enter the Void"}
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-8 h-8 text-destructive mx-auto" />
              <h3 className="font-creepy text-xl text-foreground">Verification Failed</h3>
              <p className="text-xs text-muted-foreground font-typewriter">{message}</p>
              <p className="text-xs text-muted-foreground font-typewriter">
                You can request a fresh link from your profile.
              </p>
              <Link
                to={user ? "/profile" : "/login"}
                className="block w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {user ? "Go to Profile" : "Return to Login"}
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmailPage;
