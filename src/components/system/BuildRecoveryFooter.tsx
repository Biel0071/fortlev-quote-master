import { useEffect, useMemo, useState } from "react";

const BUILD_STORAGE_KEY = "fortlev_build_id_v1";
const BUILD_STATUS_KEY = "fortlev_build_status_v1";

async function clearLegacyCaches() {
  if (typeof window === "undefined") return;

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }
}

export function BuildRecoveryFooter() {
  const [status, setStatus] = useState<string>("checking");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const currentBuild = __APP_BUILD_ID__;
      const lastBuild = localStorage.getItem(BUILD_STORAGE_KEY);

      if (lastBuild && lastBuild !== currentBuild) {
        await clearLegacyCaches();
      }

      if (lastBuild !== currentBuild) {
        localStorage.setItem(BUILD_STORAGE_KEY, currentBuild);
        localStorage.setItem(BUILD_STATUS_KEY, "restored");

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("v", currentBuild);
        window.location.replace(nextUrl.toString());
        return;
      }

      const persistedStatus = localStorage.getItem(BUILD_STATUS_KEY) ?? "restored";
      if (!cancelled) setStatus(persistedStatus);
    };

    run().catch(() => {
      if (!cancelled) setStatus("restored");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const envLabel = import.meta.env.DEV ? "dev" : "prod";
  const buildLabel = useMemo(() => __APP_BUILD_ID__, []);
  const versionLabel = useMemo(() => __APP_BUILD_ID__.slice(0, 19), []);
  const lastUpdate = useMemo(() => {
    const date = new Date(__APP_BUILD_ID__);
    return Number.isNaN(date.getTime()) ? __APP_BUILD_ID__ : date.toLocaleString("pt-BR");
  }, []);

  return (
    <footer className="fixed bottom-2 right-2 z-50 rounded-md border border-border bg-background/95 px-3 py-2 text-[11px] text-foreground shadow-sm backdrop-blur">
      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 whitespace-nowrap">
        <span className="text-muted-foreground">ENV</span>
        <span>{envLabel}</span>
        <span className="text-muted-foreground">BUILD</span>
        <span>{buildLabel}</span>
        <span className="text-muted-foreground">VERSION</span>
        <span>{versionLabel}</span>
        <span className="text-muted-foreground">LAST UPDATE</span>
        <span>{lastUpdate}</span>
        <span className="text-muted-foreground">STATUS</span>
        <span>{status}</span>
      </div>
    </footer>
  );
}