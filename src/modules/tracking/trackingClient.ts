// Unified tracking client
import { cloud } from "@/lib/cloud";

export type EventType =
  | "page_view"
  | "product_view"
  | "search"
  | "add_to_cart"
  | "banner_click"
  | "checkout_start"
  | "request_quote"
  | "scroll"
  | "chat_open"
  | "chat_close"
  | "chat_message_sent"
  | "whatsapp_click"
  | "category_click";

export type TrackEventInput = {
  type: EventType;
  path?: string;
  productId?: string | null;
  categoryId?: string | null;
  duration?: number | null;
  metadata?: Record<string, unknown>;
};

export async function startOrUpdateVisitorSession({
  sessionToken,
  consentGiven,
}: {
  sessionToken: string;
  consentGiven: boolean;
}) {
  const { data, error } = await cloud.functions.invoke("track-event", {
    body: { action: "start_session", session_token: sessionToken, consent_given: consentGiven },
  });
  if (error) throw error;
  return data as any;
}

export async function setVisitorConsent({
  sessionToken,
  consentGiven,
}: {
  sessionToken: string;
  consentGiven: boolean;
}) {
  const { data, error } = await cloud.functions.invoke("track-event", {
    body: { action: "set_consent", session_token: sessionToken, consent_given: consentGiven },
  });
  if (error) throw error;
  return data as any;
}

export async function trackVisitorEvent({
  sessionToken,
  consentGiven,
  event,
}: {
  sessionToken: string;
  consentGiven: boolean;
  event: TrackEventInput;
}) {
  if (!sessionToken) return { skipped: true };
  const { data, error } = await cloud.functions.invoke("track-event", {
    body: {
      action: "track_event",
      session_token: sessionToken,
      consent_given: consentGiven,
      event: {
        type: event.type,
        path: event.path,
        product_id: event.productId ?? null,
        category_id: event.categoryId ?? null,
        duration: event.duration ?? null,
        metadata: event.metadata ?? {},
      },
    },
  });
  if (error) throw error;
  return data as any;
}

export async function createChatSession({
  sessionToken,
  consentGiven,
}: {
  sessionToken: string;
  consentGiven: boolean;
}) {
  const { data, error } = await cloud.functions.invoke("track-event", {
    body: { action: "create_chat_session", session_token: sessionToken, consent_given: consentGiven },
  });
  if (error) throw error;
  return data as any;
}

export async function logChatMessage({
  chatSessionId,
  role,
  content,
}: {
  chatSessionId: string;
  role: "user" | "assistant";
  content: string;
}) {
  const { data, error } = await cloud.functions.invoke("track-event", {
    body: { action: "log_chat_message", chat_session_id: chatSessionId, role, content },
  });
  if (error) throw error;
  return data as any;
}

export async function closeChatSession({ chatSessionId }: { chatSessionId: string }) {
  const { data, error } = await cloud.functions.invoke("track-event", {
    body: { action: "close_chat_session", chat_session_id: chatSessionId },
  });
  if (error) throw error;
  return data as any;
}

export async function analyzeChatConversation({ chatSessionId }: { chatSessionId: string }) {
  const { data, error } = await cloud.functions.invoke("analyze-chat-conversation", {
    body: { chat_session_id: chatSessionId },
  });
  if (error) throw error;
  return data as any;
}
