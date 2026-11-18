import { fetchCepData } from "./cepService.ts";
import { calculateDistance, getUFCoordinates } from "./proximity.ts";
import {
  resolveNearestCarrierCd,
  type NearestCarrierCdResult,
  type WhiteLabelTrackingConfig,
} from "./whiteLabelTracking.ts";

export interface CleanedAddress {
  raw: string;
  cleaned: string;
  cep: string | null;
  uf: string | null;
  city: string | null;
  neighborhood: string | null;
  street: string | null;
  hasStreetInfo: boolean;
}

export type GeocodePrecision = "street" | "neighborhood" | "city" | "approximate";

export interface GeocodedPoint {
  lat: number;
  lon: number;
  label: string;
  precision: GeocodePrecision;
  city?: string | null;
  uf?: string | null;
}

export interface SharedRouteStop {
  lat: number;
  lon: number;
  label: string;
  progressAt: number;
}

export interface ResolvedRouteResult {
  cd: GeocodedPoint;
  nearestCarrierCd: NearestCarrierCdResult;
  destination: GeocodedPoint;
  route: Array<[number, number]>;
  stops: SharedRouteStop[];
  usedFallbackRoute: boolean;
}

const VALID_UFS = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

const DEFAULT_FALLBACK_COORD = { lat: -19.9167, lon: -43.9345, city: "Belo Horizonte", uf: "MG" };
const GEO_CACHE_PREFIX = "fortlev_geo_v1:";
const ROUTE_CACHE_PREFIX = "fortlev_route_v1:";
const memoryCache = new Map<string, string>();

function readCache<T>(key: string): T | null {
  try {
    const raw =
      typeof window !== "undefined" && window.localStorage
        ? window.localStorage.getItem(key)
        : memoryCache.get(key) ?? null;
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    memoryCache.set(key, serialized);
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, serialized);
    }
  } catch {
    // Ignore quota/private-mode errors
  }
}

export function cleanBrazilianAddress(
  rawAddress?: string | null,
  cep?: string | null
): CleanedAddress {
  const raw = (rawAddress || "").trim();
  const rawCepMatch = raw.match(/\b(\d{5})-?(\d{3})\b/);
  const explicitCepDigits = (cep || "").replace(/\D/g, "");
  const cepDigits =
    explicitCepDigits.length === 8
      ? explicitCepDigits
      : rawCepMatch
      ? `${rawCepMatch[1]}${rawCepMatch[2]}`
      : null;
  const formattedCep = cepDigits
    ? `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}`
    : null;

  // Strip parenthetical remarks such as "(próximo a praça...)" or "(Cliente vai enviar...)"
  // Preserve 5+3 CEP hyphens while converting address dash separators and Cidade/UF slashes to commas
  const CEP_HYPHEN_TOKEN = "\u0000";
  let cleaned = raw
    .replace(/\([^)]*\)/g, " ")
    .replace(/\([^)]*$/g, " ")
    .replace(/(?<![\p{L}\p{N}])(?:n[º°]\.?|n(?:o)?\.\s*(?=\d)|n(?:o)?\s+(?=\d))\s*/giu, "")
    .replace(/\b(\d{5})-(\d{3})\b/g, `$1${CEP_HYPHEN_TOKEN}$2`)
    .replace(/\s*\/\s*([A-Za-z]{2})(?=[\s,.;-]|$)/g, (full, code: string) =>
      VALID_UFS.has(code.toUpperCase()) ? `, ${code.toUpperCase()}` : full
    )
    .replace(/\s*[-–—]+\s*/g, ", ")
    .split(CEP_HYPHEN_TOKEN)
    .join("-")
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,.;-]+|[\s,.;-]+$/g, "")
    .trim();

  // Remove trailing generic phrases if someone wrote without parentheses
  cleaned = cleaned
    .replace(/cliente vai enviar( a)? localiza[çc][ãa]o( da obra)?/gi, "")
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/^[\s,.;-]+|[\s,.;-]+$/g, "")
    .trim();

  // Extract UF (2-letter code near end or after comma/dash/slash)
  let uf: string | null = null;
  const ufMatches = [...cleaned.toUpperCase().matchAll(/(?:^|[\s,/-])([A-Z]{2})(?=[\s,./-]|$)/g)];
  for (let i = ufMatches.length - 1; i >= 0; i--) {
    const candidate = ufMatches[i][1];
    if (VALID_UFS.has(candidate)) {
      uf = candidate;
      break;
    }
  }

  const segments = cleaned
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^\d{5}-?\d{3}$/.test(s));

  const street = segments.length > 0 ? segments[0] : null;
  let city: string | null = null;
  let neighborhood: string | null = null;

  if (uf) {
    const ufIdx = segments.findIndex((s) => s.toUpperCase() === uf);
    if (ufIdx > 0) {
      city = segments[ufIdx - 1];
      if (ufIdx > 1 && segments.length >= 4) {
        neighborhood = segments[ufIdx - 2];
      }
    }
  } else if (segments.length >= 2) {
    city = segments[segments.length - 1];
  }

  const hasStreetInfo = Boolean(
    cleaned.length >= 4 && !/^\d{5}-?\d{3}$/.test(cleaned)
  );

  return {
    raw,
    cleaned,
    cep: formattedCep,
    uf,
    city,
    neighborhood,
    street,
    hasStreetInfo,
  };
}

async function fetchJsonWithTimeout<T>(
  url: string,
  timeoutMs = 5500,
  externalSignal?: AbortSignal
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      return null;
    }
    externalSignal.addEventListener("abort", onExternalAbort, { once: true });
  }

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onExternalAbort);
    }
  }
}

interface NominatimItem {
  lat: string;
  lon: string;
  display_name?: string;
}

async function queryNominatim(
  query: string,
  signal?: AbortSignal
): Promise<{ lat: number; lon: number; displayName: string } | null> {
  const q = query.trim();
  if (!q) return null;

  const cacheKey = `${GEO_CACHE_PREFIX}nom:${q.toLowerCase()}`;
  const cached = readCache<{ lat: number; lon: number; displayName: string }>(cacheKey);
  if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lon)) {
    return cached;
  }

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=br&limit=1&q=${encodeURIComponent(q)}`;
  const data = await fetchJsonWithTimeout<NominatimItem[]>(url, 5500, signal);
  const first = Array.isArray(data) && data.length > 0 ? data[0] : null;
  if (!first) return null;

  const lat = Number(first.lat);
  const lon = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const result = { lat, lon, displayName: first.display_name || q };
  writeCache(cacheKey, result);
  return result;
}

export async function geocodeAddress(
  rawAddress?: string | null,
  cep?: string | null,
  signal?: AbortSignal
): Promise<GeocodedPoint> {
  const parsed = cleanBrazilianAddress(rawAddress, cep);
  const fullKey = `${GEO_CACHE_PREFIX}addr:${parsed.cleaned.toLowerCase()}|${parsed.cep || ""}`;
  const cached = readCache<GeocodedPoint>(fullKey);
  if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lon)) {
    return cached;
  }

  // Tier 1: Nominatim on cleaned full address
  if (parsed.hasStreetInfo) {
    const queryWithCountry = /brasil/i.test(parsed.cleaned)
      ? parsed.cleaned
      : `${parsed.cleaned}, Brasil`;
    const hit = await queryNominatim(queryWithCountry, signal);
    if (hit) {
      const point: GeocodedPoint = {
        lat: hit.lat,
        lon: hit.lon,
        label: parsed.cleaned,
        precision: "street",
        city: parsed.city,
        uf: parsed.uf,
      };
      writeCache(fullKey, point);
      return point;
    }
  }

  // Tier 2: ViaCEP lookup -> Nominatim with structured street/bairro/city/uf
  let viaCepCity = parsed.city;
  let viaCepUf = parsed.uf;
  let viaCepNeighborhood = parsed.neighborhood;

  if (parsed.cep) {
    const cepData = await fetchCepData(parsed.cep, signal);
    if (cepData) {
      viaCepCity = cepData.localidade || viaCepCity;
      viaCepUf = cepData.uf || viaCepUf;
      viaCepNeighborhood = cepData.bairro || viaCepNeighborhood;

      const viaCepStreetQuery = [
        cepData.logradouro,
        cepData.bairro,
        cepData.localidade,
        cepData.uf,
        "Brasil",
      ]
        .filter(Boolean)
        .join(", ");

      if (viaCepStreetQuery) {
        const hit = await queryNominatim(viaCepStreetQuery, signal);
        if (hit) {
          const point: GeocodedPoint = {
            lat: hit.lat,
            lon: hit.lon,
            label: parsed.cleaned || viaCepStreetQuery,
            precision: cepData.logradouro ? "street" : "neighborhood",
            city: viaCepCity,
            uf: viaCepUf,
          };
          writeCache(fullKey, point);
          return point;
        }
      }
    }
  }

  // Tier 3: Neighborhood + City + UF, then City + UF
  if (viaCepNeighborhood && viaCepCity && viaCepUf) {
    const hit = await queryNominatim(
      `${viaCepNeighborhood}, ${viaCepCity}, ${viaCepUf}, Brasil`,
      signal
    );
    if (hit) {
      const point: GeocodedPoint = {
        lat: hit.lat,
        lon: hit.lon,
        label: `${viaCepNeighborhood}, ${viaCepCity} - ${viaCepUf}`,
        precision: "neighborhood",
        city: viaCepCity,
        uf: viaCepUf,
      };
      writeCache(fullKey, point);
      return point;
    }
  }

  if (viaCepCity && viaCepUf) {
    const hit = await queryNominatim(`${viaCepCity}, ${viaCepUf}, Brasil`, signal);
    if (hit) {
      const point: GeocodedPoint = {
        lat: hit.lat,
        lon: hit.lon,
        label: `${viaCepCity} - ${viaCepUf}`,
        precision: "city",
        city: viaCepCity,
        uf: viaCepUf,
      };
      writeCache(fullKey, point);
      return point;
    }
  }

  // Tier 4: UF centroid or Belo Horizonte fallback (never throws)
  const ufCoord = viaCepUf ? getUFCoordinates(viaCepUf) : null;
  if (ufCoord) {
    return {
      lat: ufCoord.lat,
      lon: ufCoord.lon,
      label: viaCepCity ? `${viaCepCity} - ${viaCepUf}` : `Região ${viaCepUf}`,
      precision: "approximate",
      city: viaCepCity,
      uf: viaCepUf,
    };
  }

  return {
    lat: DEFAULT_FALLBACK_COORD.lat,
    lon: DEFAULT_FALLBACK_COORD.lon,
    label: parsed.cleaned || "Localização aproximada (Região Metropolitana)",
    precision: "approximate",
    city: DEFAULT_FALLBACK_COORD.city,
    uf: DEFAULT_FALLBACK_COORD.uf,
  };
}

interface OsrmNearestResponse {
  code?: string;
  waypoints?: Array<{ location?: [number, number]; name?: string }>;
}

interface OsrmRouteResponse {
  code?: string;
  routes?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
  }>;
}

async function snapToNearestStreet(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<[number, number]> {
  const url = `https://router.project-osrm.org/nearest/v1/driving/${lon.toFixed(6)},${lat.toFixed(6)}?number=1`;
  const data = await fetchJsonWithTimeout<OsrmNearestResponse>(url, 4000, signal);
  const loc = data?.waypoints?.[0]?.location;
  if (Array.isArray(loc) && loc.length >= 2) {
    return [loc[1], loc[0]];
  }
  return [lat, lon];
}

export function buildFallbackPolyline(
  start: { lat: number; lon: number },
  end: { lat: number; lon: number },
  segments = 12
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Slight smooth road-like curve so fallback route remains clearly visible
    const curveOffset = Math.sin(t * Math.PI) * 0.0025;
    points.push([
      start.lat + (end.lat - start.lat) * t + curveOffset,
      start.lon + (end.lon - start.lon) * t - curveOffset * 0.6,
    ]);
  }
  return points;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let routeGenerationCounter = 0;

export function createRouteVariantSeed(): number {
  routeGenerationCounter = (routeGenerationCounter + 1) >>> 0;
  const timeBits = Date.now() & 0x7fffffff;
  const randBits = Math.floor(Math.random() * 0x7fffffff);
  return ((timeBits ^ randBits) + Math.imul(routeGenerationCounter, 2654435761)) >>> 0;
}

export function buildSharedDeliveryStops(
  cd: { lat: number; lon: number },
  destination: { lat: number; lon: number },
  variantSeed?: number
): SharedRouteStop[] {
  const seed =
    typeof variantSeed === "number" && Number.isFinite(variantSeed)
      ? variantSeed >>> 0
      : createRouteVariantSeed();
  const rng = mulberry32(seed);

  // Vary quantity of intermediate stops between 2 and 6 on every generated tracking route
  const stopCount = 2 + Math.floor(rng() * 5);

  const dLat = destination.lat - cd.lat;
  const dLon = destination.lon - cd.lon;
  const rawHypot = Math.hypot(dLat, dLon);
  const effectiveSpan = Math.max(rawHypot, 0.026);

  const uLat = rawHypot > 1e-5 ? dLat / rawHypot : Math.cos(0.7);
  const uLon = rawHypot > 1e-5 ? dLon / rawHypot : Math.sin(0.7);
  const perpLat = -uLon;
  const perpLon = uLat;

  const firstSide = rng() >= 0.5 ? 1 : -1;
  const stops: SharedRouteStop[] = [];

  for (let i = 0; i < stopCount; i++) {
    const baseT = (i + 1) / (stopCount + 1);
    const tJitter = (rng() - 0.5) * (0.48 / (stopCount + 1));
    const t = Math.max(0.12, Math.min(0.88, baseT + tJitter));

    // Alternate sides with occasional neighborhood cluster, always strictly off-axis
    const flipCluster = stopCount >= 4 && i > 0 && rng() > 0.72 ? -1 : 1;
    const side = (i % 2 === 0 ? firstSide : -firstSide) * flipCluster;
    const lateralMag = (0.18 + rng() * 0.34) * effectiveSpan;

    const basePointLat =
      rawHypot > 1e-5 ? cd.lat + dLat * t : cd.lat + uLat * effectiveSpan * t;
    const basePointLon =
      rawHypot > 1e-5 ? cd.lon + dLon * t : cd.lon + uLon * effectiveSpan * t;

    const lat = basePointLat + perpLat * lateralMag * side;
    const lon = basePointLon + perpLon * lateralMag * side;
    const progressAt = Number((((i + 0.85) / (stopCount + 0.8)) * 0.86).toFixed(2));

    stops.push({
      lat,
      lon,
      label: "Outra Entrega",
      progressAt,
    });
  }

  return stops;
}

export async function resolveCdAndRoute(params: {
  destination: GeocodedPoint;
  originAddress?: string | null;
  storeName?: string | null;
  carrierName?: string | null;
  whiteLabelConfig?: WhiteLabelTrackingConfig;
  variantSeed?: number;
  signal?: AbortSignal;
}): Promise<ResolvedRouteResult> {
  const {
    destination,
    originAddress,
    storeName,
    carrierName,
    whiteLabelConfig,
    variantSeed,
    signal,
  } = params;
  const activeSeed =
    typeof variantSeed === "number" && Number.isFinite(variantSeed)
      ? variantSeed >>> 0
      : createRouteVariantSeed();
  const rng = mulberry32(activeSeed ^ 0x9e3779b9);

  // Automatically calculate nearest real Carrier Distribution Center (defaults to Jadlog if unconfirmed)
  const nearestCarrierCd = resolveNearestCarrierCd({
    destination: {
      lat: destination.lat,
      lon: destination.lon,
      uf: destination.uf || undefined,
    },
    carrierName,
    config: whiteLabelConfig,
  });

  let cd: GeocodedPoint | null = null;

  // If the nearest real Carrier CD is within metropolitan range (<= 26 km), use its real location on the map!
  if (nearestCarrierCd.distanceKm >= 0.4 && nearestCarrierCd.distanceKm <= 26) {
    const [snappedLat, snappedLon] = await snapToNearestStreet(
      nearestCarrierCd.lat,
      nearestCarrierCd.lon,
      signal
    );
    cd = {
      lat: snappedLat,
      lon: snappedLon,
      label: nearestCarrierCd.name,
      precision: "city",
      city: nearestCarrierCd.city,
      uf: nearestCarrierCd.uf,
    };
  } else if (originAddress && originAddress.trim().length > 5) {
    const originCandidate = await geocodeAddress(originAddress, null, signal);
    const distKm = calculateDistance(
      { lat: originCandidate.lat, lon: originCandidate.lon },
      { lat: destination.lat, lon: destination.lon }
    );
    if (distKm >= 0.4 && distKm <= 26) {
      cd = {
        ...originCandidate,
        label: storeName ? `CD ${storeName}` : nearestCarrierCd.name,
      };
    }
  }

  // When the regional Carrier Hub is in a neighboring city (> 26 km), position the local delivery base along the real approach vector from that Carrier CD
  if (!cd) {
    const vecLat = nearestCarrierCd.lat - destination.lat;
    const vecLon = nearestCarrierCd.lon - destination.lon;
    const vecNorm = Math.hypot(vecLat, vecLon);
    const baseAngle =
      vecNorm > 1e-4
        ? Math.atan2(vecLat, vecLon) + (rng() - 0.5) * 0.45
        : Math.PI * (0.95 + rng() * 0.85);
    const radiusDeg = 0.025 + rng() * 0.012;
    const rawCdLat = destination.lat + Math.sin(baseAngle) * radiusDeg;
    const rawCdLon = destination.lon + Math.cos(baseAngle) * radiusDeg;
    const [snappedLat, snappedLon] = await snapToNearestStreet(rawCdLat, rawCdLon, signal);
    cd = {
      lat: snappedLat,
      lon: snappedLon,
      label: `Base Local ${nearestCarrierCd.carrierName} (${nearestCarrierCd.name})`,
      precision: "city",
      city: destination.city || nearestCarrierCd.city,
      uf: destination.uf || nearestCarrierCd.uf,
    };
  }

  const rawStops = buildSharedDeliveryStops(cd, destination, activeSeed);
  const snappedStops: SharedRouteStop[] = await Promise.all(
    rawStops.map(async (st) => {
      const [sLat, sLon] = await snapToNearestStreet(st.lat, st.lon, signal);
      return { ...st, lat: sLat, lon: sLon };
    })
  );

  const waypointsParam = [
    `${cd.lon.toFixed(6)},${cd.lat.toFixed(6)}`,
    ...snappedStops.map((s) => `${s.lon.toFixed(6)},${s.lat.toFixed(6)}`),
    `${destination.lon.toFixed(6)},${destination.lat.toFixed(6)}`,
  ].join(";");

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${waypointsParam}?overview=full&geometries=geojson`;
  const osrmData = await fetchJsonWithTimeout<OsrmRouteResponse>(osrmUrl, 6500, signal);
  const coords = osrmData?.routes?.[0]?.geometry?.coordinates;

  if (Array.isArray(coords) && coords.length >= 2) {
    const route: Array<[number, number]> = coords.map(([lon, lat]) => [lat, lon]);
    return {
      cd,
      nearestCarrierCd,
      destination,
      route,
      stops: snappedStops,
      usedFallbackRoute: false,
    };
  }

  const chainPoints: Array<{ lat: number; lon: number }> = [
    cd,
    ...snappedStops,
    destination,
  ];
  const fallbackCircuit: Array<[number, number]> = [];
  for (let i = 0; i < chainPoints.length - 1; i++) {
    const segment = buildFallbackPolyline(chainPoints[i], chainPoints[i + 1], 5);
    fallbackCircuit.push(...(i === 0 ? segment : segment.slice(1)));
  }

  return {
    cd,
    nearestCarrierCd,
    destination,
    route: fallbackCircuit,
    stops: snappedStops,
    usedFallbackRoute: true,
  };
}

export interface RouteInterpolationResult {
  coord: [number, number];
  traveledPath: Array<[number, number]>;
}

export function interpolateAlongRouteWithPrefix(
  route: Array<[number, number]>,
  progress01: number
): RouteInterpolationResult {
  if (!route || route.length === 0) {
    const fallback: [number, number] = [DEFAULT_FALLBACK_COORD.lat, DEFAULT_FALLBACK_COORD.lon];
    return { coord: fallback, traveledPath: [fallback] };
  }
  if (route.length === 1) {
    return { coord: route[0], traveledPath: [route[0]] };
  }

  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress01) ? progress01 : 0));
  if (clamped <= 0) {
    return { coord: route[0], traveledPath: [route[0]] };
  }
  if (clamped >= 1) {
    return { coord: route[route.length - 1], traveledPath: [...route] };
  }

  const segmentDistances: number[] = [];
  let totalDistance = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const d = calculateDistance(
      { lat: route[i][0], lon: route[i][1] },
      { lat: route[i + 1][0], lon: route[i + 1][1] }
    );
    segmentDistances.push(d);
    totalDistance += d;
  }

  if (totalDistance <= 0) {
    return { coord: route[route.length - 1], traveledPath: [...route] };
  }

  const targetDistance = totalDistance * clamped;
  let accumulated = 0;
  for (let i = 0; i < segmentDistances.length; i++) {
    const segLen = segmentDistances[i];
    if (accumulated + segLen >= targetDistance) {
      const localRatio = segLen > 0 ? (targetDistance - accumulated) / segLen : 0;
      const [lat1, lon1] = route[i];
      const [lat2, lon2] = route[i + 1];
      const coord: [number, number] = [
        lat1 + (lat2 - lat1) * localRatio,
        lon1 + (lon2 - lon1) * localRatio,
      ];
      return {
        coord,
        traveledPath: [...route.slice(0, i + 1), coord],
      };
    }
    accumulated += segLen;
  }

  return { coord: route[route.length - 1], traveledPath: [...route] };
}

export function interpolateAlongRoute(
  route: Array<[number, number]>,
  progress01: number
): [number, number] {
  return interpolateAlongRouteWithPrefix(route, progress01).coord;
}
