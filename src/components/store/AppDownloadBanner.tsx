import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DISMISS_KEY = "app_banner_dismissed_at";
const DISMISS_HOURS = 24;

export function AppDownloadBanner() {
  const [visible, setVisible] = useState(false);
  const [appUrl, setAppUrl] = useState<string | null>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const diff = Date.now() - Number(dismissed);
      if (diff < DISMISS_HOURS * 60 * 60 * 1000) return;
    }
    setVisible(true);
  }, []);

  useEffect(() => {
    supabase
      .from("app_config")
      .select("value")
      .eq("key", "app_download_url")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setAppUrl(data.value);
      });
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-[hsl(222,70%,22%)] via-[hsl(222,65%,30%)] to-[hsl(222,60%,38%)] text-white shadow-md">
      <div className="mx-auto flex items-center justify-center gap-2 px-3 py-1.5 relative">
        <a
          href={appUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 no-underline text-white"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs font-semibold animate-pulse">
            Baixe o app e ganhe 10% OFF!
          </span>
        </a>

        <button
          onClick={dismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-gradient-to-br from-white/25 to-white/10 hover:from-white/35 hover:to-white/20 transition-all shrink-0"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5 text-white drop-shadow" />
        </button>
      </div>
    </div>
  );
}
