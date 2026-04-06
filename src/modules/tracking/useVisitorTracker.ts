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

let trackerRuntime = {
  sessionToken: "",
  consentOk: false,
};

let scrollListenerInitialized = false;
let productVisitListenerInitialized = false;

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
        event: { type, path: window.location.pathname, metadata: { source: "app_banner" } },
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
