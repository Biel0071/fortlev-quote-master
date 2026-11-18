import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation2, Truck } from "lucide-react";
import {
  createRouteVariantSeed,
  geocodeAddress,
  interpolateAlongRouteWithPrefix,
  resolveCdAndRoute,
  type ResolvedRouteResult,
} from "@/utils/trackingGeo";
import type { LastDayDeliveryEvaluation } from "@/utils/deliverySchedule";
import type {
  NearestCarrierCdResult,
  WhiteLabelTrackingConfig,
} from "@/utils/whiteLabelTracking";

export interface TrackingMapProps {
  address?: string | null;
  cep?: string | null;
  storeName?: string | null;
  storeAddress?: string | null;
  carrierName?: string | null;
  whiteLabelConfig?: WhiteLabelTrackingConfig;
  schedule: LastDayDeliveryEvaluation;
  isDelivered?: boolean;
  variantSeed?: number;
  onStopsResolved?: (stopCount: number) => void;
  onNearestCdResolved?: (cd: NearestCarrierCdResult) => void;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createCdMarkerIcon(label: string): L.DivIcon {
  const safeLabel = escapeHtml(label);
  return L.divIcon({
    className: "leaflet-tracking-icon",
    iconSize: [140, 56],
    iconAnchor: [70, 48],
    html: `
      <div data-marker="cd" class="flex flex-col items-center pointer-events-auto">
        <div style="background:#17337A;color:#ffffff;padding:6px;border-radius:12px;border:2px solid #ffffff;box-shadow:0 4px 12px rgba(15,35,86,0.35);display:flex;align-items:center;justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
        </div>
        <div style="background:#ffffff;color:#0f172a;padding:2px 8px;border-radius:9999px;border:1px solid #cbd5e1;box-shadow:0 2px 6px rgba(15,23,42,0.12);margin-top:4px;font-size:10px;font-weight:900;text-transform:uppercase;white-space:nowrap;letter-spacing:0.03em;">
          ${safeLabel}
        </div>
      </div>
    `,
  });
}

function createSharedStopIcon(index: number, completed: boolean): L.DivIcon {
  const bg = completed ? "#059669" : "#475569";
  const badgeText = completed ? "Entregue ✓" : "Outra Entrega";
  return L.divIcon({
    className: "leaflet-tracking-icon",
    iconSize: [116, 46],
    iconAnchor: [58, 36],
    html: `
      <div data-marker="shared-stop-${index}" class="flex flex-col items-center pointer-events-auto opacity-95">
        <div style="background:${bg};color:#ffffff;padding:5px;border-radius:10px;border:2px solid #ffffff;box-shadow:0 3px 10px rgba(15,23,42,0.28);display:flex;align-items:center;justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
        </div>
        <div style="background:#ffffff;color:#1e293b;padding:1.5px 7px;border-radius:9999px;border:1px solid #cbd5e1;box-shadow:0 2px 5px rgba(15,23,42,0.1);margin-top:3px;font-size:9px;font-weight:800;text-transform:uppercase;white-space:nowrap;letter-spacing:0.02em;">
          ${badgeText}
        </div>
      </div>
    `,
  });
}

function createOrderMarkerIcon(
  isMoving: boolean,
  isDelivered: boolean
): L.DivIcon {
  const pulseDot = isMoving
    ? `<span style="position:absolute;top:-3px;right:-3px;width:10px;height:10px;border-radius:9999px;background:#10b981;border:2px solid #ffffff;"></span>`
    : "";
  const pillLabel = isDelivered
    ? "Seu Pedido • Entregue"
    : "Seu Pedido • Em Rota";
  return L.divIcon({
    className: "leaflet-tracking-icon",
    iconSize: [176, 68],
    iconAnchor: [88, 34],
    html: `
      <div data-marker="order" class="flex flex-col items-center pointer-events-auto">
        <div style="position:relative;background:#0f172a;color:#ffffff;padding:8px;border-radius:16px;border:2px solid #ffffff;box-shadow:0 8px 20px rgba(15,23,42,0.45);display:flex;align-items:center;justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
          ${pulseDot}
        </div>
        <div style="background:#0f172a;color:#ffffff;padding:2.5px 10px;border-radius:9999px;box-shadow:0 2px 8px rgba(15,23,42,0.28);margin-top:4px;font-size:9px;font-weight:900;text-transform:uppercase;white-space:nowrap;letter-spacing:0.05em;">
          ${pillLabel}
        </div>
      </div>
    `,
  });
}

function extractMovementWake(
  traveledPath: Array<[number, number]>,
  totalRoutePoints: number
): Array<[number, number]> {
  const wakeCount = Math.max(2, Math.min(8, Math.ceil(totalRoutePoints * 0.1)));
  return traveledPath.slice(-wakeCount);
}

export function TrackingMap({
  address,
  cep,
  storeName,
  storeAddress,
  carrierName,
  whiteLabelConfig,
  schedule,
  isDelivered = false,
  variantSeed,
  onStopsResolved,
  onNearestCdResolved,
}: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const orderMarkerRef = useRef<L.Marker | null>(null);
  const haloCircleRef = useRef<L.Circle | null>(null);
  const traveledWakeRef = useRef<L.Polyline | null>(null);
  const stopMarkersRef = useRef<
    Array<{ marker: L.Marker; index: number; progressAt: number }>
  >([]);
  const routeRef = useRef<Array<[number, number]>>([]);
  const hasFittedBoundsRef = useRef(false);
  const onStopsResolvedRef = useRef(onStopsResolved);
  onStopsResolvedRef.current = onStopsResolved;
  const onNearestCdResolvedRef = useRef(onNearestCdResolved);
  onNearestCdResolvedRef.current = onNearestCdResolved;
  const whiteLabelRef = useRef(whiteLabelConfig);
  whiteLabelRef.current = whiteLabelConfig;

  const activeVariantSeed = useMemo(
    () =>
      typeof variantSeed === "number" && Number.isFinite(variantSeed)
        ? variantSeed
        : createRouteVariantSeed(),
    [variantSeed]
  );

  const [resolvedRoute, setResolvedRoute] = useState<ResolvedRouteResult | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(true);

  const effectiveProgress = useMemo(() => {
    if (isDelivered) return 0.92;
    if (schedule.isOutForDeliveryLastDay) return schedule.routeProgress;
    const seedOffset = ((activeVariantSeed % 23) - 11) * 0.012;
    return Math.max(0.22, Math.min(0.74, schedule.routeProgress + seedOffset));
  }, [isDelivered, schedule.isOutForDeliveryLastDay, schedule.routeProgress, activeVariantSeed]);

  const latestProgressRef = useRef(effectiveProgress);
  latestProgressRef.current = effectiveProgress;
  const latestHeadlineRef = useRef(schedule.headline);
  latestHeadlineRef.current = schedule.headline;
  const latestIsMovingRef = useRef(!isDelivered);
  latestIsMovingRef.current = !isDelivered;
  const latestIsDeliveredRef = useRef(isDelivered);
  latestIsDeliveredRef.current = isDelivered;

  // 1. Geocode destination internally for regional zone + resolve CD & varied multi-stop urban circuit
  useEffect(() => {
    const controller = new AbortController();
    hasFittedBoundsRef.current = false;
    setLoadingGeo(true);

    (async () => {
      try {
        const destination = await geocodeAddress(address, cep, controller.signal);
        if (controller.signal.aborted) return;

        const routed = await resolveCdAndRoute({
          destination,
          originAddress: storeAddress,
          storeName,
          carrierName,
          whiteLabelConfig: whiteLabelRef.current,
          variantSeed: activeVariantSeed,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        setResolvedRoute(routed);
        onStopsResolvedRef.current?.(routed.stops.length);
        onNearestCdResolvedRef.current?.(routed.nearestCarrierCd);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingGeo(false);
        }
      }
    })();

    return () => controller.abort();
  }, [address, cep, storeAddress, storeName, carrierName, activeVariantSeed]);

  // 2. Initialize Leaflet map once (attributionControl disabled — no OpenStreetMap/Leaflet brand mark)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      center: [-19.9167, -43.9345],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;

    const invalidateTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 120);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(el);
    }

    return () => {
      window.clearTimeout(invalidateTimer);
      resizeObserver?.disconnect();
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
      orderMarkerRef.current = null;
      haloCircleRef.current = null;
      traveledWakeRef.current = null;
      stopMarkersRef.current = [];
    };
  }, []);

  // 3. Draw CD marker, shared regional delivery stops, active movement wake & Seu Pedido marker (hiding exact destination and avoiding 1 direct A->B line)
  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group || !resolvedRoute) return;

    group.clearLayers();
    stopMarkersRef.current = [];
    routeRef.current = resolvedRoute.route;

    const { cd, nearestCarrierCd, stops, route } = resolvedRoute;
    const initProgress = latestProgressRef.current;

    // CD Distribuição marker (transportadora mais próxima)
    const cdPinTitle = `CD ${nearestCarrierCd.carrierName}`;
    const cdMarker = L.marker([cd.lat, cd.lon], {
      icon: createCdMarkerIcon(cdPinTitle),
      zIndexOffset: 200,
    }).addTo(group);
    cdMarker.bindPopup(
      `<strong>${escapeHtml(nearestCarrierCd.name)}</strong><br/>${escapeHtml(nearestCarrierCd.address)}`
    );

    // Intermediate shared delivery stops across the city (multi-order route)
    stops.forEach((stop, idx) => {
      const stopIndex = idx + 1;
      const completed = initProgress >= stop.progressAt;
      const stopMarker = L.marker([stop.lat, stop.lon], {
        icon: createSharedStopIcon(stopIndex, completed),
        zIndexOffset: 260 + idx * 10,
      }).addTo(group);
      stopMarker.bindPopup(
        `<strong>${escapeHtml(stop.label)}</strong><br/>Rota compartilhada com entregas na região`
      );
      stopMarkersRef.current.push({
        marker: stopMarker,
        index: stopIndex,
        progressAt: stop.progressAt,
      });
    });

    // Seu Pedido marker interpolated along multi-stop urban circuit
    const { coord: orderCoord, traveledPath } = interpolateAlongRouteWithPrefix(
      route,
      initProgress
    );

    // Regional operation zone halo around the delivery vehicle
    const halo = L.circle(orderCoord, {
      radius: 380,
      color: "#1d4ed8",
      weight: 1.5,
      dashArray: "4 4",
      fillColor: "#3b82f6",
      fillOpacity: 0.08,
    }).addTo(group);
    haloCircleRef.current = halo;

    // Short recent movement wake behind the vehicle (not 1 full path to destination)
    const wakePoints = extractMovementWake(traveledPath, route.length);
    const wakeLine = L.polyline(wakePoints, {
      color: "#17337A",
      weight: 4,
      opacity: 0.65,
      dashArray: "6 6",
      lineCap: "round",
      lineJoin: "round",
    }).addTo(group);
    traveledWakeRef.current = wakeLine;

    const orderMarker = L.marker(orderCoord, {
      icon: createOrderMarkerIcon(
        latestIsMovingRef.current,
        latestIsDeliveredRef.current
      ),
      zIndexOffset: 500,
    }).addTo(group);
    orderMarker.bindPopup(
      `<strong>Seu Pedido</strong><br/>${escapeHtml(latestHeadlineRef.current)}`
    );
    orderMarkerRef.current = orderMarker;

    if (!hasFittedBoundsRef.current) {
      const boundsPoints: Array<[number, number]> = [
        [cd.lat, cd.lon],
        ...stops.map((s): [number, number] => [s.lat, s.lon]),
        orderCoord,
      ];
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, {
        paddingTopLeft: [64, 64],
        paddingBottomRight: [64, 130],
        maxZoom: 14,
      });
      hasFittedBoundsRef.current = true;
      window.setTimeout(() => map.invalidateSize(), 80);
    }
  }, [resolvedRoute]);

  // 4. Smoothly reposition Order marker, regional halo, short wake & shared stop badges over time
  useEffect(() => {
    const marker = orderMarkerRef.current;
    const route = routeRef.current;
    if (!marker || route.length === 0) return;

    const { coord: nextCoord, traveledPath } = interpolateAlongRouteWithPrefix(
      route,
      effectiveProgress
    );
    marker.setLatLng(nextCoord);
    marker.setIcon(
      createOrderMarkerIcon(
        !isDelivered,
        isDelivered
      )
    );
    marker.setPopupContent(
      `<strong>Seu Pedido</strong><br/>${escapeHtml(schedule.headline)}`
    );

    if (haloCircleRef.current) {
      haloCircleRef.current.setLatLng(nextCoord);
    }

    if (traveledWakeRef.current) {
      traveledWakeRef.current.setLatLngs(
        extractMovementWake(traveledPath, route.length)
      );
    }

    stopMarkersRef.current.forEach(({ marker: stopMarker, index, progressAt }) => {
      stopMarker.setIcon(
        createSharedStopIcon(index, effectiveProgress >= progressAt)
      );
    });
  }, [effectiveProgress, schedule.headline, isDelivered]);

  const statusToneClass =
    schedule.phase === "reschedule"
      ? "border-amber-300 bg-amber-50/95 text-amber-950"
      : schedule.phase === "arrived" || isDelivered
      ? "border-emerald-300 bg-emerald-50/95 text-emerald-950"
      : "border-white/70 bg-white/95 text-slate-900";

  return (
    <div className="relative z-0 isolate w-full h-[380px] sm:h-[440px] lg:h-[500px] bg-slate-100 rounded-3xl overflow-hidden border-2 border-slate-200 shadow-inner">
      <div
        ref={containerRef}
        className="w-full h-full z-0"
        aria-label="Mapa geográfico interativo da rota compartilhada de entregas"
      />

      {loadingGeo && (
        <div className="absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-slate-200 flex items-center gap-2 text-[11px] font-bold text-slate-700 pointer-events-none">
          <Navigation2 className="w-3.5 h-3.5 text-primary animate-spin" />
          <span>Localizando veículo em rota...</span>
        </div>
      )}

      {/* Real-time status overlay (shared multi-delivery route, hidden destination) */}
      <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md z-[400] pointer-events-none">
        <div
          className={`backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border space-y-1.5 ${statusToneClass}`}
        >
          <div className="flex items-center gap-2">
            <Truck className="w-3.5 h-3.5 text-primary shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest text-primary leading-none">
              Status em Tempo Real
            </p>
            {schedule.isOutForDeliveryLastDay && (
              <span className="text-[10px] font-bold text-slate-500 ml-auto">
                {schedule.saoPauloTimeLabel} BRT
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm font-black leading-snug" data-testid="map-schedule-headline">
            {schedule.headline}
          </p>
          <p className="text-[11px] font-medium opacity-80 leading-snug">
            {schedule.subtext}
          </p>
          {!isDelivered && (
            <div className="pt-0.5 flex items-center gap-1.5 text-[10px] font-bold text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Carga compartilhada • Seu pedido segue junto com outras entregas</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
