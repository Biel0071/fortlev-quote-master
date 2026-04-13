import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { consentGiven, getConsentState, setConsentState, type ConsentState } from "@/utils/consent";
import { startOrUpdateVisitorSession } from "@/utils/trackingClient";
import { collectAndTrackEvent } from "./trackingService";
import type { TrackingCollectorEvent } from "./eventCollector";

const TOKEN_KEY_PERSIST = "tracking_session_token_v1";
const TOKEN_KEY_TEMP = "tracking_session_token_temp_v1";

const startedSessions = new Set<string>();
const trackedPageViews = new Set<string>();
const autoTrackedProductViews = new Set<string>();

let trackerRuntime = {
  sessionToken: "",
  consentOk: false,
};

let scrollListenerInitialized = false;
let productVisitListenerInitialized = false;
let clickListenerInitialized = false;

function ensureToken(persist: boolean) {
  const key = persist ? TOKEN_KEY_PERSIST : TOKEN_KEY_TEMP;
  const store = persist ? localStorage : sessionStorage;

  const existing = store.getItem(key);
  if (existing) return existing;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  store.setItem(key, id);
  return id;
}

export function useVisitorTracker() {
  const location = useLocation();
  const [consent, setConsent] = useState<ConsentState>(() => getConsentState());

  const consentOk = useMemo(() => consentGiven(consent), [consent]);
  const sessionToken = useMemo(() => ensureToken(consentOk), [consentOk]);

  useEffect(() => {
    trackerRuntime = { sessionToken, consentOk };
  }, [sessionToken, consentOk]);

  useEffect(() => {
    const key = `${sessionToken}:${consentOk ? "1" : "0"}`;
    if (startedSessions.has(key)) return;
    startedSessions.add(key);

    const t = window.setTimeout(() => {
      startOrUpdateVisitorSession({ sessionToken, consentGiven: consentOk }).catch(() => {});
    }, 200);

    return () => window.clearTimeout(t);
  }, [sessionToken, consentOk]);

  useEffect(() => {
    const pageKey = `${sessionToken}:${location.key}`;
    if (trackedPageViews.has(pageKey)) return;
    trackedPageViews.add(pageKey);

    const path = location.pathname + location.search + location.hash;
    const started = Date.now();

    collectAndTrackEvent({
      sessionToken,
      consentGiven: consentOk,
      event: { type: "page_view", path },
    }).catch(() => {});

    if (location.pathname.startsWith("/produto/")) {
      const maybeId = location.pathname.split("--").pop() ?? "";
      const autoKey = `${sessionToken}:${location.pathname}`;
      if (!autoTrackedProductViews.has(autoKey)) {
        autoTrackedProductViews.add(autoKey);
        collectAndTrackEvent({
          sessionToken,
          consentGiven: consentOk,
          event: {
            type: "product_view",
            productId: maybeId || null,
            path,
            metadata: { source: "auto_from_page_view" },
          },
        }).catch(() => {});
      }
    }

    return () => {
      const duration = Math.max(0, Math.round((Date.now() - started) / 1000));
      collectAndTrackEvent({
        sessionToken,
        consentGiven: consentOk,
        event: { type: "page_view", path, duration, metadata: { phase: "exit" } },
      }).catch(() => {});
      trackedPageViews.delete(pageKey);
    };
  }, [location.key, location.pathname, location.search, location.hash, sessionToken, consentOk]);

  useEffect(() => {
    if (clickListenerInitialized) return;
    clickListenerInitialized = true;

    let lastClickAt = 0;
    const onClick = (evt: MouseEvent) => {
      const { sessionToken: token, consentOk: consent } = trackerRuntime;
      if (!token || !consent) return;

      const now = Date.now();
      if (now - lastClickAt < 1500) return;
      lastClickAt = now;

      const target = evt.target as HTMLElement | null;
      const clickable = target?.closest("button,a,[role='button']") as HTMLElement | null;
      const label = clickable?.getAttribute("aria-label") || clickable?.textContent?.trim()?.slice(0, 80) || "click";

      collectAndTrackEvent({
        sessionToken: token,
        consentGiven: consent,
        event: {
          type: "click",
          path: window.location.pathname + window.location.search + window.location.hash,
          metadata: {
            label,
            tag: clickable?.tagName?.toLowerCase() ?? "unknown",
          },
        },
      }).catch(() => {});
    };

    window.addEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (scrollListenerInitialized) return;
    scrollListenerInitialized = true;

    let ticking = false;
    let last = 0;

    const onScroll = () => {
      const { sessionToken: token, consentOk: consent } = trackerRuntime;
      if (!consent || !token) return;

      const now = Date.now();
      if (now - last < 3000) return;
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        ticking = false;
        last = now;

        const doc = document.documentElement;
        const scrollTop = window.scrollY || doc.scrollTop;
        const height = Math.max(1, doc.scrollHeight - doc.clientHeight);
        const depth = Math.min(1, Math.max(0, scrollTop / height));

        collectAndTrackEvent({
          sessionToken: token,
          consentGiven: consent,
          event: { type: "scroll", path: window.location.pathname, metadata: { depth } },
        }).catch(() => {});
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
  }, []);

  useEffect(() => {
    if (productVisitListenerInitialized) return;
    productVisitListenerInitialized = true;

    const handler = (e: any) => {
      const pid = e?.detail?.productId as string | undefined;
      if (!pid) return;

      const { sessionToken: token, consentOk: consent } = trackerRuntime;
      if (!token) return;

      collectAndTrackEvent({
        sessionToken: token,
        consentGiven: consent,
        event: { type: "product_view", productId: pid, path: window.location.pathname },
      }).catch(() => {});
    };

    window.addEventListener("store:product-visit", handler as any);
  }, []);

  // Listen for app banner tracking events
  useEffect(() => {
    const handler = (e: any) => {
      const type = e?.detail?.type as string | undefined;
      if (!type) return;

      const { sessionToken: token, consentOk: consent } = trackerRuntime;
      if (!token) return;

      collectAndTrackEvent({
        sessionToken: token,
        consentGiven: consent,
        event: { type: type as any, path: window.location.pathname, metadata: { source: "app_banner" } },
      }).catch(() => {});
    };

    window.addEventListener("store:track-app-event", handler as any);
    return () => window.removeEventListener("store:track-app-event", handler as any);
  }, []);

  const api = useMemo(
    () => ({
      consent,
      consentOk,
      sessionToken,
      accept: () => {
        setConsentState("accepted");
        setConsent("accepted");
      },
      decline: () => {
        setConsentState("declined");
        setConsent("declined");
      },
      track: (event: TrackingCollectorEvent) =>
        collectAndTrackEvent({ sessionToken, consentGiven: consentOk, event }).catch(() => {}),
    }),
    [consent, consentOk, sessionToken],
  );

  return api;
}
