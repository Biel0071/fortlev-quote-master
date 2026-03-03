import { Activity, DollarSign, Receipt, TrendingUp, Users, UserRoundCheck, ShoppingCart } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart, BarChart, Bar } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { useAdminDashboardInsights } from "@/hooks/useAdminDashboardInsights";

function statusBadge(status: string) {
  if (status === "quente") return "default" as const;
  if (status === "morno") return "secondary" as const;
  return "outline" as const;
}

export default function AdminDashboardOverview() {
  const { data, loading } = useAdminDashboardInsights();

  const cards = [
    { label: "Vendas Hoje", value: formatCurrency(data.summary.salesToday), icon: DollarSign },
    { label: "Vendas Semana", value: formatCurrency(data.summary.salesWeek), icon: TrendingUp },
    { label: "Ticket Médio", value: formatCurrency(data.summary.ticketAverage), icon: Receipt },
    { label: "Usuários Online", value: String(data.summary.onlineUsers), icon: Users },
    { label: "Clientes Quentes", value: String(data.summary.hotUsers), icon: UserRoundCheck },
    { label: "Orçamentos Pendentes", value: String(data.summary.pendingQuotations), icon: Activity },
    { label: "Carrinhos Abandonados", value: String(data.summary.abandonedCarts ?? data.lists.abandonedCarts.length), icon: ShoppingCart },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="rounded-2xl border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-muted-foreground">{card.label}</div>
                  <div className="text-2xl font-bold tracking-tight">{loading ? "—" : card.value}</div>
                </div>
                <div className="rounded-xl bg-muted p-2.5">
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Linha de vendas</CardTitle>
          </CardHeader>
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

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Funil de conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.charts.conversionFunnel}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Heatmap de intenção</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.charts.intentHeatmap.length ? data.charts.intentHeatmap : data.charts.intentDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey={data.charts.intentHeatmap.length ? "hour" : "date"} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip formatter={(value: number) => [String(value), "Score"]} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Intenção de compra (diária)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.charts.intentDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip formatter={(value: number) => [String(value), "Score"]} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Painel em tempo real · sessões ativas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.lists.onlineNow.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sem sessões ativas no momento.</div>
            ) : (
              data.lists.onlineNow.slice(0, 8).map((u) => (
                <div key={u.session_id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">Sessão {u.session_id.slice(0, 12)}…</div>
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
          <CardHeader>
            <CardTitle>Produtos mais vistos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.lists.topViewedProducts.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sem dados de visualização.</div>
            ) : (
              data.lists.topViewedProducts.slice(0, 8).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div className="font-medium truncate pr-3">{p.name}</div>
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
