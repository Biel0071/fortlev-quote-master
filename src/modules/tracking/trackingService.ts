import { normalizeCollectedEvent, type TrackingCollectorEvent } from "./eventCollector";
import { trackVisitorEvent } from "./trackingClient";
import { getScoreDelta } from "./scoreEngine";

export async function collectAndTrackEvent(params: {
  sessionToken: string;
  consentGiven: boolean;
  event: TrackingCollectorEvent;
}) {
  if (!params.sessionToken) return { skipped: true };

  const normalized = normalizeCollectedEvent(params.event);
  const scoreDelta = getScoreDelta(normalized.type);

  return trackVisitorEvent({
    sessionToken: params.sessionToken,
    consentGiven: params.consentGiven,
    event: {
      ...normalized,
      metadata: {
        ...(normalized.metadata ?? {}),
        score_delta: scoreDelta,
      },
    },
  });
}
