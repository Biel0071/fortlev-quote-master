// Backend tracking client (LGPD-aware)
import { cloud } from "@/lib/cloud";

export type EventType =
  | "page_view"
  | "product_view"
  | "scroll"
  | "add_cart"
  | "remove_cart"
  | "chat_open"
  | "chat_close"
  | "chat_message_sent"
  | "whatsapp_click"
  | "request_quote"
  | "category_click"
  | "offer_click";

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
  const { data, error } = await cloud.functions.invoke("visitor-track", {
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
  const { data, error } = await cloud.functions.invoke("visitor-track", {
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
  if (!consentGiven) return { skipped: true };
  const { data, error } = await cloud.functions.invoke("visitor-track", {
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
  const { data, error } = await cloud.functions.invoke("visitor-track", {
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
  const { data, error } = await cloud.functions.invoke("visitor-track", {
    body: { action: "log_chat_message", chat_session_id: chatSessionId, role, content },
  });
  if (error) throw error;
  return data as any;
}

export async function closeChatSession({ chatSessionId }: { chatSessionId: string }) {
  const { data, error } = await cloud.functions.invoke("visitor-track", {
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
