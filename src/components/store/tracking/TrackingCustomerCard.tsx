import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  Package,
  Truck,
  MapPin,
  CheckCircle2,
  User,
  Map,
  Calendar,
  Clock,
  ShieldCheck,
  CreditCard,
  Navigation2,
  Copy,
  Check,
  Share2,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { TrackingMap } from "@/components/store/tracking/TrackingMap";
import { createRouteVariantSeed } from "@/utils/trackingGeo";
import { CarrierBrandLogo } from "@/components/store/tracking/CarrierBrandLogo";
import {
  buildWhiteLabelAutomatedTimeline,
  resolveEffectiveCarrierName,
  resolveNearestCarrierCd,
  type NearestCarrierCdResult,
  type WhiteLabelTrackingConfig,
} from "@/utils/whiteLabelTracking";
import {
  evaluateLastDayDeliverySchedule,
  formatDateSaoPauloBR,
  formatDateTimeSaoPauloBR,
} from "@/utils/deliverySchedule";
import { toast } from "@/hooks/use-toast";

export interface TrackingOrderItem {
  product_name?: string;
  name_snapshot?: string;
  name?: string;
  unit_snapshot?: string | null;
  unit?: string | null;
  quantity: number;
  price_snapshot?: number | null;
  unit_price?: number | null;
  price?: number | null;
  subtotal?: number | null;
  total?: number | null;
  line_total?: number | null;
  product?: {
    name?: string | null;
    unit?: string | null;
    basePrice?: number | null;
  } | null;
}

export interface TrackingCustomerCardProps {
  trackingCode: string;
  orderId?: string | null;
  statusLabel: string;
  progress: number;
  estimatedDeliveryAt?: string | null;
  postedAt?: string | null;
  deliveredAt?: string | null;
  carrier?: {
    id?: string;
    name?: string | null;
    logo_url?: string | null;
    website?: string | null;
    tracking_url_template?: string | null;
  } | null;
  storeName?: string | null;
  storeAddress?: string | null;
  storeLogoUrl?: string | null;
  whiteLabelConfig?: WhiteLabelTrackingConfig;
  timeline?: Array<{
    id?: string;
    title: string;
    description?: string | null;
    location_city?: string | null;
    location_state?: string | null;
    event_at: string;
    is_simulated?: boolean;
  }>;
  items?: TrackingOrderItem[];
  orderTotal?: number | null;
  customerName?: string | null;
  address?: string | null;
  cep?: string | null;
  isSimulating?: boolean;
  compact?: boolean;
  now?: Date;
  onResetSearch?: () => void;
}

export const TrackingCustomerCard: React.FC<TrackingCustomerCardProps> = ({
  trackingCode,
  orderId,
  statusLabel,
  progress,
  estimatedDeliveryAt,
  postedAt,
  deliveredAt,
  carrier,
  storeName,
  storeAddress,
  storeLogoUrl,
  whiteLabelConfig,
  timeline = [],
  items = [],
  orderTotal = 0,
  customerName,
  address,
  cep,
  isSimulating = false,
  compact = false,
  now,
  onResetSearch,
}) => {
  const [copied, setCopied] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [liveNow, setLiveNow] = useState<Date>(() => new Date());
  const [routeSeed, setRouteSeed] = useState<number>(() => createRouteVariantSeed());
  const [resolvedNearestCd, setResolvedNearestCd] =
    useState<NearestCarrierCdResult | null>(null);

  useEffect(() => {
    setRouteSeed(createRouteVariantSeed());
  }, [trackingCode]);

  useEffect(() => {
    if (now) return;
    const timer = window.setInterval(() => {
      setLiveNow(new Date());
    }, 15000);
    return () => window.clearInterval(timer);
  }, [now]);

  const activeNow = now ?? liveNow;

  const schedule = useMemo(
    () =>
      evaluateLastDayDeliverySchedule({
        now: activeNow,
        statusLabel,
        estimatedDeliveryAt,
        deliveredAt,
      }),
    [activeNow, statusLabel, estimatedDeliveryAt, deliveredAt]
  );

  const safeProgress = Math.max(5, Math.min(100, Math.round(Number(progress) || 10)));
  const isDelivered =
    Boolean(deliveredAt) ||
    safeProgress >= 100 ||
    statusLabel.toLowerCase().includes("entregue");
  const isCancelled = statusLabel.toLowerCase().includes("cancelad");

  const visualProgress = isDelivered
    ? 100
    : isCancelled
    ? safeProgress
    : schedule.isOutForDeliveryLastDay
    ? 85
    : Math.max(safeProgress, 65);

  const effectiveStatusHeadline = isDelivered
    ? statusLabel || "Entregue"
    : isCancelled
    ? statusLabel
    : schedule.headline;

  const effectiveCarrierName = useMemo(
    () => resolveEffectiveCarrierName(carrier?.name, whiteLabelConfig),
    [carrier?.name, whiteLabelConfig]
  );

  const effectiveStoreName =
    (whiteLabelConfig?.originStoreName || storeName || "").trim() ||
    "Loja Oficial";
  const effectiveStoreAddress =
    (whiteLabelConfig?.originStoreAddress || storeAddress || "").trim() || null;

  const activeNearestCd = useMemo(
    () =>
      resolvedNearestCd ||
      resolveNearestCarrierCd({
        destination: { lat: -19.9167, lon: -43.9345, uf: "MG" },
        carrierName: effectiveCarrierName,
        config: whiteLabelConfig,
      }),
    [resolvedNearestCd, effectiveCarrierName, whiteLabelConfig]
  );

  const displayTimeline = useMemo(
    () =>
      buildWhiteLabelAutomatedTimeline({
        existingTimeline: timeline,
        postedAt,
        estimatedDeliveryAt,
        deliveredAt,
        now: activeNow,
        originStoreName: effectiveStoreName,
        originStoreAddress: effectiveStoreAddress,
        carrierName: effectiveCarrierName,
        nearestCd: activeNearestCd,
        schedule,
      }),
    [
      timeline,
      postedAt,
      estimatedDeliveryAt,
      deliveredAt,
      activeNow,
      effectiveStoreName,
      effectiveStoreAddress,
      effectiveCarrierName,
      activeNearestCd,
      schedule,
    ]
  );

  const steps = [
    { label: "Loja", icon: <Store className="w-4 h-4" strokeWidth={2.2} />, active: visualProgress >= 10 },
    { label: "CD", icon: <Package className="w-4 h-4" strokeWidth={2.2} />, active: visualProgress >= 30 },
    { label: "Trânsito", icon: <Truck className="w-4 h-4" strokeWidth={2.2} />, active: visualProgress >= 50 },
    { label: "Entrega", icon: <MapPin className="w-4 h-4" strokeWidth={2.2} />, active: visualProgress >= 85 },
    { label: "Entregue", icon: <CheckCircle2 className="w-4 h-4" strokeWidth={2.2} />, active: isDelivered },
  ];

  const handleCopyCode = () => {
    if (!trackingCode) return;
    navigator.clipboard.writeText(trackingCode);
    setCopied(true);
    toast({ title: "Código copiado!", description: `${trackingCode} copiado para a área de transferência.` });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const url = `${window.location.origin}/rastreio?q=${encodeURIComponent(trackingCode)}`;
    const text = `Acompanhe o rastreio do pedido (${trackingCode}) - Status: ${effectiveStatusHeadline}: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const normalizedItems = useMemo(() => {
    return (items || []).map((item) => {
      const itemName =
        item.product_name ||
        item.name_snapshot ||
        item.product?.name ||
        item.name ||
        "Material / Produto";
      const qty = Math.max(1, Number(item.quantity || 1));
      const unit = item.unit || item.unit_snapshot || item.product?.unit || null;
      const rawUnitPrice = Number(
        item.unit_price ??
          item.price_snapshot ??
          item.price ??
          item.product?.basePrice ??
          0
      );
      const rawLineTotal = Number(
        item.line_total ?? item.subtotal ?? item.total ?? 0
      );
      const lineTotal =
        rawLineTotal > 0 ? rawLineTotal : rawUnitPrice > 0 ? rawUnitPrice * qty : 0;
      const unitPrice =
        rawUnitPrice > 0 ? rawUnitPrice : lineTotal > 0 ? lineTotal / qty : 0;

      return {
        itemName,
        qty,
        unit,
        unitPrice,
        lineTotal,
      };
    });
  }, [items]);

  const computedTotal =
    Number(orderTotal) > 0
      ? Number(orderTotal)
      : normalizedItems.reduce((acc, it) => acc + it.lineTotal, 0);

  const formattedEstimatedDate = formatDateSaoPauloBR(estimatedDeliveryAt);

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-2 border-primary/10 shadow-2xl rounded-3xl bg-white">
        {/* Compact Top Hero Card: Destinatário -> Em rota na região -> Pedido/Cód/Copiar/Compartilhar -> Previsão -> Barra -> Emojis */}
        <div
          className={`${
            isDelivered
              ? "bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700"
              : schedule.phase === "reschedule"
              ? "bg-gradient-to-br from-amber-700 via-amber-600 to-slate-800"
              : "bg-gradient-to-br from-[#17337A] via-[#1E3A8A] to-[#0F2356]"
          } p-4 sm:p-6 text-white relative overflow-hidden`}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/15 rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-2.5">
            {/* 1. Destinatário */}
            {customerName && (
              <div
                className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold bg-white/15 px-3 py-1 rounded-full border border-white/15 w-fit max-w-full"
                data-testid="tracking-recipient"
              >
                <User className="w-3.5 h-3.5 text-white/90 shrink-0" strokeWidth={2.3} />
                <span className="truncate">Destinatário: {customerName}</span>
              </div>
            )}

            {/* 2. Em rota na região */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2.5">
                <h2
                  className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight"
                  data-testid="tracking-status-headline"
                >
                  {effectiveStatusHeadline}
                </h2>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399] shrink-0" />
              </div>
              {!isDelivered && !isCancelled && (
                <p className="text-[11px] sm:text-xs text-white/80 font-medium leading-snug">
                  {schedule.subtext}
                </p>
              )}
            </div>

            {/* 3. Pedido, Cód, Copiar, Compartilhar */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-white/95">
              <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                Pedido #{orderId ? orderId.slice(0, 8) : "83b0dd1b"}
              </span>
              <span className="font-mono font-bold bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
                Cód: {trackingCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1 font-bold bg-white/15 hover:bg-white/25 transition-colors px-2.5 py-1 rounded-lg"
                title="Copiar código de rastreio"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="inline-flex items-center gap-1 font-bold bg-white/15 hover:bg-white/25 transition-colors px-2.5 py-1 rounded-lg"
                title="Compartilhar rastreio no WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                Compartilhar
              </button>
            </div>

            {/* 4. Previsão */}
            {formattedEstimatedDate && (
              <div
                className="inline-flex items-center gap-2 bg-white/12 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 w-fit"
                data-testid="estimated-delivery-box"
              >
                <Calendar className="w-3.5 h-3.5 text-sky-200 shrink-0" />
                <span className="text-[11px] uppercase font-bold tracking-wider text-white/80">
                  Previsão:
                </span>
                <span className="text-sm sm:text-base font-black" data-testid="estimated-delivery-date">
                  {formattedEstimatedDate}
                </span>
              </div>
            )}

            {/* 5. Barra de Progresso */}
            <div className="pt-1">
              <div className="relative h-3.5 bg-black/25 rounded-full p-0.5 shadow-inner border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-sky-200 via-white to-white rounded-full transition-all duration-700 ease-out shadow-[0_0_16px_rgba(255,255,255,0.65)] relative"
                  style={{ width: `${visualProgress}%` }}
                >
                  <div className="absolute right-0 -top-1.5 w-5 h-5 rounded-full bg-white text-[#17337A] shadow-md flex items-center justify-center border-2 border-[#17337A]">
                    <Truck className="w-2.5 h-2.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Ícones Monocromáticos das Etapas */}
            <div className="flex justify-between pt-1 px-0.5" data-testid="tracking-emoji-steps">
              {steps.map((step, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1 flex-1 relative">
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-500 border backdrop-blur-md ${
                      step.active
                        ? "bg-white text-[#17337A] border-white shadow-[0_0_14px_rgba(255,255,255,0.35)] scale-105"
                        : "bg-white/5 text-white/45 border-white/10"
                    }`}
                  >
                    {step.icon}
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase tracking-tight leading-none text-center ${
                      step.active ? "text-white" : "opacity-50 text-white/75"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 7. Mapa de Entrega */}
        <div className="p-4 sm:p-6 pb-0 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Map className="w-3.5 h-3.5" strokeWidth={2.3} />
              </div>
              <h3 className="font-black uppercase tracking-wider text-xs sm:text-sm text-slate-800">
                Mapa de Entrega
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={`text-[10px] font-black uppercase border-primary/20 text-primary ${
                  isSimulating || !isDelivered ? "bg-primary/5" : ""
                }`}
                data-testid="tracking-route-badge"
              >
                {!isDelivered ? "Em Rota Compartilhada" : "Concluído"}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMap((v) => !v)}
                className="h-7 rounded-full text-[10px] font-black uppercase tracking-wider px-2.5"
              >
                <Navigation2 className="w-3 h-3 mr-1 text-primary" />
                {showMap ? "Ocultar Mapa" : "Ver Mapa"}
              </Button>
            </div>
          </div>

          {showMap && (
            <div className="space-y-3 animate-in fade-in duration-300">
              <TrackingMap
                address={address}
                cep={cep}
                storeName={effectiveStoreName}
                storeAddress={effectiveStoreAddress}
                carrierName={effectiveCarrierName}
                whiteLabelConfig={whiteLabelConfig}
                schedule={schedule}
                isDelivered={isDelivered}
                variantSeed={routeSeed}
                onNearestCdResolved={setResolvedNearestCd}
              />
            </div>
          )}
        </div>

        {/* Corpo Principal: Linha do Tempo + Logística + Produtos */}
        <div className={`p-6 sm:p-8 grid grid-cols-1 ${compact ? "lg:grid-cols-1" : "lg:grid-cols-5"} gap-8`}>
          {/* Coluna Esquerda: Linha do Tempo */}
          <div className={`${compact ? "" : "lg:col-span-3"} space-y-6`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="font-black uppercase tracking-widest text-sm text-slate-800">
                Linha do Tempo
              </h3>
            </div>

            {displayTimeline.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center text-sm text-slate-500 space-y-1.5">
                <p className="font-semibold text-slate-700">
                  {!isDelivered && !isCancelled
                    ? schedule.headline
                    : "Objeto registrado na base logística."}
                </p>
                {!isDelivered && !isCancelled && (
                  <p className="text-xs text-slate-500">{schedule.subtext}</p>
                )}
              </div>
            ) : (
              <div className="relative pl-5 space-y-8 before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {displayTimeline.map((event, idx) => (
                  <div key={event.id || idx} className="relative pl-8">
                    <div
                      className={`absolute left-[-7px] top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm ${
                        idx === 0 ? "bg-primary scale-125 ring-4 ring-primary/15" : "bg-slate-300"
                      }`}
                    />
                    <div className="flex flex-col gap-1.5 bg-slate-50/70 hover:bg-slate-50 transition-colors p-3.5 rounded-2xl border border-slate-100">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span
                          className={`font-black uppercase tracking-tight text-sm sm:text-base ${
                            idx === 0 ? "text-primary" : "text-slate-700"
                          }`}
                        >
                          {event.title}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200/80 w-fit">
                          {formatDateTimeSaoPauloBR(event.event_at)}
                        </span>
                      </div>
                      {event.description && (
                        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                          {event.description}
                        </p>
                      )}
                      {(event.location_city || event.location_state) && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>
                            {event.location_city}
                            {event.location_city && event.location_state ? " / " : ""}
                            {event.location_state}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coluna Direita: Logística + Produtos + Total */}
          <div className={`${compact ? "" : "lg:col-span-2"} space-y-5`}>
            {/* Card de Logística com Logo Oficial da Empresa / Transportadora */}
            <div
              className="p-5 rounded-3xl bg-slate-50/90 border border-slate-200/80 space-y-3.5 shadow-sm"
              data-testid="logistics-card"
            >
              <div className="flex items-center gap-3 min-w-0">
                <CarrierBrandLogo
                  name={effectiveCarrierName}
                  logoUrl={
                    carrier?.logo_url ||
                    whiteLabelConfig?.brandLogoUrl ||
                    storeLogoUrl ||
                    undefined
                  }
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider leading-none mb-1">
                    Logística • {effectiveStoreName}
                  </p>
                  <h4
                    className="font-black text-base sm:text-lg text-slate-800 leading-tight truncate"
                    data-testid="logistics-store-name"
                  >
                    {effectiveCarrierName}
                  </h4>
                  <p
                    className="text-[11px] font-semibold text-slate-500 truncate"
                    title={`${activeNearestCd.name} (${activeNearestCd.city}/${activeNearestCd.uf})`}
                  >
                    {activeNearestCd.name}
                  </p>
                </div>
              </div>

              <div className="bg-white px-3.5 py-3 rounded-xl border border-slate-100 flex items-center justify-center gap-2 text-center">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-tight leading-snug text-center">
                  {isDelivered
                    ? "Encomenda entregue e assinada pelo recebedor"
                    : !isCancelled
                    ? "Em rota compartilhada junto com outras entregas na região"
                    : "Pedido em carga monitorada pela logística"}
                </p>
              </div>
            </div>

            {/* Card Produtos do Pedido */}
            <div
              className="p-4 sm:p-5 rounded-3xl border border-slate-200/80 bg-white space-y-3 shadow-sm"
              data-testid="order-products-card"
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-black uppercase tracking-wider text-xs text-slate-500">
                  Produtos do Pedido
                </h4>
                <Badge variant="secondary" className="text-[10px] font-bold shrink-0">
                  {normalizedItems.length > 0
                    ? `${normalizedItems.length} ${normalizedItems.length === 1 ? "item" : "itens"}`
                    : "Carga Conferida"}
                </Badge>
              </div>

              {normalizedItems.length > 0 ? (
                <div className="space-y-2">
                  {normalizedItems.map((item, i) => {
                    const unitSuffix = (item.unit || "un").trim();
                    return (
                      <div
                        key={i}
                        data-testid="order-product-row"
                        className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-xs sm:text-[13px] font-bold text-slate-800 leading-snug break-words">
                            {item.itemName}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-500 font-semibold leading-tight">
                            <span className="whitespace-nowrap">
                              Qtd: {item.qty} {unitSuffix}
                            </span>
                            {item.unitPrice > 0 && (
                              <span className="whitespace-nowrap">
                                • {formatCurrency(item.unitPrice)}/{unitSuffix}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0 pl-1">
                          <span className="text-xs sm:text-sm font-black text-slate-900 tabular-nums whitespace-nowrap">
                            {item.lineTotal > 0 ? formatCurrency(item.lineTotal) : "—"}
                          </span>
                          <span className="text-[10px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                            x{item.qty}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Volume Comercial / Pedido Consolidado
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Mercadoria conferida e lacrada conforme Nota Fiscal / Romaneio.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Card Valor Total */}
            <Card className="rounded-3xl border-none bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl">
              <CardContent className="p-6 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-60">
                    Valor Total do Pedido
                  </p>
                  <p className="text-2xl font-black tabular-nums">
                    {computedTotal > 0 ? formatCurrency(computedTotal) : "Frete & Carga Faturada"}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Carga conferida e monitorada
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                  <CreditCard className="w-6 h-6 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Card>

      {onResetSearch && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Sistema de rastreamento auditado e seguro
          </div>
          <span className="hidden sm:inline text-slate-200">•</span>
          <button
            type="button"
            onClick={onResetSearch}
            className="text-xs font-black uppercase tracking-widest text-primary hover:underline"
          >
            Realizar Nova Consulta
          </button>
        </div>
      )}
    </div>
  );
};
