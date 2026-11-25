import { Navigate } from "react-router-dom";
import Echoes from "@/components/Echoes";
import { hasSeenIntro } from "@/lib/intro";

const IntroPage = () => {
  if (hasSeenIntro()) return <Navigate to="/home" replace />;
  return (
    <div className="bg-void min-h-screen overflow-hidden">
      <Echoes />
    </div>
  );
};

export default IntroPage;
