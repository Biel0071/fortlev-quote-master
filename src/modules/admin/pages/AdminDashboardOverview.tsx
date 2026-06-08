import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity, CheckCircle2, Clock, CreditCard, DollarSign, Eye, Flame,
  Monitor, MousePointerClick, Receipt, RefreshCw, ShoppingCart, Smartphone,
  Snowflake, Target, ThermometerSun, TrendingUp, Users, XCircle,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#8b5cf6"];

export default function AdminDashboardOverview() {
  const { activeStoreId } = useStore();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalSessions: 0, totalEvents: 0, hotLeads: 0,
    productViews: 0, addToCart: 0, checkoutStart: 0, conversions: 0,
    mobile: 0, desktop: 0,
  });
  const [dailyEvents, setDailyEvents] = useState<{ date: string; count: number }[]>([]);
  const [funnelData, setFunnelData] = useState<{ stage: string; value: number }[]>([]);

  const loadTracking = async () => {
    if (!activeStoreId) return;
    setLoading(true);
    try {
      // Sessions
      const { data: sessions } = await cloud.from("tracking_sessions")
        .select("id, score, temperature, device")
        .eq("store_id", activeStoreId)
        .limit(1000);
      const allSessions = sessions ?? [];

      // Events
      const { data: events } = await cloud.from("tracking_events")
        .select("type, created_at")
        .eq("store_id", activeStoreId)
        .limit(1000);
      const { data: vEvents } = await cloud.from("visitor_events")
        .select("type, created_at")
        .eq("store_id", activeStoreId)
        .limit(1000);
      const allEvents = [...(events ?? []), ...(vEvents ?? [])];

      // Count types
      const counts: Record<string, number> = {};
      allEvents.forEach((e: any) => { counts[e.type] = (counts[e.type] || 0) + 1; });

      // Device breakdown
      let mobile = 0, desktop = 0;
      allSessions.forEach((s: any) => {
        if (/mobile|android|iphone|ipad/i.test(s.device || "")) mobile++;
        else desktop++;
      });

      const hotLeads = allSessions.filter((s: any) => s.temperature === "quente" || (s.score ?? 0) >= 70).length;
      const addToCart = (counts["add_to_cart"] || 0) + (counts["add_cart"] || 0);
      const conversions = (counts["request_quote"] || 0) + (counts["purchase"] || 0);

      setMetrics({
        totalSessions: allSessions.length,
        totalEvents: allEvents.length,
        hotLeads,
        productViews: counts["product_view"] || 0,
        addToCart,
        checkoutStart: counts["checkout_start"] || 0,
        conversions,
        mobile, desktop,
      });

      // Funnel
      setFunnelData([
        { stage: "Visualizações", value: counts["page_view"] || 0 },
        { stage: "Produtos", value: counts["product_view"] || 0 },
        { stage: "Carrinho", value: addToCart },
        { stage: "Checkout", value: counts["checkout_start"] || 0 },
        { stage: "Conversão", value: conversions },
      ]);

      // Daily events (7 days)
      const now = new Date();
      const dayMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        dayMap[d.toISOString().split("T")[0]] = 0;
      }
      allEvents.forEach((e: any) => {
        const day = e.created_at?.split("T")[0];
        if (day && dayMap[day] !== undefined) dayMap[day]++;
      });
      setDailyEvents(Object.entries(dayMap).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        count,
      })));
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { loadTracking(); }, [activeStoreId]);

  // Orders
  const { data: orders } = useQuery({
    queryKey: ["dash-orders-stats", activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) return [];
      const { data } = await supabase.from("store_orders")
        .select("id, status, total, payment_method, created_at")
        .eq("store_id", activeStoreId)
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
    enabled: !!activeStoreId,
  });

  const paidOrders = orders?.filter((o) => o.status === "pago") || [];
  const pendingOrders = orders?.filter((o) => o.status === "aguardando" || o.status === "pendente") || [];
  const totalRevenue = paidOrders.reduce((s, o) => s + (o.total || 0), 0);

  const kpis = [
    { label: "Sessões", value: metrics.totalSessions, icon: Users, color: "" },
    { label: "Eventos", value: metrics.totalEvents, icon: Activity, color: "" },
    { label: "Leads Quentes", value: metrics.hotLeads, icon: Flame, color: "text-red-600" },
    { label: "Produtos Vistos", value: metrics.productViews, icon: Eye, color: "text-blue-600" },
    { label: "Add Carrinho", value: metrics.addToCart, icon: ShoppingCart, color: "text-green-600" },
    { label: "Checkout", value: metrics.checkoutStart, icon: CreditCard, color: "text-amber-600" },
    { label: "Conversões", value: metrics.conversions, icon: Target, color: "text-primary" },
    { label: "Receita", value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-green-700" },
  ];

  const deviceChart = [
    { name: "Mobile", value: metrics.mobile },
    { name: "Desktop", value: metrics.desktop },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Visão Geral em Tempo Real</h2>
        <Button variant="outline" size="sm" onClick={loadTracking} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground truncate">{kpi.label}</div>
                  <div className={`text-xl font-bold tracking-tight ${kpi.color}`}>{loading ? "—" : kpi.value}</div>
                </div>
                <div className="rounded-xl bg-muted p-2"><kpi.icon className="h-4 w-4" /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Events chart */}
        <Card className="rounded-2xl xl:col-span-2">
          <CardHeader><CardTitle className="text-sm">Eventos (últimos 7 dias)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyEvents}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" name="Eventos" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Device pie */}
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-sm">Mobile vs Desktop</CardTitle></CardHeader>
          <CardContent>
            {deviceChart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={deviceChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {deviceChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mini funnel + orders */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Mini Funil de Conversão</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-sm">Pedidos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Pagos", value: paidOrders.length, icon: CheckCircle2, color: "text-green-600" },
              { label: "Pendentes", value: pendingOrders.length, icon: Clock, color: "text-amber-600" },
              { label: "Receita Total", value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-primary" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between rounded-xl border p-3">
                <span className="flex items-center gap-2 text-sm"><item.icon className={`h-4 w-4 ${item.color}`} />{item.label}</span>
                <span className={`font-bold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
