import React, { useState, lazy, Suspense } from "react";
import { MessageCircle, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import { useStoreContact } from "@/hooks/useStoreContact";

const FloatingChatDialog = lazy(() => import("@/components/store/mobile/FloatingChatDialog"));

export function FloatingChatButton() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const contact = useStoreContact();
  const [assistantOpen, setAssistantOpen] = useState(false);

  if (isAdmin) return null;

  // Hide on checkout/cart as requested in previous turns
  const shouldHide = location.pathname.startsWith("/checkout") || location.pathname.startsWith("/carrinho");
  if (shouldHide) return null;

  const whatsappNumber = contact.phoneDigits || "553175193626";

  return (
    <>
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+75px)] right-4 md:bottom-[15px] md:right-8 z-50 flex flex-col gap-3">
        {/* Assistente AI */}
        <Button
          className="w-12 h-12 rounded-full shadow-xl p-0 flex items-center justify-center bg-accent hover:bg-accent/90 text-accent-foreground"
          onClick={() => setAssistantOpen(true)}
          aria-label="Falar com assistente"
        >
          <Headphones className="w-6 h-6" />
        </Button>

        {/* WhatsApp Direto */}
        <Button
          className="w-12 h-12 rounded-full shadow-xl p-0 flex items-center justify-center bg-whatsapp hover:bg-whatsapp/90 text-whatsapp-foreground"
          onClick={() => window.open(`https://wa.me/${whatsappNumber}`, "_blank")}
          aria-label="WhatsApp"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </div>

      {assistantOpen && (
        <Suspense fallback={null}>
          <FloatingChatDialog
            open={assistantOpen}
            onOpenChange={setAssistantOpen}
            phoneDigits={contact.phoneDigits}
          />
        </Suspense>
      )}
    </>
  );
}
