import { cloud } from "@/lib/cloud";
import { normalizeCollectedEvent, type TrackingCollectorEvent } from "./eventCollector";
import { trackVisitorEvent } from "./trackingClient";
import { getScoreDelta } from "./scoreEngine";

export async function collectAndTrackEvent(params: {
  sessionToken: string;
  consentGiven: boolean;
  event: TrackingCollectorEvent;
}) {
  const event = normalizeCollectedEvent(params.event);
  const result = await trackVisitorEvent({
    sessionToken: params.sessionToken,
    consentGiven: params.consentGiven,
    event,
  });

  const score_delta = getScoreDelta((params.event as any).type);
  if (params.consentGiven && score_delta > 0) {
    await cloud.functions.invoke("visitor-track", {
      body: {
        action: "track_event",
        session_token: params.sessionToken,
        consent_given: true,
        event: {
          type: event.type,
          path: event.path,
          product_id: event.productId ?? null,
          category_id: event.categoryId ?? null,
          duration: event.duration ?? null,
          metadata: { ...(event.metadata ?? {}), score_delta },
        },
      },
    });
  }

  return result;
}
