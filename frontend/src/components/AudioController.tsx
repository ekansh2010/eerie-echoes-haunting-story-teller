import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";

interface AudioTrack {
  id: string;
  title: string;
  url: string;
  duration?: string;
  credit?: string;
}

const AudioController = () => {
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.15);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showSlider, setShowSlider] = useState(false);

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        const res = await fetch("/api/audio-tracks");
        if (res.ok) {
          const data = await res.json();
          setTracks(data);
          if (data.length > 0) {
            const audio = new Audio(data[0].url);
            audio.loop = true;
            audio.volume = volume;
            audioRef.current = audio;
            
            // Only play if not muted initially
            if (!muted) {
              audio.play().catch(() => {
                console.log("Autoplay blocked by browser policy. Interaction required.");
              });
            }
          }
        }
      } catch (error) {
        console.error("Error loading audio tracks:", error);
      }
    };

    fetchTracks();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
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
  }, [muted, volume, tracks]); // Include tracks in dependencies to play once tracks are loaded

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
        title={tracks.length > 0 ? `Playing: ${tracks[0].title}` : undefined}
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
