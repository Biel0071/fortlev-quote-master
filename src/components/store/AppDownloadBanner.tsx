import { useEffect, useState } from "react";
import { X, Download, ChevronUp, Smartphone } from "lucide-react";
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
      <div className="w-full z-50 bg-primary text-primary-foreground">
        <button
          onClick={expand}
          className="w-full flex items-center justify-center gap-1.5 py-0.5 text-[10px] font-medium opacity-80 hover:opacity-100 transition-opacity"
        >
          <Smartphone className="h-3 w-3" />
          <span>10% OFF no app</span>
          <ChevronUp className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="w-full z-50 bg-primary text-primary-foreground">
        <div className="mx-auto relative flex items-center justify-center gap-2.5 px-10 py-2 sm:py-1.5 sm:px-4">
          <button
            onClick={handleBannerClick}
            className="flex items-center gap-2 bg-transparent border-none cursor-pointer group"
          >
            <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary-foreground/15 group-hover:bg-primary-foreground/25 transition-colors">
              <Smartphone className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs sm:text-sm font-semibold tracking-wide">
              Baixe o app e ganhe{" "}
              <span className="inline-flex items-center gap-0.5 bg-primary-foreground/20 px-1.5 py-0.5 rounded-md text-[11px] sm:text-xs font-bold">
                10% OFF
              </span>
            </span>
          </button>

          <button
            onClick={dismiss}
            className="absolute right-2 top-1/2 -translate-y-1/2 shrink-0 rounded-full p-1 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
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
