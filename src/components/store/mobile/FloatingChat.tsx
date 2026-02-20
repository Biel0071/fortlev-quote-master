import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getVisitorSessionId, trackVisitorEvent } from "@/utils/visitorEvents";

const FloatingChatDialog = lazy(() => import("@/components/store/mobile/FloatingChatDialog"));

export function FloatingChat({
  phoneDigits,
  className,
}: {
  phoneDigits?: string;
  className?: string;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [attention, setAttention] = useState(false);
  const [helpBadge, setHelpBadge] = useState(false);

  const sessionId = useMemo(() => getVisitorSessionId(), []);
  const wasOpenRef = useRef(false);

  const bottomClass = isMobile ? "bottom-[5.25rem]" : "bottom-4";

  useEffect(() => {
    const count = Number(sessionStorage.getItem("store_product_views_v1") || "0");
    if (count >= 3) setHelpBadge(true);

    const onProductVisit = () => {
      const next = Number(sessionStorage.getItem("store_product_views_v1") || "0");
      if (next >= 3) setHelpBadge(true);
    };

    window.addEventListener("store:product-visit", onProductVisit as any);
    return () => window.removeEventListener("store:product-visit", onProductVisit as any);
  }, []);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      setAttention(false);
      trackVisitorEvent({ sessionId, eventName: "chat_open" });
      return;
    }

    if (wasOpenRef.current) {
      trackVisitorEvent({ sessionId, eventName: "chat_close" });
    }
  }, [open, sessionId]);

  useEffect(() => {
    // after 20s, animate button a bit (if user hasn't opened chat)
    const t = window.setTimeout(() => {
      if (!open) setAttention(true);
    }, 20000);
    return () => window.clearTimeout(t);
  }, [open]);

  const badgeLabel = useMemo(() => {
    if (!helpBadge) return "";
    return "Precisa de ajuda?";
  }, [helpBadge]);

  return (
    <>
      <div className={cn("fixed right-4 z-50", bottomClass, className)}>
        {badgeLabel ? (
          <div className="mb-2 flex justify-end">
            <div className="rounded-full border border-border bg-background/80 supports-[backdrop-filter]:bg-background/60 backdrop-blur px-3 py-1 text-xs font-medium shadow-sm">
              {badgeLabel}
            </div>
          </div>
        ) : null}

        <Button
          variant="default"
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-2xl transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]",
            attention ? "pulse ring-4 ring-primary/20" : "",
          )}
          onClick={() => setOpen(true)}
          aria-label="Abrir assistente"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>

      {open ? (
        <Suspense fallback={null}>
          <FloatingChatDialog
            open={open}
            onOpenChange={setOpen}
            phoneDigits={phoneDigits}
            sessionId={sessionId}
            onMessageSent={() => trackVisitorEvent({ sessionId, eventName: "chat_message_sent" })}
            onWhatsAppClick={() => trackVisitorEvent({ sessionId, eventName: "whatsapp_click" })}
            onRedirectWhatsApp={() => trackVisitorEvent({ sessionId, eventName: "chat_redirect_whatsapp" })}
          />
        </Suspense>
      ) : null}
    </>
  );
}
