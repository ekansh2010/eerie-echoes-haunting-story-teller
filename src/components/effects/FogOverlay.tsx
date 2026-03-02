import { useEffect } from "react";

const FogOverlay = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      <div
        className="absolute inset-0 w-[200%] opacity-0 animate-fogDrift"
        style={{
          background: "linear-gradient(90deg, transparent 0%, hsl(0 0% 60% / 0.04) 30%, hsl(0 0% 60% / 0.06) 50%, hsl(0 0% 60% / 0.04) 70%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-0 w-[200%] opacity-0 animate-fogDrift"
        style={{
          background: "linear-gradient(90deg, transparent 0%, hsl(0 0% 60% / 0.03) 40%, hsl(0 0% 60% / 0.05) 60%, transparent 100%)",
          animationDelay: "7s",
        }}
      />
    </div>
  );
};

export default FogOverlay;
