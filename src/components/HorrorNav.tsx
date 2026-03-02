import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, PenTool, User, LogIn, Shield, Flame } from "lucide-react";

const navItems = [
{ path: "/home", label: "Feed", icon: Home },
{ path: "/upload", label: "Write", icon: PenTool },
{ path: "/profile", label: "Profile", icon: User }];


const HorrorNav = () => {
  const location = useLocation();

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-40 bg-void/90 backdrop-blur-md border-b border-border">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/home" className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-primary animate-pulseGlow" />
            <span className="font-horror text-lg text-primary text-glow-red">

            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive ?
                  "bg-primary/10 text-primary" :
                  "text-muted-foreground hover:text-foreground hover:bg-secondary"}`
                  }>
                  
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>);

            })}
            <Link
              to="/login"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ml-2">
              
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Enter</span>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>);

};

export default HorrorNav;