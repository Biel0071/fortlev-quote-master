import React from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FloatingChatButton() {
  return (
    <Button
      className="floating-chat-button w-14 h-14 rounded-full shadow-2xl p-0 flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground"
      onClick={() => window.open("https://wa.me/553175193626", "_blank")}
    >
      <MessageCircle className="w-7 h-7" />
    </Button>
  );
}
