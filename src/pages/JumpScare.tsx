import { useEffect, useRef } from "react";

interface JumpScareProps {
  isActive: boolean;
  onComplete: () => void;
}

const JumpScare = ({ isActive, onComplete }: JumpScareProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (isActive) {
      // Play scare sound
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      
      // Auto-hide after animation
      const timer = setTimeout(onComplete, 800);
      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <>
      <audio ref={audioRef} src="/audio/scary-horror-music-351315.mp3" />
      
      {/* Full screen flash */}
      <div className="fixed inset-0 z-[100] pointer-events-none animate-jump-scare-flash">
        {/* Scary face overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-horror-void/90">
          <div className="relative animate-jump-scare-shake">
            {/* Ghostly skull/face using CSS */}
            <div className="relative w-[300px] h-[400px] md:w-[400px] md:h-[500px]">
              {/* Face shape */}
              <div 
                className="absolute inset-0 rounded-[50%_50%_45%_45%]"
                style={{
                  background: "radial-gradient(ellipse at 50% 40%, hsl(var(--horror-ghost)) 0%, hsl(var(--horror-fog)) 40%, transparent 70%)",
                  filter: "blur(2px)",
                }}
              />
              
              {/* Left eye socket */}
              <div 
                className="absolute top-[25%] left-[20%] w-[25%] h-[20%] rounded-full bg-horror-void animate-pulse"
                style={{
                  boxShadow: "inset 0 0 30px hsl(var(--horror-blood)), 0 0 40px hsl(var(--horror-blood) / 0.5)",
                }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-horror-blood animate-ping" />
              </div>
              
              {/* Right eye socket */}
              <div 
                className="absolute top-[25%] right-[20%] w-[25%] h-[20%] rounded-full bg-horror-void animate-pulse"
                style={{
                  boxShadow: "inset 0 0 30px hsl(var(--horror-blood)), 0 0 40px hsl(var(--horror-blood) / 0.5)",
                }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-horror-blood animate-ping" />
              </div>
              
              {/* Nose cavity */}
              <div 
                className="absolute top-[50%] left-1/2 -translate-x-1/2 w-[15%] h-[12%]"
                style={{
                  background: "linear-gradient(180deg, hsl(var(--horror-void)) 0%, transparent 100%)",
                  clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                }}
              />
              
              {/* Mouth - screaming */}
              <div 
                className="absolute bottom-[15%] left-1/2 -translate-x-1/2 w-[50%] h-[25%] rounded-[50%] bg-horror-void overflow-hidden"
                style={{
                  boxShadow: "inset 0 -10px 30px hsl(var(--horror-blood) / 0.5)",
                }}
              >
                {/* Teeth */}
                <div className="absolute top-0 left-0 w-full flex justify-center gap-1">
                  {[...Array(8)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-3 h-6 bg-horror-ghost/80 rounded-b-sm"
                      style={{
                        transform: `rotate(${(i - 3.5) * 5}deg)`,
                      }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Dripping effect */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute bottom-0 w-2 bg-horror-blood/60 rounded-full animate-drip"
                    style={{
                      left: `${20 + i * 15}%`,
                      height: `${30 + Math.random() * 50}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </div>
            
            {/* Glitch text */}
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="font-horror text-4xl md:text-6xl text-horror-blood animate-flicker tracking-wider">
                GET OUT
              </span>
            </div>
          </div>
        </div>
        
        {/* Screen shake lines */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-full h-px bg-horror-ghost"
              style={{
                top: `${i * 5}%`,
                animation: `glitch-line ${0.1 + Math.random() * 0.2}s infinite`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default JumpScare;
