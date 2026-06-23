import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Volume2, VolumeX } from "lucide-react";



const horrorQuotes = [
    "Can you hear them? The whispers in the walls...",
    "They are watching. They have always been watching.",
    "The blood knows the way.",
    "Only silence awaits you here.",
    "Every whisper is an echo of the departed.",
    "Do not look behind you.",
    "They feed on your fear.",
    "You cannot run from the echoes of your mind.",
];

interface EchoesProps {
    onComplete?: () => void;
}

const Echoes: React.FC<EchoesProps> = ({ onComplete }) => {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [phase, setPhase] = useState<"intro" | "glitch" | "shatter" | "scene" | "fade" | "complete">("intro");
    const [shattered, setShattered] = useState(false);
    const [mouse, setMouse] = useState({ x: -1000, y: -1000 });
    const [pupilOffset1, setPupilOffset1] = useState({ x: 0, y: 0 });
    const [pupilOffset2, setPupilOffset2] = useState({ x: 0, y: 0 });
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [quote, setQuote] = useState(horrorQuotes[0]);
    const [quoteIndex, setQuoteIndex] = useState(0);

    // Generate unique random glass-shatter trajectories for characters on mount
    const trajectories = useRef(
        Array.from({ length: 12 }).map(() => {
            const angle = Math.random() * Math.PI * 2;
            const velocity = 350 + Math.random() * 450; // violent explosion speed
            return {
                x: Math.cos(angle) * velocity,
                y: Math.sin(angle) * velocity + 450, // gravity fall
                rotate: (Math.random() - 0.5) * 1080,
                scale: 0.1 + Math.random() * 0.4,
            };
        })
    ).current;

    // 1. TIMING SEQUENCE CONTROL
    useEffect(() => {
        // 2.8s: Trigger glitching phase
        const tGlitch = setTimeout(() => {
            setPhase("glitch");
        }, 2800);

        // 3.4s: Trigger glass shattering explosion
        const tShatter = setTimeout(() => {
            setPhase("shatter");
            setShattered(true);

            // Play dramatic heavy drone sound on shatter
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = new Audio("/audio/tense-horror-background.mp3");
                audioRef.current.loop = true;
                audioRef.current.volume = 0.35;
                audioRef.current.play().catch(() => { });
            }
        }, 3400);

        // 4.2s: Shift to interactive skull horror page (lasts 5 seconds)
        const tScene = setTimeout(() => {
            setPhase("scene");
        }, 4200);

        // 9.2s: Start fading scene to black (4.2s + 5s = 9.2s)
        const tFade = setTimeout(() => {
            setPhase("fade");
        }, 9200);

        // 10.2s: Navigation redirect to homepage
        const tComplete = setTimeout(() => {
            setPhase("complete");
            if (audioRef.current) {
                audioRef.current.pause();
            }
            if (typeof window !== "undefined") {
                (window as any).__eerie_echoes_intro_shown = true;
            }
            if (onComplete) {
                onComplete();
            } else {
                navigate("/home");
            }
        }, 10200);

        return () => {
            clearTimeout(tGlitch);
            clearTimeout(tShatter);
            clearTimeout(tScene);
            clearTimeout(tFade);
            clearTimeout(tComplete);
        };
    }, [navigate, onComplete]);

    // 2. Cycle horror quotes during skull scene
    useEffect(() => {
        if (phase !== "scene") return;
        const interval = setInterval(() => {
            setQuoteIndex((prev) => {
                const next = (prev + 1) % horrorQuotes.length;
                setQuote(horrorQuotes[next]);
                return next;
            });
        }, 1600); // cycle faster
        return () => clearInterval(interval);
    }, [phase]);

    // 3. Initialize background horror music box
    useEffect(() => {
        const audio = new Audio("/audio/horror-music-box.mp3");
        audio.loop = true;
        audio.volume = 0.25;
        audioRef.current = audio;

        audio.play()
            .then(() => setIsAudioPlaying(true))
            .catch(() => console.log("Audio autoplay blocked. Click to enable."));

        return () => {
            audio.pause();
            audio.src = "";
        };
    }, []);

    // Initialize mouse in viewport center
    useEffect(() => {
        setMouse({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    }, []);

    // Handle first click to wake up audio context if blocked
    const handleInteraction = () => {
        if (audioRef.current && audioRef.current.paused) {
            audioRef.current.play()
                .then(() => setIsAudioPlaying(true))
                .catch((err) => console.log("Audio unlock failed: ", err));
        }
    };

    const toggleAudio = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!audioRef.current) return;
        if (isAudioPlaying) {
            audioRef.current.pause();
            setIsAudioPlaying(false);
        } else {
            audioRef.current.play()
                .then(() => setIsAudioPlaying(true))
                .catch((err) => console.log("Audio play failed: ", err));
        }
    };

    // Track cursor coordinates & calculate tracking offsets
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (phase === "intro" || phase === "glitch" || phase === "shatter") return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMouse({ x, y });

        // left eye 50.5%, 56% top; right eye 58.5%, 48% top
        const eye1X = rect.width * 0.505;
        const eye1Y = rect.height * 0.56;
        const eye2X = rect.width * 0.585;
        const eye2Y = rect.height * 0.48;

        const limit = 5;

        const dx1 = x - eye1X;
        const dy1 = y - eye1Y;
        const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
        setPupilOffset1({
            x: (dx1 / dist1) * Math.min(dist1 * 0.04, limit),
            y: (dy1 / dist1) * Math.min(dist1 * 0.04, limit),
        });

        const dx2 = x - eye2X;
        const dy2 = y - eye2Y;
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
        setPupilOffset2({
            x: (dx2 / dist2) * Math.min(dist2 * 0.04, limit),
            y: (dy2 / dist2) * Math.min(dist2 * 0.04, limit),
        });
    };

    const handleMouseLeave = () => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            setMouse({ x: rect.width / 2, y: rect.height / 2 });
        }
        setPupilOffset1({ x: 0, y: 0 });
        setPupilOffset2({ x: 0, y: 0 });
    };



    // CSS style configuration for title glitches and screen shakes
    const glitchStyle = phase === "glitch" ? {
        animation: "glitch 0.22s ease-in-out infinite, screenShake 0.35s ease-in-out infinite"
    } : {};

    return (
        <div
            ref={containerRef}
            onClick={handleInteraction}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative w-full h-screen bg-black overflow-hidden select-none flex items-center justify-center cursor-none"
        >
            <AnimatePresence>
                {/* PHASE 1: Glitching and Shattering title card */}
                {(phase === "intro" || phase === "glitch" || phase === "shatter") && (
                    <motion.div
                        key="text-intro"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden pointer-events-auto"
                    >
                        {/* Ambient ash particles */}
                        {Array.from({ length: 15 }).map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-1 h-1 rounded-full bg-red-900/30"
                                initial={{
                                    x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
                                    y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 800) + 50,
                                    opacity: 0,
                                }}
                                animate={{ y: [null, -120], opacity: [0, 0.4, 0] }}
                                transition={{
                                    duration: 4 + Math.random() * 4,
                                    repeat: Infinity,
                                    delay: Math.random() * 2,
                                }}
                            />
                        ))}

                        {/* Letter splitting text container */}
                        <div
                            style={glitchStyle}
                            className="flex gap-2 font-horror text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-wide select-none"
                        >
                            {"EERIE ECHOES".split("").map((letter, idx) => {
                                if (letter === " ") {
                                    return <div key={idx} className="w-4 sm:w-6 md:w-10" />;
                                }
                                const traj = trajectories[idx];
                                return (
                                    <motion.span
                                        key={idx}
                                        className="inline-block text-primary text-glow-red-strong origin-center"
                                        initial={{ opacity: 0, y: 30, scale: 0.8 }}
                                        animate={
                                            shattered
                                                ? {
                                                    x: traj.x,
                                                    y: traj.y,
                                                    rotate: traj.rotate,
                                                    scale: traj.scale,
                                                    opacity: 0,
                                                }
                                                : {
                                                    opacity: 1,
                                                    y: 0,
                                                    scale: 1,
                                                }
                                        }
                                        transition={
                                            shattered
                                                ? { duration: 0.8, ease: [0.1, 0.8, 0.15, 1] }
                                                : { duration: 0.5, delay: idx * 0.12, ease: "easeOut" } // smooth letters draw
                                        }
                                    >
                                        {letter}
                                    </motion.span>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* PHASE 2 & 3: Interactive skull horror page */}
                {(phase === "scene" || phase === "fade") && (
                    <motion.div
                        key="horror-scene"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: phase === "fade" ? 0 : 1 }}
                        transition={{ duration: 1.0, ease: "easeInOut" }}
                        className="absolute inset-0 w-full h-full flex items-center justify-center bg-black"
                    >
                        {/* A. Responsive Background Skull image */}
                        <motion.div
                            initial={{ scale: 1.05 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="relative w-full aspect-[16/9] max-h-screen z-0 pointer-events-none"
                        >
                            <img
                                src="/images/echoes_bg.png"
                                alt="Skull background"
                                className="w-full h-full object-cover"
                            />

                            {/* B. Glowing tracking eyes overlay */}
                            {/* Left view eye socket */}
                            <div
                                className="absolute w-[22px] h-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                                style={{ left: "50.5%", top: "56.0%" }}
                            >
                                <div
                                    className="absolute inset-0 bg-red-600/30 rounded-full blur-[8px] animate-pulse"
                                    style={{ animationDuration: "3000ms" }}
                                />
                                <div
                                    className="absolute w-2 h-2 bg-red-500 rounded-full blur-[0.5px] left-[7px] top-[7px] ease-out shadow-[0_0_8px_#dc2626]"
                                    style={{
                                        transform: `translate(${pupilOffset1.x}px, ${pupilOffset1.y}px)`,
                                        transitionProperty: "transform",
                                        transitionDuration: "100ms",
                                    }}
                                >
                                    <div className="absolute w-[1.5px] h-[3px] bg-yellow-400 rounded-full left-[2.5px] top-[1.5px]" />
                                </div>
                            </div>

                            {/* Right view eye socket */}
                            <div
                                className="absolute w-[26px] h-[26px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                                style={{ left: "58.5%", top: "48.0%" }}
                            >
                                <div
                                    className="absolute inset-0 bg-red-600/30 rounded-full blur-[10px] animate-pulse"
                                    style={{ animationDuration: "2500ms" }}
                                />
                                <div
                                    className="absolute w-2.5 h-2.5 bg-red-500 rounded-full blur-[0.5px] left-[8px] top-[8px] ease-out shadow-[0_0_10px_#dc2626]"
                                    style={{
                                        transform: `translate(${pupilOffset2.x}px, ${pupilOffset2.y}px)`,
                                        transitionProperty: "transform",
                                        transitionDuration: "100ms",
                                    }}
                                >
                                    <div className="absolute w-[1.5px] h-[4px] bg-yellow-400 rounded-full left-[3px] top-[2px]" />
                                </div>
                            </div>
                        </motion.div>



                        {/* E. Flashlight spotlights */}
                        <div
                            className="absolute inset-0 pointer-events-none z-15 mix-blend-multiply transition-opacity duration-300"
                            style={{
                                background: `radial-gradient(circle 240px at ${mouse.x}px ${mouse.y}px, rgba(255, 255, 255, 1) 0%, rgba(25, 10, 10, 0.85) 45%, rgba(0, 0, 0, 0.99) 100%)`,
                            }}
                        />
                        <div
                            className="absolute inset-0 pointer-events-none z-20"
                            style={{
                                background: `radial-gradient(circle 240px at ${mouse.x}px ${mouse.y}px, rgba(255, 0, 0, 0.05) 0%, transparent 80%)`,
                            }}
                        />
                        <div
                            className="absolute w-[480px] h-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-950/20 pointer-events-none z-25"
                            style={{
                                left: `${mouse.x}px`,
                                top: `${mouse.y}px`,
                                boxShadow:
                                    "inset 0 0 40px rgba(220, 38, 38, 0.03), 0 0 50px rgba(220, 38, 38, 0.02)",
                            }}
                        />

                        {/* Film Grain overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.04] z-30 bg-noise pointer-events-none animate-grain" />

                        {/* F. Foreground UI Elements */}
                        <div className="absolute inset-0 z-35 flex flex-col justify-between p-6 pointer-events-none">
                            {/* Sound toggle controls */}
                            <div className="w-full flex justify-end pointer-events-auto">
                                <button
                                    onClick={toggleAudio}
                                    className="flex items-center gap-2 p-3 rounded-full bg-black/60 border border-red-900/30 hover:border-primary/50 transition-all text-primary cursor-pointer shadow-[0_0_10px_rgba(0,0,0,0.5)] animate-pulse"
                                    title={isAudioPlaying ? "Mute" : "Unmute"}
                                >
                                    {isAudioPlaying ? (
                                        <Volume2 className="w-5 h-5 text-primary" />
                                    ) : (
                                        <VolumeX className="w-5 h-5 text-muted-foreground" />
                                    )}
                                </button>
                            </div>

                            {/* Bottom Quote box */}
                            <div className="w-full flex justify-center text-center mt-auto">
                                <div className="bg-black/75 backdrop-blur-sm border border-red-950/40 rounded-lg px-8 py-3 max-w-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                                    <AnimatePresence mode="wait">
                                        <motion.p
                                            key={quoteIndex}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            transition={{ duration: 0.6 }}
                                            className="font-creepy text-lg sm:text-2xl text-primary text-glow-red tracking-wide"
                                        >
                                            {quote}
                                        </motion.p>
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Echoes;