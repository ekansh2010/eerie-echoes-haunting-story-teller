import { ReactNode } from "react";
import HorrorNav from "./HorrorNav";
import FogOverlay from "./effects/FogOverlay";
import FlashlightCursor from "./effects/FlashlightCursor";
import AudioController from "./AudioController";

const HorrorLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-background relative">
      <FogOverlay />
      <FlashlightCursor />
      <HorrorNav />
      <main className="pt-16">{children}</main>
      <AudioController />
    </div>
  );
};

export default HorrorLayout;
