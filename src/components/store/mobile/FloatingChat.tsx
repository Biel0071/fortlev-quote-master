import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVisitorTracker } from "@/hooks/useVisitorTracker";
import { createChatSession } from "@/utils/trackingClient";

const FloatingChatDialog = lazy(() => import("@/components/store/mobile/FloatingChatDialog"));

export function FloatingChat({
  phoneDigits,
  className,
}: {
  phoneDigits?: string;
  className?: string;
}) {
  const isMobile = useIsMobile();
  const tracker = useVisitorTracker();

  const [open, setOpen] = useState(false);
  const [attention, setAttention] = useState(false);
  const [helpBadge, setHelpBadge] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [scoreSnapshot, setScoreSnapshot] = useState<number>(0);

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

  const badgeLabel = useMemo(() => (helpBadge ? "Precisa de ajuda?" : ""), [helpBadge]);

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
