import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Truck,
  CheckCircle2,
  MapPin,
  Calendar,
  Clock,
  Box,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Navigation2,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Gauge,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { TrackingMap } from "@/components/store/tracking/TrackingMap";
import { CarrierBrandLogo, resolveOfficialCarrier } from "@/components/store/tracking/CarrierBrandLogo";
import { toast } from "@/hooks/use-toast";

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
  timeline?: Array<{
    id?: string;
    title: string;
    description?: string | null;
    location_city?: string | null;
    location_state?: string | null;
    event_at: string;
    is_simulated?: boolean;
  }>;
  items?: Array<{
    product_name?: string;
    name_snapshot?: string;
    quantity: number;
    unit_price?: number;
    line_total?: number;
  }>;
  orderTotal?: number | null;
  customerName?: string | null;
  address?: string | null;
  isSimulating?: boolean;
  compact?: boolean;
  onResetSearch?: () => void;
}

export const TrackingCustomerCard: React.FC<TrackingCustomerCardProps> = ({
  trackingCode,
  orderId,
  statusLabel,
  progress,
  estimatedDeliveryAt,
  carrier,
  timeline = [],
  items = [],
  orderTotal = 0,
  customerName,
  address,
  isSimulating = false,
  compact = false,
  onResetSearch,
}) => {
  const [copied, setCopied] = useState(false);
  const [showMap, setShowMap] = useState(progress >= 60);

  const safeProgress = Math.max(5, Math.min(100, Math.round(Number(progress) || 10)));
  const isDelivered = safeProgress >= 100 || statusLabel.toLowerCase().includes("entregue");
  const officialCarrier = resolveOfficialCarrier(carrier?.name);

  const steps = [
    { label: "Loja", pct: 10, icon: <Package className="w-3.5 h-3.5" />, active: safeProgress >= 10 },
    { label: "CD", pct: 35, icon: <MapPin className="w-3.5 h-3.5" />, active: safeProgress >= 30 },
    { label: "Trânsito", pct: 65, icon: <Truck className="w-3.5 h-3.5" />, active: safeProgress >= 50 },
    { label: "Entrega", pct: 85, icon: <Smartphone className="w-3.5 h-3.5" />, active: safeProgress >= 85 },
    { label: "Entregue", pct: 100, icon: <CheckCircle2 className="w-3.5 h-3.5" />, active: safeProgress >= 100 },
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
    const text = `Acompanhe o rastreio do pedido (${trackingCode}) - Status: ${statusLabel} (${safeProgress}% concluído): ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const computedTotal =
    Number(orderTotal) > 0
      ? Number(orderTotal)
      : items.reduce((acc, it) => acc + Number(it.line_total || (it.unit_price || 0) * (it.quantity || 1) || 0), 0);

  const externalTrackingUrl =
    carrier?.tracking_url_template && trackingCode
      ? carrier.tracking_url_template.replace(/\{\{?code\}?\}/gi, trackingCode)
      : officialCarrier?.trackingUrlTemplate
      ? officialCarrier.trackingUrlTemplate.replace(/\{\{?code\}?\}/gi, trackingCode)
      : null;

  const carrierWebsite = carrier?.website || officialCarrier?.website || null;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-2 border-primary/10 shadow-2xl rounded-3xl bg-white">
        {/* Top Hero Header */}
        <div
          className={`${
            isDelivered
              ? "bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700"
              : "bg-gradient-to-br from-[#17337A] via-[#1E3A8A] to-[#0F2356]"
          } p-6 sm:p-8 text-white relative overflow-hidden`}
        >
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-black/15 rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[10px] uppercase font-black tracking-[0.2em] text-white/75">
                  Status do seu pedido
                </p>
                {customerName && (
                  <span className="text-[10px] font-bold bg-white/15 px-2.5 py-0.5 rounded-full border border-white/10">
                    Destinatário: {customerName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
                  {statusLabel || "Em Processamento"}
                </h2>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-white/90">
                <span>Pedido #{orderId ? orderId.slice(0, 8) : "83b0dd1b"}</span>
                <span>•</span>
                <span className="font-mono font-bold bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/15">
                  Código {trackingCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 text-[11px] font-bold bg-white/15 hover:bg-white/25 transition-colors px-2.5 py-1 rounded-lg"
                  title="Copiar código de rastreio"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="inline-flex items-center gap-1 text-[11px] font-bold bg-white/15 hover:bg-white/25 transition-colors px-2.5 py-1 rounded-lg"
                  title="Compartilhar rastreio no WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Compartilhar
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 relative z-10">
              {estimatedDeliveryAt && (
                <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 shadow-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-white/80" />
                    <p className="text-[10px] uppercase font-black tracking-wider text-white/80 leading-none">
                      Previsão de Entrega
                    </p>
                  </div>
                  <p className="text-xl font-black">
                    {new Date(estimatedDeliveryAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Progresso Logístico & % de Envio */}
          <div className="mt-8 relative z-10">
            <div className="flex justify-between items-end mb-3">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/70 block">
                  Progresso Logístico (% de Envio)
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-xs font-black bg-white text-[#17337A] px-3.5 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm">
                    <Gauge className="w-3.5 h-3.5" />
                    {safeProgress}% Concluído
                  </div>
                  <span className="text-[11px] font-bold text-white/80 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                    {safeProgress < 30
                      ? "Preparação e Coleta Inicial"
                      : safeProgress < 60
                      ? "Processado no Centro de Distribuição"
                      : safeProgress < 85
                      ? "Transferência Rodoviária em Curso"
                      : safeProgress < 100
                      ? "Rota Final de Entrega"
                      : "Entrega Concluída com Sucesso"}
                  </span>
                </div>
              </div>
              <Box className="w-8 h-8 opacity-25 hidden sm:block" />
            </div>

            {/* Barra de Progresso com Indicador de Caminhão */}
            <div className="relative h-5 bg-black/25 rounded-full p-1 shadow-inner border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-sky-200 via-white to-white rounded-full transition-all duration-700 ease-out shadow-[0_0_20px_rgba(255,255,255,0.65)] relative"
                style={{ width: `${safeProgress}%` }}
              >
                <div className="absolute right-0 -top-1.5 w-6 h-6 rounded-full bg-white text-[#17337A] shadow-md flex items-center justify-center border-2 border-[#17337A]">
                  <Truck className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* 5 Etapas Sincronizadas com % */}
            <div className="flex justify-between mt-5 px-1">
              {steps.map((step, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5 flex-1 relative">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 border backdrop-blur-md ${
                      step.active
                        ? "bg-white text-[#17337A] border-white shadow-[0_0_15px_rgba(255,255,255,0.35)] scale-105"
                        : "bg-white/5 text-white/40 border-white/10"
                    }`}
                  >
                    {step.icon}
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase tracking-tight transition-all leading-none text-center ${
                      step.active ? "opacity-100 text-white" : "opacity-45 text-white/70"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span
                    className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                      step.active ? "bg-white/20 text-white" : "text-white/35"
                    }`}
                  >
                    {step.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Corpo Principal: Linha do Tempo + Transportadora Oficial + Produtos */}
        <div className={`p-6 sm:p-8 grid grid-cols-1 ${compact ? "lg:grid-cols-1" : "lg:grid-cols-5"} gap-8`}>
          {/* Coluna Esquerda: Mapa & Linha do Tempo */}
          <div className={`${compact ? "" : "lg:col-span-3"} space-y-6`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="font-black uppercase tracking-widest text-sm text-slate-800">
                  Linha do Tempo
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMap((v) => !v)}
                  className="h-7 rounded-full text-[10px] font-black uppercase tracking-wider px-3"
                >
                  <Navigation2 className="w-3 h-3 mr-1 text-primary" />
                  {showMap ? "Ocultar Mapa" : "Ver Mapa de Rota"}
                </Button>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-black uppercase border-primary/20 text-primary ${
                    isSimulating ? "animate-pulse bg-primary/5" : ""
                  }`}
                >
                  {isSimulating ? "Monitoramento Ativo" : "Tempo Real"}
                </Badge>
              </div>
            </div>

            {showMap && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <TrackingMap address={address || "Centro de Distribuição Regional"} />
                {address && (
                  <div className="p-3.5 bg-slate-900 rounded-2xl text-white flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                        Destino da Entrega
                      </p>
                      <p className="text-xs sm:text-sm font-bold">{address}</p>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px]">
                      Rota Validada
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {timeline.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center text-sm text-slate-500">
                Objeto registrado na base logística ({safeProgress}% concluído).
              </div>
            ) : (
              <div className="relative pl-5 space-y-8 before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {timeline.map((event, idx) => (
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
                          {new Date(event.event_at).toLocaleString("pt-BR")}
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

          {/* Coluna Direita: Transportadora Oficial + Produtos + Total */}
          <div className={`${compact ? "" : "lg:col-span-2"} space-y-5`}>
            {/* Card da Transportadora com Logo Oficial */}
            <div className="p-5 rounded-3xl bg-slate-50/90 border border-slate-200/80 space-y-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <CarrierBrandLogo
                    name={carrier?.name || "Jadlog"}
                    logoUrl={carrier?.logo_url}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider leading-none mb-1">
                      Transportadora Oficial
                    </p>
                    <h4 className="font-black text-lg text-slate-800 truncate">
                      {carrier?.name || officialCarrier?.name || "Jadlog"}
                    </h4>
                    <p className="text-[11px] font-semibold text-slate-500 truncate">
                      {officialCarrier?.modality || "Logística Integrada"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Métricas de % de Envio e Eficiência da Transportadora */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white p-3 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black uppercase text-slate-400 block">
                    % de Envio Atual
                  </span>
                  <span className="text-base font-black text-primary">{safeProgress}%</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black uppercase text-slate-400 block">
                    Eficiência SLA
                  </span>
                  <span className="text-base font-black text-emerald-600">
                    {officialCarrier?.slaRate ?? 98.5}%
                  </span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">
                  {isDelivered
                    ? "Encomenda entregue e assinada pelo recebedor"
                    : "Pedido em carga monitorada pela transportadora"}
                </p>
              </div>

              {(externalTrackingUrl || carrierWebsite) && (
                <div className="flex gap-2">
                  {externalTrackingUrl && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl font-bold text-xs h-9"
                    >
                      <a href={externalTrackingUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Portal {carrier?.name || officialCarrier?.name || "Oficial"}
                      </a>
                    </Button>
                  )}
                  {!externalTrackingUrl && carrierWebsite && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl font-bold text-xs h-9"
                    >
                      <a href={carrierWebsite} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Site Oficial
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Card Produtos do Pedido */}
            <div className="p-5 rounded-3xl border border-slate-200/80 bg-white space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="font-black uppercase tracking-wider text-xs text-slate-500">
                  Produtos do Pedido
                </h4>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  {items.length > 0 ? `${items.length} ${items.length === 1 ? "item" : "itens"}` : "Carga Conferida"}
                </Badge>
              </div>

              {items.length > 0 ? (
                <div className="space-y-2.5">
                  {items.map((item, i) => {
                    const itemName = item.product_name || item.name_snapshot || "Material / Produto";
                    const price = item.line_total || (item.unit_price ? item.unit_price * item.quantity : 0);
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-3 text-xs sm:text-sm p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 truncate">{itemName}</p>
                          {price > 0 && (
                            <p className="text-[11px] text-slate-500 font-semibold">
                              {formatCurrency(Number(price))}
                            </p>
                          )}
                        </div>
                        <span className="font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg shrink-0">
                          x{item.quantity}
                        </span>
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
                  <p className="text-2xl font-black">
                    {computedTotal > 0 ? formatCurrency(computedTotal) : "Frete & Carga Faturada"}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Carga segurada pela transportadora
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
