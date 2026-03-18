import { Activity, CheckCircle2, CreditCard, DollarSign, Receipt, ShoppingCart, TrendingUp, Users, UserRoundCheck, XCircle, Clock } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { useAdminDashboardInsights } from "@/hooks/useAdminDashboardInsights";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted-foreground))"];

function statusBadge(status: string) {
  if (status === "quente") return "default" as const;
  if (status === "morno") return "secondary" as const;
  return "outline" as const;
}

export default function AdminDashboardOverview() {
  const { data, loading } = useAdminDashboardInsights();

  // Order stats
  const { data: orders } = useQuery({
    queryKey: ["dash-orders-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("store_orders").select("id, status, total, payment_method, created_at").order("created_at", { ascending: false }).limit(500);
      return data || [];
    },
  });

  // Gateway status
  const { data: activeGw } = useQuery({
    queryKey: ["dash-active-gw"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_gateways").select("name, status").eq("status", "active").limit(1).single();
      return data;
    },
  });

  const { data: lastWebhook } = useQuery({
    queryKey: ["dash-last-webhook"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_webhooks").select("created_at").order("created_at", { ascending: false }).limit(1).single();
      return data;
    },
  });

  const paidOrders = orders?.filter((o) => o.status === "pago") || [];
  const pendingOrders = orders?.filter((o) => o.status === "aguardando" || o.status === "pendente") || [];
  const cancelledOrders = orders?.filter((o) => o.status === "cancelado" || o.status === "recusado") || [];

  // Payment method breakdown
  const methodCounts = (orders || []).reduce<Record<string, number>>((acc, o) => {
    const m = o.payment_method || "Não informado";
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});
  const methodChart = Object.entries(methodCounts).map(([name, value]) => ({ name: name.toUpperCase(), value }));

  // Status chart
  const statusChart = [
    { name: "Pago", value: paidOrders.length },
    { name: "Pendente", value: pendingOrders.length },
    { name: "Cancelado", value: cancelledOrders.length },
  ].filter((s) => s.value > 0);

  const cards = [
    { label: "Vendas Hoje", value: formatCurrency(data.summary.salesToday), icon: DollarSign },
    { label: "Vendas Semana", value: formatCurrency(data.summary.salesWeek), icon: TrendingUp },
    { label: "Ticket Médio", value: formatCurrency(data.summary.ticketAverage), icon: Receipt },
    { label: "Usuários Online", value: String(data.summary.onlineUsers), icon: Users },
    { label: "Pedidos Pagos", value: String(paidOrders.length), icon: CheckCircle2 },
    { label: "Pedidos Pendentes", value: String(pendingOrders.length), icon: Clock },
    { label: "Pedidos Recusados", value: String(cancelledOrders.length), icon: XCircle },
    { label: "Carrinhos Abandonados", value: String(data.summary.abandonedCarts ?? data.lists.abandonedCarts.length), icon: ShoppingCart },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="rounded-2xl border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground truncate">{card.label}</div>
                  <div className="text-xl font-bold tracking-tight">{loading ? "—" : card.value}</div>
                </div>
                <div className="rounded-xl bg-muted p-2">
                  <card.icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System status */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Status do sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            <span className="flex items-center gap-1.5">
              {activeGw ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
              API {activeGw?.name || "—"}: {activeGw ? "Online" : "Offline"}
            </span>
            <span className="flex items-center gap-1.5">
              {lastWebhook ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
              Webhook: {lastWebhook ? "Funcionando" : "Sem eventos"}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Gateway: {activeGw ? "Ativo" : "Inativo"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Sales line chart */}
        <Card className="rounded-2xl xl:col-span-2">
          <CardHeader><CardTitle className="text-sm">Vendas (30 dias)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.charts.salesDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), "Vendas"]} />
                <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.22)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment methods pie */}
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-sm">Por método de pagamento</CardTitle></CardHeader>
          <CardContent>
            {methodChart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={methodChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {methodChart.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status + funnel */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-sm">Status de pedidos</CardTitle></CardHeader>
          <CardContent>
            {statusChart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem pedidos</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={statusChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-sm">Funil de conversão</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.charts.conversionFunnel}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Live sessions + top products */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-sm">Sessões ativas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.lists.onlineNow.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sem sessões ativas.</div>
            ) : (
              data.lists.onlineNow.slice(0, 6).map((u) => (
                <div key={u.session_id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">Sessão {u.session_id.slice(0, 12)}…</div>
                    <div className="text-xs text-muted-foreground">{u.device} • {u.source}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusBadge(u.status)}>{u.status}</Badge>
                    <span className="text-sm font-semibold">{u.score}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-sm">Produtos mais vistos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.lists.topViewedProducts.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sem dados de visualização.</div>
            ) : (
              data.lists.topViewedProducts.slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div className="font-medium text-sm truncate pr-3">{p.name}</div>
                  <Badge variant="secondary">{p.views} views</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
