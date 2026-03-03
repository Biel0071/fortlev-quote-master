import { collectAndTrackEvent } from "./trackingService";

type VisitorEventName =
  | "chat_open"
  | "chat_message_sent"
  | "whatsapp_click"
  | "chat_close"
  | "request_quote";

const SESSION_KEY = "tracking_session_token_temp_v1";

export function getVisitorSessionId() {
  if (typeof window === "undefined") return "";

  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

export async function trackVisitorEvent({
  sessionId,
  eventName,
  metadata,
}: {
  sessionId: string;
  eventName: VisitorEventName;
  metadata?: Record<string, unknown>;
}) {
  try {
    if (!sessionId) return;
    const path = typeof window !== "undefined" ? window.location.pathname + window.location.search + window.location.hash : undefined;

    await collectAndTrackEvent({
      sessionToken: sessionId,
      consentGiven: true,
      event: {
        type: eventName,
        path,
        metadata: metadata ?? {},
      },
    });
  } catch {
    // best-effort tracking
  }
}
