import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";

const tracks = [
  "/audio/tense-horror-background.mp3",
  "/audio/scary-horror-music.mp3",
  "/audio/horror-music-box.mp3",
];

const AudioController = () => {
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.15);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showSlider, setShowSlider] = useState(false);

  useEffect(() => {
    const audio = new Audio(tracks[0]);
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    if (muted) {
      audioRef.current.pause();
    } else {
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => {});
    }
  }, [muted, volume]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2"
      onMouseEnter={() => setShowSlider(true)}
      onMouseLeave={() => setShowSlider(false)}
    >
      {showSlider && !muted && (
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-20 h-1 accent-primary"
        />
      )}
      <button
        onClick={() => setMuted(!muted)}
        className="p-3 rounded-full bg-secondary/80 backdrop-blur-sm horror-border hover:bg-primary/20 transition-colors"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? (
          <VolumeX className="w-5 h-5 text-muted-foreground" />
        ) : (
          <Volume2 className="w-5 h-5 text-primary" />
        )}
      </button>
    </motion.div>
  );
};

export default AudioController;
