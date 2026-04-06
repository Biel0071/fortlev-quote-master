import type { TrackEventInput } from "./trackingClient";

export type TrackingCollectorEvent =
  | TrackEventInput
  | { type: "add_cart"; productId?: string | null; categoryId?: string | null; path?: string; metadata?: Record<string, unknown> }
  | { type: "remove_cart"; productId?: string | null; categoryId?: string | null; path?: string; metadata?: Record<string, unknown> }
  | { type: "offer_click"; metadata?: Record<string, unknown>; path?: string }
  | { type: "app_banner_click" | "app_popup_open" | "app_popup_confirm_whatsapp" | "app_download_continue" | "app_popup_already_installing"; path?: string; metadata?: Record<string, unknown> };

const OFFICIAL_EVENT_TYPES = new Set<string>([
  "page_view",
  "product_view",
  "search",
  "add_to_cart",
  "banner_click",
  "checkout_start",
  "request_quote",
  "scroll",
  "chat_open",
  "chat_close",
  "chat_message_sent",
  "whatsapp_click",
  "category_click",
]);

export function normalizeCollectedEvent(event: TrackingCollectorEvent): TrackEventInput {
  if (event.type === "add_cart") {
    return { type: "add_to_cart", productId: event.productId ?? null, categoryId: event.categoryId ?? null, path: event.path, metadata: event.metadata };
  }

  if (event.type === "offer_click") {
    const normalized = String((event.metadata as any)?.normalized_type ?? "").trim();
    if (OFFICIAL_EVENT_TYPES.has(normalized)) {
      return {
        type: normalized as TrackEventInput["type"],
        path: event.path,
        metadata: { ...(event.metadata ?? {}), original_type: "offer_click" },
      };
    }
    return { type: "banner_click", path: event.path, metadata: { ...(event.metadata ?? {}), original_type: "offer_click" } };
  }

  return event as TrackEventInput;
}
