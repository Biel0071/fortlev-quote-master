import { cloud } from "@/lib/cloud";

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
    await cloud.functions.invoke("click-track", {
      body: {
        session_token: sessionToken,
        type,
        product_id: productId ?? null,
        path: typeof window !== "undefined" ? window.location.pathname + window.location.search + window.location.hash : null,
        metadata: metadata ?? {},
        timestamp: Date.now(),
      },
    });
  } catch {
    // best-effort
  }
}
