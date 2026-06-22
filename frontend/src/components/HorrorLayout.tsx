import { ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { Mail, X } from "lucide-react";
import HorrorNav from "./HorrorNav";
import FogOverlay from "./effects/FogOverlay";
import FlashlightCursor from "./effects/FlashlightCursor";
import AudioController from "./AudioController";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const HorrorLayout = ({ children, bgImage }: { children: ReactNode, bgImage?: string }) => {
  const defaultBg = '/images/horror_background.png';
  const [showContact, setShowContact] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const contactMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stories/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error("Could not send message");
      return res.json();
    },
    onSuccess: () => {
      setShowContact(false);
      setName("");
      setEmail("");
      setMessage("");
      toast({
        title: "Message Sent",
        description: "The void has received your words.",
      });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Failed",
        description: err.message || "Failed to send message",
      });
    }
  });

  return (
    <div 
      className="min-h-screen bg-background relative bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.82), rgba(0, 0, 0, 0.94)), url('${bgImage || defaultBg}')`
      }}
    >
      <FogOverlay />
      <FlashlightCursor />
      <HorrorNav />
      <main className="pt-16 relative z-10">{children}</main>
      
      {/* Contact Trigger */}
      <button 
        onClick={() => setShowContact(true)}
        className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-primary/20 text-primary hover:bg-primary/40 border border-primary/50 transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)]"
        title="Contact the Void"
      >
        <Mail className="w-5 h-5" />
      </button>

      {/* Contact Modal */}
      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background border border-border rounded-lg p-6 max-w-md w-full horror-card relative">
            <button onClick={() => setShowContact(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-creepy text-2xl text-foreground mb-4">Contact the Void</h3>
            <p className="text-sm text-muted-foreground font-typewriter mb-4">
              Have you encountered a bug, or perhaps a ghost? Let us know.
            </p>
            <div className="space-y-4 mb-6">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name..."
                className="w-full bg-input border border-border rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-typewriter"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email..."
                className="w-full bg-input border border-border rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-typewriter"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your message..."
                rows={4}
                className="w-full bg-input border border-border rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none font-typewriter"
              />
            </div>
            <button 
              onClick={() => contactMutation.mutate()} 
              disabled={contactMutation.isPending || !name || !email || !message} 
              className="w-full py-2 rounded bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {contactMutation.isPending ? "Sending..." : "Send into the Dark"}
            </button>
          </motion.div>
        </div>
      )}

      <AudioController />
    </div>
  );
};

export default HorrorLayout;
