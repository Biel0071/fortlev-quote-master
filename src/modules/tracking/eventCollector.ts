import type { TrackEventInput } from "./trackingClient";

export type TrackingCollectorEvent =
  | TrackEventInput
  | { type: "search"; metadata?: Record<string, unknown>; path?: string }
  | { type: "add_to_cart"; productId?: string | null; path?: string; metadata?: Record<string, unknown> }
  | { type: "banner_click"; metadata?: Record<string, unknown>; path?: string }
  | { type: "checkout_start"; metadata?: Record<string, unknown>; path?: string };

export function normalizeCollectedEvent(event: TrackingCollectorEvent): TrackEventInput {
  if (event.type === "add_to_cart") {
    return { type: "add_cart", productId: event.productId ?? null, path: event.path, metadata: event.metadata };
  }

  if (event.type === "search" || event.type === "banner_click" || event.type === "checkout_start") {
    return { type: "offer_click", path: event.path, metadata: { ...(event.metadata ?? {}), normalized_type: event.type } };
  }

  return event;
}
