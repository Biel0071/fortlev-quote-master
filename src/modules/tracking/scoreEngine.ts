import type { EventType } from "./trackingClient";

const SCORE_DELTA: Record<string, number> = {
  product_view: 5,
  search: 10,
  add_to_cart: 15,
  checkout_start: 30,
  request_quote: 50,
};

export function getScoreDelta(eventType: EventType | "search" | "add_to_cart" | "banner_click" | "checkout_start") {
  return SCORE_DELTA[eventType] ?? 0;
}

export function getTemperature(score: number) {
  if (score >= 71) return "quente";
  if (score >= 31) return "morno";
  return "frio";
}
