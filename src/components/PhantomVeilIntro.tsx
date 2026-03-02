import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PhantomVeilIntro = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState<"zoom" | "glow" | "fade">("zoom");

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase("glow"), 1500),
      setTimeout(() => setPhase("fade"), 3000),
      setTimeout(() => onComplete(), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== "fade" ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-void"
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          {/* Red light strokes */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "glow" ? 1 : 0 }}
            transition={{ duration: 1 }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
              style={{ background: "radial-gradient(circle, hsl(0 85% 45% / 0.15) 0%, transparent 70%)" }} />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full"
              style={{ background: "linear-gradient(180deg, transparent, hsl(0 85% 45% / 0.3), transparent)" }} />
          </motion.div>

          {/* Logo */}
          <motion.div
            className="relative text-center"
            initial={{ scale: 3, opacity: 0 }}
            animate={{
              scale: phase === "zoom" ? 1 : 1.05,
              opacity: 1,
            }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            <h1 className="font-horror text-4xl sm:text-6xl md:text-8xl text-primary text-glow-red-strong tracking-wider">
              PHANTOM
            </h1>
            <motion.div
              className="h-px bg-primary/50 mx-auto my-2"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 1, duration: 1 }}
            />
            <h2 className="font-creepy text-2xl sm:text-4xl md:text-5xl text-foreground/80 tracking-[0.3em]">
              VEIL
            </h2>
          </motion.div>

          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, transparent 30%, hsl(0 0% 0%) 100%)" }} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default PhantomVeilIntro;
