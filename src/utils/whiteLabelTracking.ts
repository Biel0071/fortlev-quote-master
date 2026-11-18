import type { LastDayDeliveryEvaluation } from "./deliverySchedule.ts";

export interface CarrierDistributionCenter {
  id: string;
  carrierSlug: string;
  carrierName: string;
  name: string;
  city: string;
  uf: string;
  address: string;
  lat: number;
  lon: number;
}

export interface WhiteLabelTrackingConfig {
  /** Nome da loja/origem exibido na etapa inicial de saída */
  originStoreName?: string;
  /** Endereço/cidade de origem de onde o pedido saiu da loja */
  originStoreAddress?: string;
  /** Transportadora padrão caso o pedido ainda não tenha transportadora confirmada (padrão: "Jadlog") */
  defaultCarrierName?: string;
  /** Logo customizada da empresa/transportadora (opcional) */
  brandLogoUrl?: string;
  /** Centros de distribuição adicionais ou customizados para sistemas externos */
  customDistributionCenters?: CarrierDistributionCenter[];
  /** Ocultar endereço final do destinatário no mapa público (padrão: true) */
  hideDestination?: boolean;
}

export interface TimelineStageEvent {
  id?: string;
  title: string;
  description?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  event_at: string;
  is_simulated?: boolean;
}

/**
 * Catálogo real de Centros de Distribuição (CO / Hubs / Filiais) das transportadoras no Brasil
 * para cálculo automático da unidade operacional mais próxima do endereço do pedido.
 */
export const CARRIER_DISTRIBUTION_CENTERS: CarrierDistributionCenter[] = [
  // JADLOG — Rede Nacional + Regional MG
  {
    id: "jadlog-bh-contagem",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "CO Jadlog Contagem / Grande BH",
    city: "Contagem",
    uf: "MG",
    address: "Distrito Industrial Cinco, Contagem - MG",
    lat: -19.9386,
    lon: -44.0539,
  },
  {
    id: "jadlog-mg-montes-claros",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "CO Jadlog Norte de Minas",
    city: "Montes Claros",
    uf: "MG",
    address: "Distrito Industrial, Montes Claros - MG",
    lat: -16.7072,
    lon: -43.8638,
  },
  {
    id: "jadlog-mg-diamantina-curvelo",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "Unidade Jadlog Vale do Jequitinhonha / Central",
    city: "Curvelo",
    uf: "MG",
    address: "Polo Logístico BR-135, Curvelo - MG",
    lat: -18.7564,
    lon: -44.4308,
  },
  {
    id: "jadlog-mg-uberlandia",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "CO Jadlog Triângulo Mineiro",
    city: "Uberlândia",
    uf: "MG",
    address: "Setor Industrial Norte, Uberlândia - MG",
    lat: -18.8808,
    lon: -48.2772,
  },
  {
    id: "jadlog-mg-juiz-de-fora",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "CO Jadlog Zona da Mata",
    city: "Juiz de Fora",
    uf: "MG",
    address: "Distrito Industrial, Juiz de Fora - MG",
    lat: -21.7069,
    lon: -43.4181,
  },
  {
    id: "jadlog-mg-varginha",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "CO Jadlog Sul de Minas",
    city: "Varginha",
    uf: "MG",
    address: "Parque Industrial, Varginha - MG",
    lat: -21.5558,
    lon: -45.4303,
  },
  {
    id: "jadlog-mg-valadares",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "CO Jadlog Leste de Minas",
    city: "Governador Valadares",
    uf: "MG",
    address: "Distrito Industrial, Governador Valadares - MG",
    lat: -18.8872,
    lon: -41.9653,
  },
  {
    id: "jadlog-sp-matriz",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "Hub Matriz Jadlog Anhanguera",
    city: "São Paulo",
    uf: "SP",
    address: "Av. Jorn. Paulo Zingg, Parque São Domingos, São Paulo - SP",
    lat: -23.4892,
    lon: -46.7589,
  },
  {
    id: "jadlog-sp-campinas",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "CO Jadlog Campinas / Interior SP",
    city: "Campinas",
    uf: "SP",
    address: "Polo Logístico Anhanguera, Campinas - SP",
    lat: -22.8945,
    lon: -47.1103,
  },
  {
    id: "jadlog-sp-ribeirao",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "CO Jadlog Ribeirão Preto",
    city: "Ribeirão Preto",
    uf: "SP",
    address: "Distrito Empresarial, Ribeirão Preto - SP",
    lat: -21.1422,
    lon: -47.7819,
  },
  {
    id: "jadlog-rj-pavuna",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "CO Jadlog Rio de Janeiro",
    city: "Rio de Janeiro",
    uf: "RJ",
    address: "Polo Logístico Pavuna, Rio de Janeiro - RJ",
    lat: -22.8089,
    lon: -43.3592,
  },
  {
    id: "jadlog-es-serra",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "CO Jadlog Grande Vitória",
    city: "Serra",
    uf: "ES",
    address: "TIMS, Serra - ES",
    lat: -20.1931,
    lon: -40.2647,
  },
  {
    id: "jadlog-pr-pinhais",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "CO Jadlog Curitiba / Pinhais",
    city: "Pinhais",
    uf: "PR",
    address: "Polo Industrial, Pinhais - PR",
    lat: -25.4325,
    lon: -49.1912,
  },
  {
    id: "jadlog-sc-saojose",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "CO Jadlog Grande Florianópolis",
    city: "São José",
    uf: "SC",
    address: "Área Industrial, São José - SC",
    lat: -27.5714,
    lon: -48.6361,
  },
  {
    id: "jadlog-rs-canoas",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "CO Jadlog Porto Alegre / Canoas",
    city: "Canoas",
    uf: "RS",
    address: "Distrito Industrial, Canoas - RS",
    lat: -29.9042,
    lon: -51.1794,
  },
  {
    id: "jadlog-ba-simoesfilho",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "CO Jadlog Salvador / CIA",
    city: "Simões Filho",
    uf: "BA",
    address: "Centro Industrial de Aratu, Simões Filho - BA",
    lat: -12.7894,
    lon: -38.4036,
  },
  {
    id: "jadlog-pe-jaboatao",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "CO Jadlog Recife / Prazeres",
    city: "Jaboatão dos Guararapes",
    uf: "PE",
    address: "Polo Logístico Muribeca, Jaboatão dos Guararapes - PE",
    lat: -8.1469,
    lon: -34.9389,
  },
  {
    id: "jadlog-ce-fortaleza",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "CO Jadlog Fortaleza / Messejana",
    city: "Fortaleza",
    uf: "CE",
    address: "Eixo Logístico BR-116, Fortaleza - CE",
    lat: -3.8317,
    lon: -38.4961,
  },
  {
    id: "jadlog-go-goiania",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "CO Jadlog Goiânia",
    city: "Aparecida de Goiânia",
    uf: "GO",
    address: "Polo Empresarial Goiás, Aparecida de Goiânia - GO",
    lat: -16.8097,
    lon: -49.2469,
  },
  {
    id: "jadlog-df-brasilia",
    carrierSlug: "jadlog",
    carrierName: "Jadlog",
    name: "CO Jadlog Brasília / SIA",
    city: "Brasília",
    uf: "DF",
    address: "Setor de Indústria e Abastecimento, Brasília - DF",
    lat: -15.8039,
    lon: -47.9592,
  },

  // CORREIOS
  {
    id: "correios-mg-bh",
    carrierSlug: "correios",
    carrierName: "Correios",
    name: "CTE Correios Belo Horizonte",
    city: "Belo Horizonte",
    uf: "MG",
    address: "Rua Boaventura, Indaiá / Pampulha, Belo Horizonte - MG",
    lat: -19.8658,
    lon: -43.9564,
  },
  {
    id: "correios-sp-cajamar",
    carrierSlug: "correios",
    carrierName: "Correios",
    name: "CTE Correios Cajamar / São Paulo",
    city: "Cajamar",
    uf: "SP",
    address: "Polo Logístico Anhanguera, Cajamar - SP",
    lat: -23.3556,
    lon: -46.8781,
  },
  {
    id: "correios-rj-benfica",
    carrierSlug: "correios",
    carrierName: "Correios",
    name: "CTE Correios Benfica",
    city: "Rio de Janeiro",
    uf: "RJ",
    address: "Benfica, Rio de Janeiro - RJ",
    lat: -22.8919,
    lon: -43.2414,
  },

  // BRASPRESS
  {
    id: "braspress-mg-contagem",
    carrierSlug: "braspress",
    carrierName: "Braspress",
    name: "Terminal Braspress Contagem",
    city: "Contagem",
    uf: "MG",
    address: "Cidade Industrial, Contagem - MG",
    lat: -19.9511,
    lon: -44.0275,
  },
  {
    id: "braspress-sp-guarulhos",
    carrierSlug: "braspress",
    carrierName: "Braspress",
    name: "Terminal Matriz Braspress Guarulhos",
    city: "Guarulhos",
    uf: "SP",
    address: "Av. Monteiro Lobato, Guarulhos - SP",
    lat: -23.4589,
    lon: -46.4942,
  },

  // JAMEF
  {
    id: "jamef-mg-contagem",
    carrierSlug: "jamef",
    carrierName: "Jamef",
    name: "Filial Jamef Contagem / BH",
    city: "Contagem",
    uf: "MG",
    address: "Rod. Fernão Dias, Contagem - MG",
    lat: -19.9592,
    lon: -44.0412,
  },
  {
    id: "jamef-sp-vilanova",
    carrierSlug: "jamef",
    carrierName: "Jamef",
    name: "Filial Jamef São Paulo",
    city: "São Paulo",
    uf: "SP",
    address: "Vila Jaguara, São Paulo - SP",
    lat: -23.5056,
    lon: -46.7469,
  },

  // RODONAVES
  {
    id: "rodonaves-mg-contagem",
    carrierSlug: "rodonaves",
    carrierName: "Rodonaves",
    name: "Unidade RTE Rodonaves Contagem",
    city: "Contagem",
    uf: "MG",
    address: "Parque Industrial, Contagem - MG",
    lat: -19.9438,
    lon: -44.0615,
  },
  {
    id: "rodonaves-sp-ribeirao",
    carrierSlug: "rodonaves",
    carrierName: "Rodonaves",
    name: "Matriz RTE Rodonaves Ribeirão Preto",
    city: "Ribeirão Preto",
    uf: "SP",
    address: "Distrito Industrial, Ribeirão Preto - SP",
    lat: -21.1356,
    lon: -47.7894,
  },

  // AZUL CARGO & TOTAL EXPRESS
  {
    id: "azul-mg-confins",
    carrierSlug: "azul-cargo",
    carrierName: "Azul Cargo",
    name: "Terminal Azul Cargo Confins / BH",
    city: "Confins",
    uf: "MG",
    address: "Aeroporto Internacional de Confins - MG",
    lat: -19.6336,
    lon: -43.9686,
  },
  {
    id: "total-sp-barueri",
    carrierSlug: "total-express",
    carrierName: "Total Express",
    name: "Hub Total Express Barueri",
    city: "Barueri",
    uf: "SP",
    address: "Alphaville Industrial, Barueri - SP",
    lat: -23.4978,
    lon: -46.8492,
  },
  {
    id: "total-mg-betim",
    carrierSlug: "total-express",
    carrierName: "Total Express",
    name: "CD Total Express Betim / BH",
    city: "Betim",
    uf: "MG",
    address: "Polo Logístico Fernão Dias, Betim - MG",
    lat: -19.9669,
    lon: -44.1983,
  },
];

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function isUnconfirmedOrGenericCarrier(name?: string | null): boolean {
  const normalized = (name || "").trim();
  if (!normalized) return true;
  return /log[ií]stica\s*nacional|transportadora\s*padr[aã]o|entrega\s*pr[oó]pria|loja\s*oficial|a\s*definir|n[aã]o\s*confirmad/i.test(
    normalized
  );
}

/**
 * Define a transportadora efetiva do rastreio:
 * Caso não haja transportadora confirmada no pedido, utiliza inicialmente a Jadlog (ou o default do White-Label).
 */
export function resolveEffectiveCarrierName(
  rawCarrierName?: string | null,
  config?: WhiteLabelTrackingConfig
): string {
  if (!isUnconfirmedOrGenericCarrier(rawCarrierName)) {
    return (rawCarrierName || "").trim();
  }
  return (config?.defaultCarrierName || "Jadlog").trim();
}

function normalizeCarrierKey(name: string): string {
  const s = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (s.includes("jadlog") || s.includes("jetlog")) return "jadlog";
  if (s.includes("correio") || s.includes("sedex") || s.includes("pac")) return "correios";
  if (s.includes("braspress")) return "braspress";
  if (s.includes("jamef")) return "jamef";
  if (s.includes("rodonaves") || s.includes("rte")) return "rodonaves";
  if (s.includes("azul")) return "azul-cargo";
  if (s.includes("total")) return "total-express";
  return "jadlog";
}

export interface NearestCarrierCdResult extends CarrierDistributionCenter {
  distanceKm: number;
}

/**
 * Seleciona automaticamente o Centro de Distribuição real da transportadora mais próximo do endereço do pedido.
 */
export function resolveNearestCarrierCd(params: {
  destination: { lat: number; lon: number; uf?: string };
  carrierName?: string | null;
  config?: WhiteLabelTrackingConfig;
}): NearestCarrierCdResult {
  const effectiveCarrier = resolveEffectiveCarrierName(params.carrierName, params.config);
  const slug = normalizeCarrierKey(effectiveCarrier);
  const allCenters = [
    ...(params.config?.customDistributionCenters || []),
    ...CARRIER_DISTRIBUTION_CENTERS,
  ];

  const matchingCarrier = allCenters.filter((c) => c.carrierSlug === slug);
  const pool =
    matchingCarrier.length > 0
      ? matchingCarrier
      : allCenters.filter((c) => c.carrierSlug === "jadlog");

  let best = pool[0];
  let bestDist = Infinity;

  for (const center of pool) {
    const dist = haversineDistanceKm(params.destination, center);
    if (dist < bestDist) {
      bestDist = dist;
      best = center;
    }
  }

  return {
    ...best,
    carrierName: effectiveCarrier,
    distanceKm: Math.round(bestDist * 10) / 10,
  };
}

function parseOriginCityUf(
  originAddress?: string | null
): { city: string | null; uf: string | null } {
  if (!originAddress) return { city: null, uf: null };
  const ufMatch = originAddress.match(/\b([A-Z]{2})\b/);
  const parts = originAddress.split(/[,-/]/).map((p) => p.trim()).filter(Boolean);
  const city = parts.length >= 2 ? parts[parts.length - 2] : parts[0] || null;
  return { city, uf: ufMatch ? ufMatch[1] : null };
}

/**
 * Constrói ou enriquece automaticamente a Linha do Tempo White-Label conforme os prazos de envio:
 * 1. Saída da Loja (endereço de origem configurável)
 * 2. Recebimento no Centro de Distribuição mais próximo da transportadora (ex: Jadlog)
 * 3. Pedido em Trânsito rumo à região do destinatário
 * 4. Em Rota de Entrega no dia previsto (integrado ao cronograma horário)
 */
export function buildWhiteLabelAutomatedTimeline(params: {
  existingTimeline?: TimelineStageEvent[];
  postedAt?: string | null;
  estimatedDeliveryAt?: string | null;
  deliveredAt?: string | null;
  now?: Date;
  originStoreName?: string | null;
  originStoreAddress?: string | null;
  carrierName: string;
  nearestCd: NearestCarrierCdResult;
  schedule: LastDayDeliveryEvaluation;
}): TimelineStageEvent[] {
  const {
    existingTimeline = [],
    postedAt,
    estimatedDeliveryAt,
    deliveredAt,
    now = new Date(),
    originStoreName,
    originStoreAddress,
    carrierName,
    nearestCd,
    schedule,
  } = params;

  // Se já houver múltiplos eventos reais detalhados no banco (>= 3), preserva-os
  if (existingTimeline.length >= 3) {
    return existingTimeline;
  }

  const nowMs = now.getTime();
  const estMs = estimatedDeliveryAt
    ? new Date(
        /^\d{4}-\d{2}-\d{2}$/.test(estimatedDeliveryAt.trim())
          ? `${estimatedDeliveryAt.trim()}T12:00:00-03:00`
          : estimatedDeliveryAt
      ).getTime()
    : nowMs + 3 * 86400_000;

  const rawPostMs = postedAt ? new Date(postedAt).getTime() : NaN;
  const startMs = Number.isFinite(rawPostMs)
    ? Math.min(rawPostMs, nowMs - 3600_000)
    : Math.min(estMs - 4 * 86400_000, nowMs - 2 * 86400_000);

  const totalSpanMs = Math.max(12 * 3600_000, estMs - startMs);
  const cdArrivalMs = startMs + totalSpanMs * 0.25;
  const transitMs = startMs + totalSpanMs * 0.55;

  const storeLabel = (originStoreName || "Loja de Origem").trim();
  const parsedOrigin = parseOriginCityUf(originStoreAddress);
  const originCity = parsedOrigin.city || nearestCd.city;
  const originUf = parsedOrigin.uf || nearestCd.uf;

  const events: TimelineStageEvent[] = [];

  // Etapa 1: Saída da Loja
  events.push({
    id: "wl-stage-origin",
    title: "Pedido Expedido da Loja",
    description: originStoreAddress
      ? `Mercadoria coletada pela ${carrierName} na unidade de origem (${storeLabel} — ${originStoreAddress}).`
      : `Mercadoria conferida e coletada pela ${carrierName} na origem (${storeLabel}).`,
    location_city: originCity,
    location_state: originUf,
    event_at: new Date(startMs).toISOString(),
  });

  // Etapa 2: Centro de Distribuição mais próximo
  if (nowMs >= cdArrivalMs || schedule.isOutForDeliveryLastDay || deliveredAt) {
    events.push({
      id: "wl-stage-cd",
      title: `Recebido no Centro de Distribuição ${carrierName}`,
      description: `Carga triada na unidade operacional mais próxima do destino: ${nearestCd.name} (${nearestCd.address}).`,
      location_city: nearestCd.city,
      location_state: nearestCd.uf,
      event_at: new Date(Math.min(cdArrivalMs, nowMs - 1800_000)).toISOString(),
    });
  }

  // Etapa 3: Pedido em Trânsito
  if (nowMs >= transitMs || schedule.isOutForDeliveryLastDay || deliveredAt) {
    events.push({
      id: "wl-stage-transit",
      title: "Pedido em Trânsito Regional",
      description: `Transferência logística em andamento a partir de ${nearestCd.name} para distribuição urbana na região.`,
      location_city: nearestCd.city,
      location_state: nearestCd.uf,
      event_at: new Date(Math.min(transitMs, nowMs - 900_000)).toISOString(),
    });
  }

  // Etapa 4: Em Rota de Entrega (no dia previsto ou status ativo de saída)
  if (schedule.isOutForDeliveryLastDay && !deliveredAt) {
    events.push({
      id: "wl-stage-out-for-delivery",
      title: schedule.headline,
      description: `${schedule.subtext} (${carrierName}).`,
      location_city: nearestCd.city,
      location_state: nearestCd.uf,
      event_at: new Date(nowMs).toISOString(),
    });
  }

  // Etapa 5: Entregue (se concluído)
  if (deliveredAt) {
    events.push({
      id: "wl-stage-delivered",
      title: "Entrega Concluída",
      description: `Pedido entregue com sucesso pela operação logística ${carrierName}.`,
      location_city: nearestCd.city,
      location_state: nearestCd.uf,
      event_at: new Date(deliveredAt).toISOString(),
    });
  }

  // Ordem reversa (mais recente no topo)
  return events.reverse();
}
