import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "app_banner_dismissed_at";
const DISMISS_HOURS = 24;

export function AppDownloadBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const diff = Date.now() - Number(dismissed);
      if (diff < DISMISS_HOURS * 60 * 60 * 1000) return;
    }
    setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-[hsl(222,70%,22%)] via-[hsl(222,65%,30%)] to-[hsl(222,60%,38%)] text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">
              📲 Baixe nosso app e ganhe 10% de desconto!
            </p>
            <p className="hidden sm:block text-xs text-white/70 mt-0.5">
              Aproveite ofertas exclusivas direto no app
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            className="h-8 rounded-lg bg-[hsl(30,95%,55%)] text-white font-semibold hover:bg-[hsl(30,95%,48%)] shadow-md text-xs sm:text-sm px-3 sm:px-4"
            onClick={() => {
              window.open("#", "_blank");
            }}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Baixar agora
          </Button>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-full hover:bg-white/15 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
