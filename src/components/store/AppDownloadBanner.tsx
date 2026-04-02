import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

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
    <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-[hsl(222,70%,22%)] via-[hsl(222,65%,30%)] to-[hsl(222,60%,38%)] text-white shadow-sm">
      <div className="mx-auto flex items-center justify-between gap-2 px-3 py-1.5">
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 min-w-0 no-underline text-white"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs font-semibold truncate animate-pulse">
            Baixe o app e ganhe 10% OFF!
          </span>
        </a>

        <button
          onClick={dismiss}
          className="p-1 rounded-full hover:bg-white/15 transition-colors shrink-0"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
