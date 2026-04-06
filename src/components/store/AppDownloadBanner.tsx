import { useEffect, useState } from "react";
import { X, ChevronUp, Download, Smartphone, MessageCircle } from "lucide-react";
import { useStoreContact } from "@/hooks/useStoreContact";
import { AppDownloadConfirmDialog } from "./AppDownloadConfirmDialog";
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
      <div className="banner-top">
        <button
          onClick={expand}
          className="mx-auto flex h-full w-full max-w-6xl items-center justify-center gap-2 px-3 text-center opacity-90 transition-opacity hover:opacity-100"
        >
          <Smartphone className="h-3 w-3" />
          <span className="banner-text">
            Instale o App e ganhe 10% OFF!
          </span>
          <ChevronUp className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="banner-top">
        <div className="mx-auto grid h-full max-w-6xl grid-cols-[1fr_auto_auto] items-center gap-2 px-2 sm:px-4">
          <div className="flex min-w-0 items-center justify-center gap-2 overflow-hidden text-center whitespace-nowrap">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
              <Smartphone className="h-3 w-3" />
            </span>
            <span className={cn("banner-text tracking-wide", !downloadClicked && "animate-[pulseText_1.5s_ease-in-out_infinite]")}>
              Instale o App e ganhe 10% OFF!
            </span>
          </div>

          {downloadClicked ? (
            <button
              onClick={handleWhatsAppClick}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-whatsapp text-whatsapp-foreground"
              aria-label="Falar no WhatsApp"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleBannerClick}
              className="shrink-0 p-1 transition-opacity hover:opacity-80"
              aria-label="Baixar app"
            >
              <Download className="h-4 w-4 animate-[arrowBounce_1.8s_ease-in-out_infinite]" />
            </button>
          )}

          <button
            onClick={dismiss}
            className="shrink-0 rounded-full p-1 opacity-70 transition-opacity hover:opacity-100"
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
