import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVisitorTracker } from "@/hooks/useVisitorTracker";
import { createChatSession } from "@/utils/trackingClient";

const FloatingChatDialog = lazy(() => import("@/components/store/mobile/FloatingChatDialog"));

const DISMISS_KEY = "store_assistant_dismissed_v1";

export function FloatingChat({
  phoneDigits,
  className,
}: {
  phoneDigits?: string;
  className?: string;
}) {
  const isMobile = useIsMobile();
  const tracker = useVisitorTracker();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [attention, setAttention] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [scoreSnapshot, setScoreSnapshot] = useState<number>(0);

  const wasOpenRef = useRef(false);

  const shouldHideFloating = useMemo(
    () =>
      location.pathname.startsWith("/produto/") ||
      location.pathname.startsWith("/checkout") ||
      location.pathname.startsWith("/carrinho"),
    [location.pathname],
  );

  const bottomClass = isMobile
    ? "bottom-[calc(env(safe-area-inset-bottom)+56px)]"
    : "bottom-4";

  // (badge removido)

  // Abre automaticamente na Home após 8s (uma única vez), e não reabre após fechamento manual.
  useEffect(() => {
    if (shouldHideFloating) return;
    if (location.pathname !== "/") return;
    if (open) return;

    const dismissed = typeof window !== "undefined" ? localStorage.getItem(DISMISS_KEY) === "1" : true;
    if (dismissed) return;

    const t = window.setTimeout(() => {
      const dismissedNow = localStorage.getItem(DISMISS_KEY) === "1";
      if (!dismissedNow) setOpen(true);
    }, 8000);

    return () => window.clearTimeout(t);
  }, [location.pathname, open, shouldHideFloating]);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      setAttention(false);

      tracker.track({ type: "chat_open", path: window.location.pathname });

      createChatSession({ sessionToken: tracker.sessionToken, consentGiven: tracker.consentOk })
        .then((r) => {
          setChatSessionId(String((r as any)?.chat_session_id ?? ""));
          setScoreSnapshot(Number((r as any)?.score_snapshot ?? 0));
        })
        .catch(() => {
          setChatSessionId(null);
          setScoreSnapshot(0);
        });

      return;
    }

    if (wasOpenRef.current) {
      // considera fechamento como ação manual (persistir para não reabrir)
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        // ignore
      }

      tracker.track({ type: "chat_close", path: window.location.pathname });
      setChatSessionId(null);
      setScoreSnapshot(0);
    }
  }, [open]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!open) setAttention(true);
    }, 20000);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <>
      <div className={cn("fixed right-4 z-50", bottomClass, className)}>
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
            chatSessionId={chatSessionId}
            scoreSnapshot={scoreSnapshot}
            trackerSessionToken={tracker.sessionToken}
            consentOk={tracker.consentOk}
          />
        </Suspense>
      ) : null}
    </>
  );
}
