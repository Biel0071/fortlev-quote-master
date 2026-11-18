import { useCallback, useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  Flame,
  Monitor,
  RefreshCw,
  ShoppingCart,
  Smartphone,
  Target,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ProjectTestingGuide } from "../components/ProjectTestingGuide";

function describeDashboardReadError(error: unknown) {
  const readError = error as { code?: string; message?: string };
  if (
    readError?.code === "42501" ||
    /permission|row-level security|not authorized/i.test(readError?.message ?? "")
  ) {
    return "Sem permissão para consultar os dados desta loja.";
  }
  return "Não foi possível consultar os dados reais. Verifique a conexão com o banco.";
}

type PeriodKey = "3h" | "12h" | "today" | "yesterday" | "24h" | "7d" | "30d" | "all";

const PERIOD_OPTIONS: Array<{ key: PeriodKey; label: string }> = [
  { key: "3h", label: "3h" },
  { key: "12h", label: "12h" },
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "24h", label: "1 dia" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "all", label: "Tudo" },
];

function computePeriodBounds(period: PeriodKey): { startMs: number | null; endMs: number | null } {
  const now = new Date();
  const nowMs = now.getTime();
  if (period === "all") return { startMs: null, endMs: null };
  if (period === "3h") return { startMs: nowMs - 3 * 3600_000, endMs: nowMs };
  if (period === "12h") return { startMs: nowMs - 12 * 3600_000, endMs: nowMs };
  if (period === "24h") return { startMs: nowMs - 24 * 3600_000, endMs: nowMs };
  if (period === "7d") return { startMs: nowMs - 7 * 86400_000, endMs: nowMs };
  if (period === "30d") return { startMs: nowMs - 30 * 86400_000, endMs: nowMs };

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (period === "today") {
    return { startMs: startOfToday, endMs: nowMs };
  }
  // yesterday
  return { startMs: startOfToday - 86400_000, endMs: startOfToday - 1 };
}

function isWithinPeriod(iso: string | null | undefined, startMs: number | null, endMs: number | null): boolean {
  if (startMs === null && endMs === null) return true;
  if (!iso) return false;
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return false;
  if (startMs !== null && ts < startMs) return false;
  if (endMs !== null && ts > endMs) return false;
  return true;
}

type TrackingSession = {
  id: string;
  score: number | null;
  temperature: string | null;
  device: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
};

type TrackingEvent = {
  type: string;
  created_at: string | null;
  metadata: Record<string, unknown> | null;
};

type ContactLeadRow = {
  created_at: string | null;
};

export default function AdminDashboardOverview() {
  const { activeStoreId, storesError, reloadStores } = useStore();
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [loading, setLoading] = useState(true);
  const [rawSessions, setRawSessions] = useState<TrackingSession[]>([]);
  const [rawEvents, setRawEvents] = useState<TrackingEvent[]>([]);
  const [rawContacts, setRawContacts] = useState<ContactLeadRow[]>([]);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const loadTracking = useCallback(async () => {
    if (!activeStoreId) {
      setTrackingError(
        storesError ??
          "A loja selecionada ainda não foi identificada. Selecione uma loja cadastrada para consultar os dados."
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    setTrackingError(null);
    try {
      const sessionsQuery = cloud
        .from("tracking_sessions")
        .select("id, score, temperature, device, first_seen_at, last_seen_at")
        .or(`store_id.eq.${activeStoreId},store_id.is.null`)
        .order("last_seen_at", { ascending: false })
        .limit(2000)
        .abortSignal(AbortSignal.timeout(12_000));

      const eventsQuery = cloud
        .from("tracking_events")
        .select("type, created_at, metadata")
        .or(`store_id.eq.${activeStoreId},store_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(3000)
        .abortSignal(AbortSignal.timeout(12_000));

      const leadsQuery = cloud
        .from("store_customer_contacts")
        .select("created_at")
        .or(`store_id.eq.${activeStoreId},store_id.is.null`)
        .limit(2000)
        .abortSignal(AbortSignal.timeout(12_000));

      const [sessionsResult, eventsResult, leadsResult] = await Promise.all([
        sessionsQuery,
        eventsQuery,
        leadsQuery,
      ]);
      const queryError = sessionsResult.error ?? eventsResult.error;
      if (queryError) throw queryError;

      setRawSessions((sessionsResult.data ?? []) as TrackingSession[]);
      setRawEvents((eventsResult.data ?? []) as TrackingEvent[]);
      setRawContacts((leadsResult.data ?? []) as ContactLeadRow[]);
    } catch (e) {
      console.error("Error loading dashboard metrics:", e);
      setRawSessions([]);
      setRawEvents([]);
      setRawContacts([]);
      setTrackingError(
        e instanceof Error && e.name === "TimeoutError"
          ? "O banco demorou para responder. Confira a conexão e tente novamente."
          : describeDashboardReadError(e)
      );
    }
    setLoading(false);
  }, [activeStoreId, storesError]);

  useEffect(() => {
    void loadTracking();
  }, [loadTracking]);

  const { data: orders, error: ordersError, isLoading: ordersLoading } = useQuery({
    queryKey: ["dash-orders-stats", activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) return [];
      const { data, error } = await supabase
        .from("store_orders")
        .select("id, status, total, payment_method, created_at")
        .eq("store_id", activeStoreId)
        .order("created_at", { ascending: false })
        .limit(500)
        .abortSignal(AbortSignal.timeout(12_000));
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeStoreId,
  });

  const bounds = useMemo(() => computePeriodBounds(period), [period]);

  const filtered = useMemo(() => {
    const sessions = rawSessions.filter((s) =>
      isWithinPeriod(s.last_seen_at || s.first_seen_at, bounds.startMs, bounds.endMs)
    );
    const events = rawEvents.filter((e) =>
      isWithinPeriod(e.created_at, bounds.startMs, bounds.endMs)
    );
    const contacts = rawContacts.filter((c) =>
      isWithinPeriod(c.created_at, bounds.startMs, bounds.endMs)
    );
    const periodOrders = (orders || []).filter((o) =>
      isWithinPeriod(o.created_at, bounds.startMs, bounds.endMs)
    );

    const counts: Record<string, number> = {};
    events.forEach((e) => {
      counts[e.type] = (counts[e.type] || 0) + 1;
    });

    let mobile = 0;
    let desktop = 0;
    sessions.forEach((s) => {
      if (/mobile|android|iphone|ipad/i.test(s.device || "")) mobile++;
      else desktop++;
    });

    const hotSessions = sessions.filter(
      (s) => s.temperature === "quente" || (s.score ?? 0) >= 70
    ).length;
    const totalLeads = hotSessions + contacts.length;
    const addToCart = (counts["add_to_cart"] || 0) + (counts["add_cart"] || 0);
    const conversions = (counts["request_quote"] || 0) + (counts["purchase"] || 0);

    // Build timeline buckets dynamically based on selected period
    const isHourly = period === "3h" || period === "12h" || period === "today" || period === "yesterday" || period === "24h";
    const bucketMap = new Map<string, number>();

    if (isHourly) {
      const hoursCount = period === "3h" ? 4 : period === "12h" ? 12 : 24;
      const refEnd = bounds.endMs ?? Date.now();
      for (let i = hoursCount - 1; i >= 0; i--) {
        const d = new Date(refEnd - i * 3600_000);
        const label = `${String(d.getHours()).padStart(2, "0")}h`;
        if (!bucketMap.has(label)) bucketMap.set(label, 0);
      }
      events.forEach((e) => {
        if (!e.created_at) return;
        const d = new Date(e.created_at);
        const label = `${String(d.getHours()).padStart(2, "0")}h`;
        bucketMap.set(label, (bucketMap.get(label) ?? 0) + 1);
      });
    } else if (period === "7d" || period === "30d") {
      const days = period === "7d" ? 7 : 15;
      const stepDays = period === "7d" ? 1 : 2;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * stepDays * 86400_000);
        const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        bucketMap.set(label, 0);
      }
      events.forEach((e) => {
        if (!e.created_at) return;
        const d = new Date(e.created_at);
        const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        bucketMap.set(label, (bucketMap.get(label) ?? 0) + 1);
      });
    } else {
      // "all": group by month/year
      const monthCounts = new Map<string, number>();
      events.forEach((e) => {
        if (!e.created_at) return;
        const d = new Date(e.created_at);
        const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
        monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
      });
      const entries = [...monthCounts.entries()].slice(-10);
      entries.forEach(([k, v]) => bucketMap.set(k, v));
    }

    const chartSeries = [...bucketMap.entries()].map(([date, count]) => ({ date, count }));

    const funnel = [
      { stage: "Visitas na Página", value: counts["page_view"] || 0, color: "bg-sky-500" },
      { stage: "Produtos Vistos", value: counts["product_view"] || 0, color: "bg-blue-600" },
      { stage: "Adições ao Carrinho", value: addToCart, color: "bg-emerald-500" },
      { stage: "Início de Checkout", value: counts["checkout_start"] || 0, color: "bg-amber-500" },
      { stage: "Conversões & Cotações", value: conversions, color: "bg-primary" },
    ];

    return {
      totalSessions: sessions.length,
      totalEvents: events.length,
      hotLeads: totalLeads,
      productViews: counts["product_view"] || 0,
      addToCart,
      checkoutStart: counts["checkout_start"] || 0,
      conversions,
      mobile,
      desktop,
      chartSeries,
      funnel,
      periodOrders,
    };
  }, [rawSessions, rawEvents, rawContacts, orders, bounds, period]);

  const paidOrders = filtered.periodOrders.filter((o) =>
    /pago|paid|aprovad|entregue|conclu[ií]d|confirmad|enviad|transito|finalizad/i.test(o.status || "")
  );
  const pendingOrders = filtered.periodOrders.filter((o) =>
    /aguardando|pendente|separando|novo/i.test(o.status || "")
  );
  const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const ordersUnavailable =
    !activeStoreId || ordersLoading || Boolean(ordersError) || orders === undefined;

  const kpis = [
    { label: "Sessões", value: trackingError ? "—" : String(filtered.totalSessions), icon: Users, color: "text-foreground" },
    { label: "Eventos", value: trackingError ? "—" : String(filtered.totalEvents), icon: Activity, color: "text-foreground" },
    { label: "Leads", value: trackingError ? "—" : String(filtered.hotLeads), icon: Flame, color: "text-red-600" },
    { label: "Produtos Vistos", value: trackingError ? "—" : String(filtered.productViews), icon: Eye, color: "text-blue-600" },
    { label: "Add Carrinho", value: trackingError ? "—" : String(filtered.addToCart), icon: ShoppingCart, color: "text-emerald-600" },
    { label: "Checkout", value: trackingError ? "—" : String(filtered.checkoutStart), icon: CreditCard, color: "text-amber-600" },
    { label: "Conversões", value: trackingError ? "—" : String(filtered.conversions), icon: Target, color: "text-primary" },
    { label: "Receita", value: ordersUnavailable ? "—" : formatCurrency(totalRevenue), icon: DollarSign, color: "text-emerald-700" },
  ];

  const totalDevices = Math.max(1, filtered.mobile + filtered.desktop);
  const mobilePct = Math.round((filtered.mobile / totalDevices) * 100);
  const desktopPct = filtered.mobile + filtered.desktop === 0 ? 0 : 100 - mobilePct;
  const maxFunnelVal = Math.max(1, ...filtered.funnel.map((f) => f.value));

  return (
    <div className="space-y-5 min-w-0 max-w-full overflow-x-hidden">
      {/* Top Bar + Period Filter */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-800">
            Métricas Reais da Operação
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              reloadStores();
              void loadTracking();
            }}
            disabled={loading}
            className="gap-1.5 h-8 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        <div
          className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card p-1.5"
          role="group"
          aria-label="Filtro de período"
          data-testid="dashboard-period-filter"
        >
          {PERIOD_OPTIONS.map((opt) => {
            const active = period === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPeriod(opt.key)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {(trackingError || ordersError || !activeStoreId) && (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-xs sm:text-sm text-amber-900"
        >
          {trackingError ||
            (ordersError
              ? describeDashboardReadError(ordersError)
              : "A loja não foi identificada; os dados reais ainda não podem ser consultados.")}
        </div>
      )}

      {/* KPI Cards — Vertical Unclipped Layout */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 min-w-0">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="rounded-2xl min-w-0 overflow-hidden">
            <CardContent className="p-3 sm:p-4 space-y-1.5 min-w-0">
              <div className="flex items-center justify-between gap-1.5 min-w-0">
                <span className="text-[11px] font-semibold text-muted-foreground truncate">
                  {kpi.label}
                </span>
                <div className="rounded-lg bg-muted p-1.5 shrink-0">
                  <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
              <div
                className={`text-base sm:text-xl font-black tracking-tight tabular-nums break-words leading-tight ${kpi.color}`}
              >
                {loading ? "—" : kpi.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row — Strictly Constrained Width */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-w-0">
        <Card className="rounded-2xl lg:col-span-2 min-w-0 overflow-hidden">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-bold">
              Volume de Eventos ({PERIOD_OPTIONS.find((p) => p.key === period)?.label})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-4 pb-4 min-w-0 overflow-hidden">
            {loading ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Carregando eventos…</p>
            ) : trackingError ? (
              <p className="py-8 text-center text-xs text-muted-foreground">{trackingError}</p>
            ) : filtered.chartSeries.length === 0 || filtered.totalEvents === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Nenhum evento registrado neste recorte de tempo. Selecione outro período acima.
              </p>
            ) : (
              <div className="w-full h-[200px] min-w-0 overflow-hidden">
                <ResponsiveContainer width="99%" height="100%">
                  <AreaChart data={filtered.chartSeries} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      width={36}
                    />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.18)"
                      strokeWidth={2}
                      name="Eventos"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clean Mobile vs Desktop Distribution Card */}
        <Card className="rounded-2xl min-w-0 overflow-hidden">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-bold">Mobile vs Desktop</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-4">
            {filtered.mobile + filtered.desktop === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Sem sessões neste período.
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Monitor className="h-3.5 w-3.5 text-primary" /> Desktop / Web
                    </span>
                    <span className="tabular-nums font-bold">
                      {filtered.desktop} ({desktopPct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${desktopPct}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-emerald-600" /> Mobile
                    </span>
                    <span className="tabular-nums font-bold">
                      {filtered.mobile} ({mobilePct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${mobilePct}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Funnel + Orders Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
        <Card className="rounded-2xl min-w-0 overflow-hidden">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary shrink-0" /> Funil de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2.5">
            {filtered.funnel.map((stage) => {
              const pct = Math.max(4, Math.round((stage.value / maxFunnelVal) * 100));
              return (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground truncate pr-2">
                      {stage.stage}
                    </span>
                    <span className="font-bold tabular-nums shrink-0">{stage.value}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${stage.color}`}
                      style={{ width: stage.value === 0 ? "0%" : `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-2xl min-w-0 overflow-hidden">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-bold">Pedidos & Receita</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2.5">
            {[
              {
                label: "Pagos / Confirmados",
                value: String(paidOrders.length),
                icon: CheckCircle2,
                color: "text-emerald-600",
              },
              {
                label: "Pendentes / Em Aberto",
                value: String(pendingOrders.length),
                icon: Clock,
                color: "text-amber-600",
              },
              {
                label: "Receita Confirmada",
                value: formatCurrency(totalRevenue),
                icon: DollarSign,
                color: "text-primary",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-2 rounded-xl border border-border p-3 min-w-0"
              >
                <span className="flex items-center gap-2 text-xs sm:text-sm font-medium min-w-0">
                  <item.icon className={`h-4 w-4 shrink-0 ${item.color}`} />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className={`text-xs sm:text-sm font-black tabular-nums shrink-0 ${item.color}`}>
                  {ordersUnavailable ? "—" : item.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <ProjectTestingGuide />
    </div>
  );
}
