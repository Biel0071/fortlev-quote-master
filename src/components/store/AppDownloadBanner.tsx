import { useEffect, useState } from "react";
import { X, ChevronUp, Download, Smartphone, MessageCircle } from "lucide-react";
import { useStoreContact } from "@/hooks/useStoreContact";
import { AppDownloadConfirmDialog } from "./AppDownloadConfirmDialog";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";

const DISMISS_KEY = "APP_BANNER_DISMISSED_AT";
const DOWNLOAD_CLICKED_KEY = "app_download_clicked";
const REEXPAND_MS = 15_000;
const APP_PAGE_PATHS = new Set(["/google-play", "/downloads", "/app/download"]);

export function AppDownloadBanner() {
  const [mode, setMode] = useState<"full" | "compact">("full");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [downloadClicked, setDownloadClicked] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHiddenRoute =
    location.pathname.startsWith("/admin") || APP_PAGE_PATHS.has(location.pathname);
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
      } catch { /* ignore storage read errors */ }
  }, []);

  useEffect(() => {
    if (mode !== "compact") return;
    const timer = setTimeout(() => {
      setMode("full");
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch { /* ignore storage write errors */ }
    }, REEXPAND_MS);
    return () => clearTimeout(timer);
  }, [mode]);

  const dismiss = () => {
    setMode("compact");
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch { /* ignore storage write errors */ }
  };

  const expand = () => {
    setMode("full");
    try {
      localStorage.removeItem(DISMISS_KEY);
    } catch { /* ignore storage write errors */ }
  };

  const handleBannerClick = () => {
    markDownloadClicked();
    trackAppEvent("app_banner_click");
    navigate("/google-play");
  };

  const markDownloadClicked = () => {
    setDownloadClicked(true);
    try {
      localStorage.setItem(DOWNLOAD_CLICKED_KEY, "true");
    } catch { /* ignore storage write errors */ }
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
    } catch { /* ignore custom event dispatch errors */ }
  };

  if (isHiddenRoute) return null;

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
        <div className="mx-auto grid h-full max-w-6xl grid-cols-[1fr_auto_auto] items-center gap-3 sm:gap-4 px-3 sm:px-5">
          <button
            type="button"
            onClick={handleBannerClick}
            className="flex min-w-0 items-center justify-center gap-2 overflow-hidden text-center whitespace-nowrap transition-opacity hover:opacity-90"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
              <Smartphone className="h-3 w-3" />
            </span>
            <span className={cn("banner-text tracking-wide", !downloadClicked && "animate-[pulseText_1.5s_ease-in-out_infinite]")}>
              Instale o App e ganhe 10% OFF!
            </span>
          </button>

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
        apkUrl="/google-play"
        whatsappLink={waLink}
        onTrack={trackAppEvent}
        onDownloadClick={markDownloadClicked}
        onWhatsAppClick={markDownloadClicked}
      />
    </>
  );
}
