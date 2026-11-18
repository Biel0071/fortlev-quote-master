import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { consentGiven, getConsentState, setConsentState, type ConsentState } from "@/utils/consent";
import { startOrUpdateVisitorSession } from "@/utils/trackingClient";
import { resolveEncryptedLinkRpc } from "./trackingClient";
import { collectAndTrackEvent } from "./trackingService";
import type { TrackingCollectorEvent } from "./eventCollector";
import { detectAppChannel, encodeEncryptedLink, isSafeRedirectTarget } from "@/utils/encryptedLinks";

const TOKEN_KEY_PERSIST = "tracking_session_token_v1";
const TOKEN_KEY_TEMP = "tracking_session_token_temp_v1";

const startedSessions = new Set<string>();
const trackedPageViews = new Set<string>();
const autoTrackedProductViews = new Set<string>();

let trackerRuntime = {
  sessionToken: "",
  trackingEnabled: true,
};

let scrollListenerInitialized = false;
let productVisitListenerInitialized = false;
let clickListenerInitialized = false;
let lastUserActivityAt = Date.now();
let lastDwellFlushAt = Date.now();
let activityListenersInitialized = false;

function ensureToken(persist: boolean) {
  const key = persist ? TOKEN_KEY_PERSIST : TOKEN_KEY_TEMP;
  const store = persist ? localStorage : sessionStorage;

  const existing = localStorage.getItem(TOKEN_KEY_PERSIST) || store.getItem(key);
  if (existing) {
    if (persist) localStorage.setItem(TOKEN_KEY_PERSIST, existing);
    return existing;
  }

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  store.setItem(key, id);
  return id;
}

function isProtectedPath(pathname: string): boolean {
  return /^\/(admin|auth)(\/|$)/i.test(pathname);
}

export function useVisitorTracker() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const [consent, setConsent] = useState<ConsentState>(() => getConsentState());
  const consentOk = useMemo(() => consentGiven(consent), [consent]);
  const trackingEnabled = consent !== "declined";
  const sessionToken = useMemo(() => ensureToken(trackingEnabled), [trackingEnabled]);

  useEffect(() => {
    trackerRuntime = { sessionToken, trackingEnabled };
  }, [sessionToken, trackingEnabled]);

  useEffect(() => {
    if (!trackingEnabled || isProtectedPath(location.pathname)) return;
    const key = `${sessionToken}:${trackingEnabled ? "1" : "0"}`;
    if (startedSessions.has(key)) return;
    startedSessions.add(key);

    const t = window.setTimeout(() => {
      startOrUpdateVisitorSession({ sessionToken, consentGiven: consentOk }).catch(() => { /* silent */ });
    }, 150);

    return () => window.clearTimeout(t);
  }, [sessionToken, consentOk, trackingEnabled, location.pathname]);

  useEffect(() => {
    if (!trackingEnabled || isProtectedPath(location.pathname) || location.pathname.startsWith("/r/")) {
      return;
    }

    const pageKey = `${sessionToken}:${location.key}`;
    if (trackedPageViews.has(pageKey)) return;
    trackedPageViews.add(pageKey);

    const path = location.pathname + location.search + location.hash;
    const channel = detectAppChannel(location.pathname);
    const started = Date.now();
    lastUserActivityAt = started;
    lastDwellFlushAt = started;

    collectAndTrackEvent({
      sessionToken,
      consentGiven: consentOk,
      event: { type: "page_view", path, metadata: { channel } },
    }).catch(() => { /* silent */ });

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
            metadata: { source: "auto_from_page_view", channel },
          },
        }).catch(() => { /* silent */ });
      }
    }

    return () => {
      const isVisibleAndActive =
        document.visibilityState === "visible" && Date.now() - lastUserActivityAt <= 60_000;
      const duration = isVisibleAndActive
        ? Math.min(10, Math.max(0, Math.round((Date.now() - lastDwellFlushAt) / 1000)))
        : 0;
      if (duration > 0) {
        lastDwellFlushAt = Date.now();
      }
      collectAndTrackEvent({
        sessionToken,
        consentGiven: consentOk,
        event: { type: "page_view", path, duration, metadata: { phase: "exit", channel } },
      }).catch(() => { /* silent */ });
      trackedPageViews.delete(pageKey);
    };
  }, [location.key, location.pathname, location.search, location.hash, sessionToken, consentOk, trackingEnabled]);

  // 10s Foreground Active Dwell-Time Heartbeat (Site + App)
  useEffect(() => {
    if (!activityListenersInitialized) {
      activityListenersInitialized = true;
      const markActive = () => {
        lastUserActivityAt = Date.now();
      };
      ["pointerdown", "keydown", "scroll", "mousemove", "touchstart"].forEach((evtName) => {
        window.addEventListener(evtName, markActive, { passive: true });
      });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          lastUserActivityAt = Date.now();
          lastDwellFlushAt = Date.now();
        }
      });
    }

    if (!trackingEnabled || isProtectedPath(location.pathname) || location.pathname.startsWith("/r/")) {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastUserActivityAt > 60_000) return;

      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      if (isProtectedPath(window.location.pathname) || window.location.pathname.startsWith("/r/")) return;

      lastDwellFlushAt = Date.now();
      const channel = detectAppChannel(window.location.pathname);
      collectAndTrackEvent({
        sessionToken,
        consentGiven: consentOk,
        event: {
          type: "dwell_heartbeat",
          path: currentPath,
          duration: 10,
          metadata: { channel },
        },
      }).catch(() => { /* silent */ });
    }, 10_000);

    return () => window.clearInterval(timer);
  }, [location.pathname, sessionToken, consentOk, trackingEnabled]);

  // Encrypted Link Router Capture + Click Telemetry across public store & app
  useEffect(() => {
    if (clickListenerInitialized) return;
    clickListenerInitialized = true;

    let lastClickAt = 0;
    const onClick = (evt: MouseEvent) => {
      const { sessionToken: token, trackingEnabled: enabled } = trackerRuntime;
      if (!token || !enabled) return;

      const currentPath = window.location.pathname;
      if (isProtectedPath(currentPath) || currentPath.startsWith("/r/")) return;

      const target = evt.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      const channel = detectAppChannel(currentPath);

      if (anchor) {
        const rawHref = anchor.getAttribute("href") || "";
        if (
          rawHref &&
          !rawHref.startsWith("#") &&
          !rawHref.startsWith("mailto:") &&
          !rawHref.startsWith("tel:") &&
          !anchor.hasAttribute("download")
        ) {
          const label =
            anchor.getAttribute("aria-label") ||
            anchor.textContent?.trim()?.slice(0, 64) ||
            "link";

          // WhatsApp ou link externo seguro: mantém abertura nativa em nova aba sem popup blocker e grava clique criptografado
          if (/^https:\/\/wa\.me\//i.test(rawHref)) {
            const encryptedSlug = encodeEncryptedLink(rawHref, {
              source: currentPath,
              label,
              channel,
            }).replace(/^\/r\//, "");

            void resolveEncryptedLinkRpc({
              slug: encryptedSlug,
              sessionToken: token,
              targetUrl: rawHref,
              label,
              channel,
              referrer: window.location.href,
            });
            collectAndTrackEvent({
              sessionToken: token,
              consentGiven: true,
              event: {
                type: "whatsapp_click",
                path: currentPath,
                metadata: { label, encrypted: true, channel, target: rawHref.slice(0, 120) },
              },
            }).catch(() => { /* silent */ });
            return;
          }

          // Clique esquerdo normal em rota interna segura -> roteamento criptografado /r/enc1_...
          if (
            !evt.defaultPrevented &&
            evt.button === 0 &&
            !evt.metaKey &&
            !evt.ctrlKey &&
            !evt.shiftKey &&
            !evt.altKey &&
            (!anchor.target || anchor.target === "_self")
          ) {
            try {
              const resolved = new URL(anchor.href, window.location.origin);
              if (resolved.origin === window.location.origin) {
                const destPath = resolved.pathname + resolved.search + resolved.hash;
                if (!destPath.startsWith("/r/") && isSafeRedirectTarget(destPath)) {
                  evt.preventDefault();
                  const encryptedUrl = encodeEncryptedLink(destPath, {
                    source: currentPath,
                    label,
                    channel,
                  });
                  navigateRef.current(encryptedUrl);
                  return;
                }
              }
            } catch {
              /* fallback to default browser navigation */
            }
          }
        }
      }

      const now = Date.now();
      if (now - lastClickAt < 1200) return;
      lastClickAt = now;

      const clickable = target?.closest("button,a,[role='button']") as HTMLElement | null;
      const label = clickable?.getAttribute("aria-label") || clickable?.textContent?.trim()?.slice(0, 80) || "click";

      collectAndTrackEvent({
        sessionToken: token,
        consentGiven: true,
        event: {
          type: "click",
          path: window.location.pathname + window.location.search + window.location.hash,
          metadata: {
            label,
            tag: clickable?.tagName?.toLowerCase() ?? "unknown",
            channel,
          },
        },
      }).catch(() => { /* silent */ });
    };

    window.addEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (scrollListenerInitialized) return;
    scrollListenerInitialized = true;

    let ticking = false;
    let last = 0;

    const onScroll = () => {
      const { sessionToken: token, trackingEnabled: enabled } = trackerRuntime;
      if (!enabled || !token || isProtectedPath(window.location.pathname)) return;

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
          consentGiven: true,
          event: {
            type: "scroll",
            path: window.location.pathname,
            metadata: { depth, channel: detectAppChannel(window.location.pathname) },
          },
        }).catch(() => { /* silent */ });
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
  }, []);

  useEffect(() => {
    if (productVisitListenerInitialized) return;
    productVisitListenerInitialized = true;

    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ productId?: string }>;
      const pid = custom?.detail?.productId;
      if (!pid) return;

      const { sessionToken: token, trackingEnabled: enabled } = trackerRuntime;
      if (!token || !enabled) return;

      collectAndTrackEvent({
        sessionToken: token,
        consentGiven: true,
        event: {
          type: "product_view",
          productId: pid,
          path: window.location.pathname,
          metadata: { channel: detectAppChannel(window.location.pathname) },
        },
      }).catch(() => { /* silent */ });
    };

    window.addEventListener("store:product-visit", handler);
  }, []);

  // Listen for app banner tracking events
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ type?: string }>;
      const type = custom?.detail?.type;
      if (!type) return;

      const { sessionToken: token, trackingEnabled: enabled } = trackerRuntime;
      if (!token || !enabled) return;

      collectAndTrackEvent({
        sessionToken: token,
        consentGiven: true,
        event: {
          type: type as TrackingCollectorEvent["type"],
          path: window.location.pathname,
          metadata: {
            source: "app_banner",
            channel: detectAppChannel(window.location.pathname),
          },
        },
      }).catch(() => { /* silent */ });
    };

    window.addEventListener("store:track-app-event", handler);
    return () => window.removeEventListener("store:track-app-event", handler);
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
        collectAndTrackEvent({ sessionToken, consentGiven: consentOk, event }).catch(() => { /* silent */ }),
    }),
    [consent, consentOk, sessionToken],
  );

  return api;
}
