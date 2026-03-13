import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import EerieEchoesIntro from "@/components/EerieEchoesIntro";
import Echoes from "@/components/Echoes";

const IntroPage = () => {
  const [stage, setStage] = useState<"eerie" | "echoes" | "done">("eerie");
  const navigate = useNavigate();

  const handleEerieComplete = useCallback(() => setStage("echoes"), []);
  const handleEchoesComplete = useCallback(() => navigate("/home"), [navigate]);

  return (
    <div className="bg-void min-h-screen">
      {stage === "eerie" && <EerieEchoesIntro onComplete={handleEerieComplete} />}
      {stage === "echoes" && <Echoes onComplete={handleEchoesComplete} />}
    </div>
  );
};

export default IntroPage;
