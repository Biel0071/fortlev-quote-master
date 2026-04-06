import { useEffect, useState, useCallback } from "react";
import { X, Download } from "lucide-react";
import { useLocation } from "react-router-dom";

const DISMISS_KEY = "APP_BANNER_DISMISSED_AT";
const DISMISS_SECONDS = 15;
const SHOW_DELAY_MS = 3000;

function getDownloadUrl() {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (!projectId) return null;
  return `https://${projectId}.supabase.co/functions/v1/download-app`;
}

export function AppDownloadBanner() {
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const location = useLocation();
  const appUrl = getDownloadUrl();

  const isHome = location.pathname === "/" || location.pathname === "/home";

  const shouldShow = useCallback(() => {
    if (isHome) return true;
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (!dismissed) return true;
      return Date.now() - Number(dismissed) > DISMISS_SECONDS * 1000;
    } catch {
      return true;
    }
  }, [isHome]);

  useEffect(() => {
    if (shouldShow()) {
      const timer = setTimeout(() => {
        setRendered(true);
        requestAnimationFrame(() => setVisible(true));
      }, isHome ? 500 : SHOW_DELAY_MS);
      return () => clearTimeout(timer);
    } else {
      setRendered(false);
      setVisible(false);
    }
  }, [location.pathname, shouldShow, isHome]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch { /* ignore */ }
    setTimeout(() => setRendered(false), 300);
  };

  if (!rendered) return null;

  return (
    <div
      className={`relative z-[51] w-full bg-gradient-to-r from-[hsl(222,70%,22%)] via-[hsl(222,65%,30%)] to-[hsl(222,60%,38%)] text-white shadow-md transition-all duration-300 ease-out ${
        visible
          ? "opacity-100 max-h-12 translate-y-0"
          : "opacity-0 max-h-0 -translate-y-2 overflow-hidden"
      }`}
    >
      <div className="mx-auto relative flex items-center justify-center gap-2 px-10 py-1.5 sm:px-4">
        <a
          href={appUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-white no-underline"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs font-semibold animate-pulse">
            Baixe o app e ganhe 10% OFF!
          </span>
        </a>

        <button
          onClick={dismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 shrink-0 rounded-full bg-gradient-to-br from-white/25 to-white/10 p-1 transition-all hover:from-white/35 hover:to-white/20"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5 text-white drop-shadow" />
        </button>
      </div>
    </div>
  );
}
