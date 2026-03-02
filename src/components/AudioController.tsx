import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";

const AudioController = () => {
  const [muted, setMuted] = useState(true);

  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      onClick={() => setMuted(!muted)}
      className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-secondary/80 backdrop-blur-sm horror-border hover:bg-primary/20 transition-colors"
      aria-label={muted ? "Unmute" : "Mute"}
    >
      {muted ? (
        <VolumeX className="w-5 h-5 text-muted-foreground" />
      ) : (
        <Volume2 className="w-5 h-5 text-primary" />
      )}
    </motion.button>
  );
};

export default AudioController;
