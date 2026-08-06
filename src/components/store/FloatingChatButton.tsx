import React from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";

export function FloatingChatButton() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  if (isAdmin) return null;

  return (
    <div className="fixed bottom-[calc(var(--mobile-nav-height)+15px)] right-4 md:bottom-8 md:right-8 z-50 flex flex-col gap-3">
      <Button
        className="w-12 h-12 rounded-full shadow-xl p-0 flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground"
        onClick={() => window.open("https://wa.me/553175193626", "_blank")}
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
      <Button
        className="w-12 h-12 rounded-full shadow-xl p-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white"
        onClick={() => window.open("https://wa.me/553175193626?text=Olá, preciso de ajuda com meu pedido", "_blank")}
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    </div>
  );
}
