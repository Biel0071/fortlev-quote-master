import { useEffect, useState } from "react";
import { X, ChevronUp, ChevronRight, Smartphone, MessageCircle } from "lucide-react";
import { useStoreContact } from "@/hooks/useStoreContact";
import { AppDownloadConfirmDialog } from "./AppDownloadConfirmDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "APP_BANNER_DISMISSED_AT";
const DOWNLOAD_CLICKED_KEY = "app_download_clicked";
const REEXPAND_MS = 15_000;

function getDownloadUrl() {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (!projectId) return null;
  return `https://${projectId}.supabase.co/functions/v1/download-app`;
}

export function AppDownloadBanner() {
  const [mode, setMode] = useState<"full" | "compact">("full");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [downloadClicked, setDownloadClicked] = useState(false);
  const appUrl = getDownloadUrl();
  const contact = useStoreContact();
  const waLink = contact.phoneDigits
    ? `https://wa.me/55${contact.phoneDigits}`
    : "";

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      const clicked = localStorage.getItem(DOWNLOAD_CLICKED_KEY) === "true";
      setDownloadClicked(clicked);
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
    markDownloadClicked();
    trackAppEvent("app_banner_click");
    trackAppEvent("app_popup_open");
    setDialogOpen(true);
  };

  const markDownloadClicked = () => {
    setDownloadClicked(true);
    try {
      localStorage.setItem(DOWNLOAD_CLICKED_KEY, "true");
    } catch {}
  };

  const handleWhatsAppClick = () => {
    if (!waLink) return;
    markDownloadClicked();
    trackAppEvent("app_banner_whatsapp_click");
    window.open(waLink, "_blank", "noopener,noreferrer");
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
          <span>{downloadClicked ? "Falar no WhatsApp" : "10% OFF no app"}</span>
          <ChevronUp className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="w-full z-50 bg-primary text-primary-foreground" style={{ marginBottom: 0 }}>
        <div className="mx-auto relative flex items-center justify-between gap-2 px-9 py-1 sm:px-4">
          <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap overflow-hidden">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
              <Smartphone className="h-3 w-3" />
            </span>
            <span
              className={cn(
                "truncate text-[11px] font-semibold tracking-wide sm:text-xs",
                !downloadClicked && "animate-[pulseText_2s_ease-in-out_infinite]",
              )}
            >
              {downloadClicked
                ? "Instalação registrada — fale com a loja"
                : "Baixe o app e ganhe 10% OFF"}
            </span>
          </div>

          {downloadClicked ? (
            <button
              onClick={handleWhatsAppClick}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white"
              aria-label="Falar no WhatsApp"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleBannerClick}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary-foreground/30 transition-colors hover:bg-primary-foreground/10"
              aria-label="Abrir app"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}

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
        onDownloadClick={markDownloadClicked}
        onWhatsAppClick={markDownloadClicked}
      />
    </>
  );
}
