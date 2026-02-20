const CONSENT_KEY = "lgpd_consent_v1";

export type ConsentState = "unknown" | "accepted" | "declined";

export function getConsentState(): ConsentState {
  if (typeof window === "undefined") return "unknown";
  const v = localStorage.getItem(CONSENT_KEY);
  if (v === "accepted" || v === "declined") return v;
  return "unknown";
}

export function setConsentState(state: Exclude<ConsentState, "unknown">) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_KEY, state);
}

export function consentGiven(state: ConsentState) {
  return state === "accepted";
}
