import { useEffect, useState, useCallback } from "react";
import { X, Download, ChevronUp } from "lucide-react";
import { useStoreContact } from "@/hooks/useStoreContact";
import { AppDownloadConfirmDialog } from "./AppDownloadConfirmDialog";

const DISMISS_KEY = "APP_BANNER_DISMISSED_AT";
const REEXPAND_MS = 15_000;

function getDownloadUrl() {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (!projectId) return null;
  return `https://${projectId}.supabase.co/functions/v1/download-app`;
}

export function AppDownloadBanner() {
  const [mode, setMode] = useState<"full" | "compact">("full");
  const [dialogOpen, setDialogOpen] = useState(false);
  const appUrl = getDownloadUrl();
  const contact = useStoreContact();
  const waLink = contact.phoneDigits
    ? `https://wa.me/55${contact.phoneDigits}`
    : "";

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed && Date.now() - Number(dismissed) < REEXPAND_MS) {
        setMode("compact");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (mode !== "compact") return;
    const timer = setTimeout(() => {
      setMode("full");
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {}
    }, REEXPAND_MS);
    return () => clearTimeout(timer);
  }, [mode]);

  const dismiss = () => {
    setMode("compact");
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  const expand = () => {
    setMode("full");
    try {
      localStorage.removeItem(DISMISS_KEY);
    } catch {}
  };

  const handleBannerClick = () => {
    trackAppEvent("app_banner_click");
    trackAppEvent("app_popup_open");
    setDialogOpen(true);
  };

  const trackAppEvent = (type: string) => {
    try {
      window.dispatchEvent(
        new CustomEvent("store:track-app-event", { detail: { type } })
      );
    } catch {}
  };

  if (mode === "compact") {
    return (
      <div className="w-full z-50 bg-gradient-to-r from-[hsl(222,70%,22%)] to-[hsl(222,60%,38%)] text-white">
        <button
          onClick={expand}
          className="w-full flex items-center justify-center gap-1.5 py-0.5 text-[10px] font-medium opacity-80 hover:opacity-100 transition-opacity"
        >
          <Download className="h-3 w-3" />
          <span>10% OFF no app</span>
          <ChevronUp className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="w-full z-50 bg-gradient-to-r from-[hsl(222,70%,22%)] via-[hsl(222,65%,30%)] to-[hsl(222,60%,38%)] text-white shadow-sm">
        <div className="mx-auto relative flex items-center justify-center gap-2 px-10 py-1.5 sm:py-1.5 sm:px-4">
          <button
            onClick={handleBannerClick}
            className="flex items-center gap-1.5 text-white no-underline bg-transparent border-none cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-semibold animate-pulse">
              Baixe o app e ganhe 10% OFF!
            </span>
          </button>

          <button
            onClick={dismiss}
            className="absolute right-2 top-1/2 -translate-y-1/2 shrink-0 rounded-full bg-gradient-to-br from-white/25 to-white/10 p-1 transition-all hover:from-white/35 hover:to-white/20"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5 text-white drop-shadow" />
          </button>
        </div>
      </div>

      <AppDownloadConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        apkUrl={appUrl}
        whatsappLink={waLink}
        onTrack={trackAppEvent}
      />
    </>
  );
}
