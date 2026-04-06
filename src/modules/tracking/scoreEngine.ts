import type { EventType } from "./trackingClient";

const SCORE_DELTA: Record<string, number> = {
  product_view: 5,
  search: 10,
  add_to_cart: 15,
  checkout_start: 30,
  request_quote: 50,
  banner_click: 3,
  app_banner_click: 8,
  app_popup_open: 5,
  app_popup_confirm_whatsapp: 20,
  app_download_continue: 12,
};

export function getScoreDelta(eventType: EventType) {
  return SCORE_DELTA[eventType] ?? 0;
}

export function getTemperature(score: number) {
  if (score >= 71) return "quente";
  if (score >= 31) return "morno";
  return "frio";
}
