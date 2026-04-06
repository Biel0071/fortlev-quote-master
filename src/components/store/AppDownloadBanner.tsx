import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

const DISMISS_KEY = "app_banner_dismissed_at";
const DISMISS_HOURS = 24;

function getDownloadUrl() {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (!projectId) return null;
  return `https://${projectId}.supabase.co/functions/v1/download-app`;
}

function readLocalValue(key: string) {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function AppDownloadBanner() {
  const [visible, setVisible] = useState(false);
  const [appUrl, setAppUrl] = useState<string | null>(null);

  useEffect(() => {
    const dismissed = readLocalValue(DISMISS_KEY);
    if (dismissed) {
      const diff = Date.now() - Number(dismissed);
      if (diff < DISMISS_HOURS * 60 * 60 * 1000) return;
    }
    setVisible(true);
  }, []);

  useEffect(() => {
    const url = getDownloadUrl();
    if (url) setAppUrl(url);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore localStorage errors
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-[hsl(222,70%,22%)] via-[hsl(222,65%,30%)] to-[hsl(222,60%,38%)] text-white shadow-md">
      <div className="mx-auto relative flex items-center justify-center gap-2 px-3 py-1.5">
        <a
          href={appUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-white no-underline"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs font-semibold animate-pulse">Baixe o app e ganhe 10% OFF!</span>
        </a>

        <button
          onClick={dismiss}
          className="absolute right-2 top-1/2 shrink-0 rounded-full bg-gradient-to-br from-white/25 to-white/10 p-1 transition-all hover:from-white/35 hover:to-white/20 -translate-y-1/2"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5 text-white drop-shadow" />
        </button>
      </div>
    </div>
  );
}
