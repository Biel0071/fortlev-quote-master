import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, BarChart3, CreditCard, Clock, CheckCircle, XCircle, AlertTriangle, Eye, RotateCcw, ExternalLink } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(142 76% 36%)", "hsl(48 96% 53%)", "hsl(0 84% 60%)"];
const STATUS_COLORS: Record<string, string> = { approved: "default", pending: "secondary", failed: "destructive", refunded: "outline" };
const STATUS_LABELS: Record<string, string> = { approved: "Aprovado", pending: "Pendente", failed: "Falhou", refunded: "Reembolsado" };

export default function AdminPaymentsOverview() {
  const { data: transactions } = useQuery({
    queryKey: ["payment-tx-overview"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_transactions").select("*").order("created_at", { ascending: false }).limit(500);
      return data || [];
    },
  });

  const { data: gateways } = useQuery({
    queryKey: ["payment-gw-names"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_gateways").select("id, name");
      return data || [];
    },
  });

  const gwName = (id: string | null) => gateways?.find((g) => g.id === id)?.name || "—";
  const tx = transactions || [];
  const today = new Date().toISOString().slice(0, 10);
  const todayTx = tx.filter((t) => t.created_at.startsWith(today));
  const approvedToday = todayTx.filter((t) => t.status === "approved");
  const volumeToday = approvedToday.reduce((s, t) => s + Number(t.amount), 0);

  const d7 = new Date(); d7.setDate(d7.getDate() - 7);
  const d30 = new Date(); d30.setDate(d30.getDate() - 30);
  const tx7 = tx.filter((t) => new Date(t.created_at) >= d7 && t.status === "approved");
  const tx30 = tx.filter((t) => new Date(t.created_at) >= d30 && t.status === "approved");
  const vol7 = tx7.reduce((s, t) => s + Number(t.amount), 0);
  const vol30 = tx30.reduce((s, t) => s + Number(t.amount), 0);
  const avgTicket = approvedToday.length > 0 ? volumeToday / approvedToday.length : 0;
  const approvalRate = todayTx.length > 0 ? ((approvedToday.length / todayTx.length) * 100).toFixed(1) : "0";

  const paidCount = todayTx.filter((t) => t.status === "approved").length;
  const pendingCount = todayTx.filter((t) => t.status === "pending").length;
  const failedCount = todayTx.filter((t) => t.status === "failed").length;

  // Volume per day (30 days)
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
  const volumeByDay = last30.map((day) => ({
    day: day.slice(5),
    total: tx.filter((t) => t.created_at.startsWith(day) && t.status === "approved").reduce((s, t) => s + Number(t.amount), 0),
  }));

  // By method
  const methodMap: Record<string, number> = {};
  tx.filter((t) => t.status === "approved").forEach((t) => {
    const m = t.method === "pix" ? "PIX" : t.method === "card" ? "Cartão" : t.method === "boleto" ? "Boleto" : t.method || "Outro";
    methodMap[m] = (methodMap[m] || 0) + Number(t.amount);
  });
  const byMethod = Object.entries(methodMap).map(([name, value]) => ({ name, value }));

  // By status
  const statusMap: Record<string, number> = {};
  tx.forEach((t) => { statusMap[t.status] = (statusMap[t.status] || 0) + 1; });
  const byStatus = Object.entries(statusMap).map(([name, value]) => ({ name: STATUS_LABELS[name] || name, value }));

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDate = (d: string) => new Date(d).toLocaleString("pt-BR");

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Pagamentos — Visão Geral</h1>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={DollarSign} label="Receita hoje" value={fmt(volumeToday)} />
        <MetricCard icon={TrendingUp} label="Receita 7 dias" value={fmt(vol7)} />
        <MetricCard icon={BarChart3} label="Receita 30 dias" value={fmt(vol30)} />
        <MetricCard icon={CreditCard} label="Ticket médio" value={fmt(avgTicket)} />
        <MetricCard icon={CheckCircle} label="Taxa aprovação" value={`${approvalRate}%`} accent="text-green-600" />
        <MetricCard icon={CheckCircle} label="Pedidos pagos" value={String(paidCount)} accent="text-green-600" />
        <MetricCard icon={Clock} label="Pedidos pendentes" value={String(pendingCount)} accent="text-amber-500" />
        <MetricCard icon={XCircle} label="Pedidos recusados" value={String(failedCount)} accent="text-destructive" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Volume financeiro (30 dias)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeByDay}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Por método</CardTitle></CardHeader>
          <CardContent className="h-72 flex items-center justify-center">
            {byMethod.length === 0 ? <p className="text-muted-foreground text-sm">Sem dados</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                    {byMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Status das transações</CardTitle></CardHeader>
        <CardContent className="h-48">
          {byStatus.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Sem dados</p> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStatus} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent transactions table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Últimas transações</CardTitle></CardHeader>
        <CardContent>
          {tx.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhuma transação encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tx.slice(0, 20).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.id.slice(0, 8)}</TableCell>
                      <TableCell>{t.customer_id?.slice(0, 8) || "—"}</TableCell>
                      <TableCell className="font-medium">{fmt(Number(t.amount))}</TableCell>
                      <TableCell className="capitalize">{t.method}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[t.status] as any || "secondary"}>{STATUS_LABELS[t.status] || t.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{gwName(t.gateway_id)}</TableCell>
                      <TableCell className="text-xs">{fmtDate(t.created_at)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" title="Ver"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" title="Reembolsar"><RotateCcw className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" title="Pedido"><ExternalLink className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className={`h-5 w-5 ${accent || "text-primary"}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
