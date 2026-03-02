import { useState, useEffect, useRef } from "react";
import "@/styles/netflix-intro.css";

const FurSpans = () => (
  <>
    {Array.from({ length: 31 }, (_, i) => (
      <span key={i} className={`fur-${31 - i}`} />
    ))}
  </>
);

const LampSpans = () => (
  <>
    {Array.from({ length: 14 }, (_, i) => (
      <span key={i} className={`lamp-${i + 1}`} />
    ))}
  </>
);

const PhantomVeilIntro = ({ onComplete }: { onComplete: () => void }) => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      audioRef.current = new Audio("/audio/scary-horror-music.mp3");
      audioRef.current.volume = 0.3;
      audioRef.current.play().catch(() => {});
    } catch {}

    const fadeTimer = setTimeout(() => setFading(true), 4000);
    const completeTimer = setTimeout(() => {
      setVisible(false);
      if (audioRef.current) audioRef.current.pause();
      onComplete();
    }, 6000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
      if (audioRef.current) audioRef.current.pause();
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className="netflix-intro-container"
      style={{ opacity: fading ? 0 : 1 }}
      dangerouslySetInnerHTML={{
        __html: `
          <netflixintro letter="I">
            <div class="helper-1">
              <div class="effect-brush">
                ${Array.from({ length: 31 }, (_, i) => `<span class="fur-${31 - i}"></span>`).join("")}
              </div>
              <div class="effect-lumieres">
                ${Array.from({ length: 14 }, (_, i) => `<span class="lamp-${i + 1}"></span>`).join("")}
              </div>
            </div>
          </netflixintro>
        `,
      }}
    />
  );
};

export default PhantomVeilIntro;
