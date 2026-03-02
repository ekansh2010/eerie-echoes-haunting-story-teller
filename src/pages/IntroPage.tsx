import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import EerieEchoesIntro from "@/components/EerieEchoesIntro";
import PhantomVeilIntro from "@/components/PhantomVeilIntro";

const IntroPage = () => {
  const [stage, setStage] = useState<"eerie" | "phantom" | "done">("eerie");
  const navigate = useNavigate();

  const handleEerieComplete = useCallback(() => setStage("phantom"), []);
  const handlePhantomComplete = useCallback(() => navigate("/home"), [navigate]);

  return (
    <div className="bg-void min-h-screen">
      {stage === "eerie" && <EerieEchoesIntro onComplete={handleEerieComplete} />}
      {stage === "phantom" && <PhantomVeilIntro onComplete={handlePhantomComplete} />}
    </div>
  );
};

export default IntroPage;
