import type { EventType } from "./trackingClient";

export type LeadQuality = "frio" | "morno" | "quente" | "pronto_compra" | "bot";
export type DwellBucketLabel = "0-15s" | "15-60s" | "1-3m" | "3-5m" | "5m+";

const SCORE_DELTA: Record<string, number> = {
  product_view: 5,
  search: 10,
  click: 2,
  add_to_cart: 15,
  checkout_start: 30,
  purchase: 60,
  request_quote: 50,
  banner_click: 3,
  link_click: 4,
  download_apk: 20,
  app_install: 25,
  dwell_heartbeat: 2,
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

export function getDwellBucket(totalSeconds: number): DwellBucketLabel {
  const s = Math.max(0, Number(totalSeconds) || 0);
  if (s < 15) return "0-15s";
  if (s < 60) return "15-60s";
  if (s < 180) return "1-3m";
  if (s < 300) return "3-5m";
  return "5m+";
}

export function leadQualityLabel(quality: string | null | undefined): string {
  switch (quality) {
    case "pronto_compra":
      return "Pronto p/ Compra";
    case "quente":
      return "Quente";
    case "morno":
      return "Morno";
    case "bot":
      return "Bot Filtrado";
    default:
      return "Frio";
  }
}

export interface PropensityInput {
  siteTimeSeconds?: number;
  appTimeSeconds?: number;
  totalPages?: number;
  encryptedClicks?: number;
  scrollDepth?: number;
  productViews?: number;
  cartActions?: number;
  hasConversionAction?: boolean;
  purchased?: boolean;
  returnVisits?: number;
  isBot?: boolean;
}

export interface PropensityBreakdown {
  probability: number;
  leadQuality: LeadQuality;
  temperature: "frio" | "morno" | "quente";
  dwellBucket: DwellBucketLabel;
  dwellPoints: number;
  navigationPoints: number;
  intentPoints: number;
  returnPoints: number;
}

/**
 * Algoritmo multifatorial determinístico alinhado ao PostgreSQL:
 * - Tempo ativo no Site/App: 0–32 pts (inclui bônus +4 omnichannel Site+App)
 * - Navegação & cliques criptografados: 0–20 pts
 * - Intenção comercial (produtos, carrinho/checkout/orçamento, WhatsApp/App): 0–40 pts
 * - Fidelidade/Retorno por ip_hash: 0–10 pts
 */
export function computeLeadPropensity(input: PropensityInput): PropensityBreakdown {
  const siteSec = Math.max(0, Math.floor(input.siteTimeSeconds ?? 0));
  const appSec = Math.max(0, Math.floor(input.appTimeSeconds ?? 0));
  const totalSec = siteSec + appSec;
  const dwellBucket = getDwellBucket(totalSec);

  if (input.isBot) {
    return {
      probability: 0,
      leadQuality: "bot",
      temperature: "frio",
      dwellBucket,
      dwellPoints: 0,
      navigationPoints: 0,
      intentPoints: 0,
      returnPoints: 0,
    };
  }

  let dwellPoints = 2;
  if (totalSec >= 420) dwellPoints = 30;
  else if (totalSec >= 240) dwellPoints = 27;
  else if (totalSec >= 120) dwellPoints = 22;
  else if (totalSec >= 45) dwellPoints = 15;
  else if (totalSec >= 15) dwellPoints = 8;

  if (siteSec > 0 && appSec > 0) {
    dwellPoints = Math.min(32, dwellPoints + 4);
  }

  const pages = Math.max(0, Math.floor(input.totalPages ?? 0));
  const encClicks = Math.max(0, Math.floor(input.encryptedClicks ?? 0));
  const depth = Math.max(0, Math.min(100, input.scrollDepth ?? 0));
  const navigationPoints = Math.min(
    20,
    Math.min(8, pages * 2) + Math.min(7, encClicks * 2) + Math.round(depth * 0.05),
  );

  const prodViews = Math.max(0, Math.floor(input.productViews ?? 0));
  const cartActs = Math.max(0, Math.floor(input.cartActions ?? 0));
  const rawIntent =
    Math.min(12, prodViews * 4) +
    Math.min(28, cartActs * 12) +
    (input.hasConversionAction ? 10 : 0);
  const intentPoints = Math.min(40, rawIntent);

  const visits = Math.max(1, Math.floor(input.returnVisits ?? 1));
  const returnPoints = Math.min(10, Math.max(0, visits - 1) * 5);

  const rawTotal = dwellPoints + navigationPoints + intentPoints + returnPoints;
  const probability = input.purchased ? 100 : Math.min(98, Math.max(5, rawTotal));

  let leadQuality: LeadQuality = "frio";
  if (probability >= 85) leadQuality = "pronto_compra";
  else if (probability >= 65) leadQuality = "quente";
  else if (probability >= 35) leadQuality = "morno";

  const temperature: "frio" | "morno" | "quente" =
    probability >= 65 ? "quente" : probability >= 35 ? "morno" : "frio";

  return {
    probability,
    leadQuality,
    temperature,
    dwellBucket,
    dwellPoints,
    navigationPoints,
    intentPoints,
    returnPoints,
  };
}
