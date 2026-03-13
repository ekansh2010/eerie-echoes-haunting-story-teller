import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Search } from "lucide-react";
import HorrorLayout from "@/components/HorrorLayout";
import StoryCard from "@/components/StoryCard";
import JumpScare from "@/pages/JumpScare";
import { mockStories, categories } from "@/data/mockStories";

const HomePage = () => {
  // ── HorrorScene state ──────────────────────────────────────────────────────
  const [scrollY, setScrollY] = useState(0);
  const [mouseX, setMouseX] = useState(0);
  const [showJumpScare, setShowJumpScare] = useState(false);
  const [jumpScareEnabled, setJumpScareEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── HomePage state ─────────────────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Scroll + mouse tracking ────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      setMouseX((e.clientX - centerX) / centerX);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // ── Parallax helper ────────────────────────────────────────────────────────
  const parallaxStyle = (depth: number, additionalX = 0) => ({
    transform: `translateY(${scrollY * depth * 0.1}px) translateX(${mouseX * additionalX}px) scale(${1 + scrollY * 0.0002})`,
  });

  // ── Gate open on scroll ────────────────────────────────────────────────────
  // Gates swing open from center as user scrolls down
  // scrollY=0 → closed, scrollY=300 → fully open at 85deg
  const gateOpenProgress = Math.min(scrollY / 300, 1);
  const gateLeftStyle = {
    transformOrigin: "left bottom",
    transform: `perspective(800px) translateX(${mouseX * 20}px) rotateY(${gateOpenProgress * -85}deg)`,
    transition: "transform 0.7s ease-out",
  };
  const gateRightStyle = {
    transformOrigin: "right bottom",
    transform: `perspective(800px) translateX(${mouseX * -20}px) rotateY(${gateOpenProgress * 85}deg)`,
    transition: "transform 0.7s ease-out",
  };

  // ── Gate hover / jump scare ────────────────────────────────────────────────
  const handleGateHoverStart = useCallback(() => {
    if (!jumpScareEnabled) return;
    if (Math.random() < 0.3) {
      setShowJumpScare(true);
      setJumpScareEnabled(false);
      setTimeout(() => setJumpScareEnabled(true), 10000);
    } else {
      hoverTimerRef.current = setTimeout(() => {
        if (jumpScareEnabled) {
          setShowJumpScare(true);
          setJumpScareEnabled(false);
          setTimeout(() => setJumpScareEnabled(true), 10000);
        }
      }, 1500);
    }
  }, [jumpScareEnabled]);

  const handleGateHoverEnd = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const handleJumpScareComplete = useCallback(() => {
    setShowJumpScare(false);
  }, []);

  // ── Story filter ───────────────────────────────────────────────────────────
  const filtered = mockStories.filter((s) => {
    if (activeCategory !== "All" && s.category !== activeCategory) return false;
    if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // ── Bat configs — fixed at mount so positions don't re-randomize on render ─
  const batConfigs = useRef(
    [...Array(5)].map((_, i) => ({
      top:      `${5 + i * 7}%`,
      left:     `${-15 + i * 22}%`,
      animation: `bat-fly ${18 + Math.random() * 10}s linear ${i * 2.8}s infinite`,
    }))
  ).current;

  return (
    <HorrorLayout>
      <JumpScare isActive={showJumpScare} onComplete={handleJumpScareComplete} />

      {/* ── BACKGROUND: full-screen horror parallax scene ── */}
      <div
        ref={containerRef}
        className="fixed inset-0 z-0 w-full h-screen overflow-hidden bg-horror-void"
      >
        {/* Moon glow */}
        <div
          className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-30 pointer-events-none"
          style={{
            background: "radial-gradient(circle, hsl(var(--horror-moon)) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        {/* Background layer */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/background.png')",
            ...parallaxStyle(0.2, 5),
          }}
        />

        {/* Fog layer */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60 animate-fog-drift"
          style={{
            backgroundImage: "url('/images/background1.png')",
            ...parallaxStyle(0.3, 8),
          }}
        />

        {/* Fog overlay */}
        <div
          className="absolute inset-0 pointer-events-none animate-fog-drift"
          style={{
            background: "linear-gradient(180deg, transparent 0%, hsl(var(--horror-fog) / 0.3) 50%, hsl(var(--horror-fog) / 0.5) 100%)",
            opacity: Math.min(0.8, 0.3 + scrollY * 0.001),
          }}
        />

        {/* Trees */}
        <img
          src="/images/tree-left.png"
          alt=""
          className="absolute bottom-0 left-0 h-full w-auto max-w-[40%] object-contain object-bottom pointer-events-none"
          style={parallaxStyle(0.4, 15)}
        />
        <img
          src="/images/tree-right.png"
          alt=""
          className="absolute bottom-0 right-0 h-full w-auto max-w-[40%] object-contain object-bottom pointer-events-none"
          style={parallaxStyle(0.4, -15)}
        />

        {/* Gates — swing open on scroll, jump scare on hover */}
        <img
          src="/images/gate-left.png"
          alt="Gate"
          className="absolute bottom-0 left-[5%] h-[80%] w-auto object-contain object-bottom gate-interactive z-10"
          style={gateLeftStyle}
          onMouseEnter={handleGateHoverStart}
          onMouseLeave={handleGateHoverEnd}
        />
        <img
          src="/images/gate-right.png"
          alt="Gate"
          className="absolute bottom-0 right-[5%] h-[80%] w-auto object-contain object-bottom gate-interactive z-10"
          style={gateRightStyle}
          onMouseEnter={handleGateHoverStart}
          onMouseLeave={handleGateHoverEnd}
        />

        {/* Grass */}
        <img
          src="/images/grass.png"
          alt=""
          className="absolute bottom-0 left-0 w-full h-auto object-cover object-bottom pointer-events-none"
          style={parallaxStyle(0.7, 25)}
        />

        {/* Bats — slow natural swooping flight */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {batConfigs.map((bat, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                top:       bat.top,
                left:      bat.left,
                animation: bat.animation,
              }}
            >
              <svg width="30" height="20" viewBox="0 0 30 20" className="fill-horror-void/80">
                <path d="M15 8 L5 2 L8 8 L0 5 L7 10 L0 15 L8 12 L5 18 L15 12 L25 18 L22 12 L30 15 L23 10 L30 5 L22 8 L25 2 Z" />
              </svg>
            </div>
          ))}
        </div>

        {/* Film grain */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] animate-grain bg-noise" />

        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, transparent 0%, hsl(var(--horror-void)) 100%)",
            opacity: 0.6,
          }}
        />

        {/* Dark overlay so story content stays readable */}
        <div className="absolute inset-0 pointer-events-none bg-background/60" />
      </div>

      {/* ── FOREGROUND: story feed content ── */}
      <div className="relative z-10 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="font-horror text-3xl sm:text-5xl text-primary text-glow-red mb-3">
              Abandoned!!!
            </h1>
            <p className="text-muted-foreground font-typewriter text-sm sm:text-base max-w-lg mx-auto">
              Enter the realm where nightmares are written and fear is shared.
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-md mx-auto mb-8"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search the darkness..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-input border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors"
              />
            </div>
          </motion.div>

          {/* Categories */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-2 mb-10"
          >
            {["All", ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeCategory === cat
                    ? "bg-primary/20 text-primary horror-border"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </motion.div>

          {/* Trending heading */}
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="font-creepy text-xl text-foreground">Trending Horrors</h2>
          </div>

          {/* Story Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((story, i) => (
              <StoryCard key={story.id} story={story} index={i} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground font-typewriter">
                No horrors found in the void...
              </p>
            </div>
          )}

        </div>
      </div>
    </HorrorLayout>
  );
};

export default HomePage;