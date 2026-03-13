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
    startOrUpdateVisitorSession({ sessionToken, consentGiven: consentOk }).catch(() => {});
  }, [sessionToken, consentOk]);

  useEffect(() => {
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
    };
  }, [location.key, sessionToken, consentOk]);

  useEffect(() => {
    if (!consentOk) return;
    let ticking = false;
    let last = 0;

    const onScroll = () => {
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
          sessionToken,
          consentGiven: consentOk,
          event: { type: "scroll", path: window.location.pathname, metadata: { depth } },
        }).catch(() => {});
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll as any);
  }, [consentOk, sessionToken]);

  useEffect(() => {
    const handler = (e: any) => {
      const pid = e?.detail?.productId as string | undefined;
      if (!pid) return;
      collectAndTrackEvent({
        sessionToken,
        consentGiven: consentOk,
        event: { type: "product_view", productId: pid, path: window.location.pathname },
      }).catch(() => {});
    };

    window.addEventListener("store:product-visit", handler as any);
    return () => window.removeEventListener("store:product-visit", handler as any);
  }, [sessionToken, consentOk]);

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
