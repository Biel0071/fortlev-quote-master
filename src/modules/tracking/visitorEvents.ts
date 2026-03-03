import { cloud } from "@/lib/cloud";

type VisitorEventName =
  | "chat_open"
  | "chat_message_sent"
  | "whatsapp_click"
  | "chat_close"
  | "chat_redirect_whatsapp";

const SESSION_KEY = "visitor_session_id_v1";

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
    const path = typeof window !== "undefined" ? window.location.pathname + window.location.search + window.location.hash : null;

    await cloud.from("visitor_events").insert({
      session_id: sessionId,
      event_name: eventName,
      path,
      metadata: metadata ?? {},
    } as any);
  } catch {
    // best-effort tracking
  }
}
