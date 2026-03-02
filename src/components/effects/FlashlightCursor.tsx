import { useEffect, useCallback } from "react";

const FlashlightCursor = () => {
  const handleMouseMove = useCallback((e: MouseEvent) => {
    document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
    document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-20"
      style={{
        background: `radial-gradient(circle 150px at var(--mouse-x, 50%) var(--mouse-y, 50%), hsl(0 0% 100% / 0.03) 0%, transparent 100%)`,
      }}
    />
  );
};

export default FlashlightCursor;
