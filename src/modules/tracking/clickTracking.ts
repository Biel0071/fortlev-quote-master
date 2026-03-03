import { collectAndTrackEvent } from "./trackingService";

export type ClickTrackType = "add_to_cart" | "open_product" | "start_checkout" | "cookies_activated";

export async function trackClickEvent({
  sessionToken,
  type,
  productId,
  metadata,
}: {
  sessionToken: string;
  type: ClickTrackType;
  productId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    if (!sessionToken) return;

    const mappedType =
      type === "add_to_cart" ? "add_to_cart" :
      type === "start_checkout" ? "checkout_start" :
      type === "open_product" ? "product_view" :
      "banner_click";

    await collectAndTrackEvent({
      sessionToken,
      consentGiven: true,
      event: {
        type: mappedType as any,
        productId: productId ?? null,
        path: typeof window !== "undefined" ? window.location.pathname + window.location.search + window.location.hash : undefined,
        metadata: { ...(metadata ?? {}), click_type: type },
      },
    });
  } catch {
    // best-effort
  }
}

