import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const EerieEchoesIntro = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState<"dark" | "letters" | "flicker" | "fadeout">("dark");
  const title = "EERIE ECHOES";
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Play whisper/horror music box during Eerie Echoes
    try {
      audioRef.current = new Audio("/audio/horror-music-box.mp3");
      audioRef.current.volume = 0.2;
      audioRef.current.play().catch(() => {});
    } catch {}

    const timers = [
      setTimeout(() => setPhase("letters"), 800),
      setTimeout(() => setPhase("flicker"), 4500),
      setTimeout(() => setPhase("fadeout"), 5500),
      setTimeout(() => {
        if (audioRef.current) audioRef.current.pause();
        onComplete();
      }, 6500),
    ];
    return () => {
      timers.forEach(clearTimeout);
      if (audioRef.current) audioRef.current.pause();
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== "fadeout" ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-void overflow-hidden"
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          {/* Fog layers */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 w-[200%] animate-fogDrift opacity-0"
              style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 50% / 0.08), transparent)" }} />
            <div className="absolute inset-0 w-[200%] animate-fogDrift opacity-0"
              style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 50% / 0.05), transparent)", animationDelay: "5s" }} />
          </div>

          {/* Particles */}
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-ash/30"
              initial={{
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                opacity: 0
              }}
              animate={{ y: [null, -100], opacity: [0, 0.5, 0] }}
              transition={{ duration: 4 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 3 }}
            />
          ))}

          {/* Title */}
          <div
            className={`relative ${phase === "flicker" ? "animate-flicker" : ""}`}
            style={phase === "flicker" ? { animation: "glitch 0.3s ease-in-out 3, screenShake 0.5s ease-in-out 1" } : {}}
          >
            <div className="flex gap-1 md:gap-3 font-horror text-3xl sm:text-5xl md:text-7xl lg:text-8xl">
              {title.split("").map((letter, i) => (
                <motion.span
                  key={i}
                  className={`${letter === " " ? "w-4 md:w-8" : ""} text-primary text-glow-red-strong`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={phase !== "dark" ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.15, duration: 0.4 }}
                >
                  {letter === " " ? "" : letter}
                </motion.span>
              ))}
            </div>
          </div>

          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, transparent 40%, hsl(0 0% 0%) 100%)" }} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default EerieEchoesIntro;
