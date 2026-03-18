import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, BarChart3, CreditCard } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted-foreground))", "hsl(142 76% 36%)"];

export default function AdminPaymentsOverview() {
  const { data: transactions } = useQuery({
    queryKey: ["payment-transactions-overview"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayTx = transactions?.filter((t) => t.created_at.startsWith(today)) || [];
  const approvedToday = todayTx.filter((t) => t.status === "approved");
  const volumeToday = approvedToday.reduce((s, t) => s + Number(t.amount), 0);
  const approvalRate = todayTx.length > 0 ? ((approvedToday.length / todayTx.length) * 100).toFixed(1) : "0";
  const avgTicket = approvedToday.length > 0 ? volumeToday / approvedToday.length : 0;

  // Volume por dia (últimos 7 dias)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const volumeByDay = last7.map((day) => ({
    day: day.slice(5),
    total: (transactions || [])
      .filter((t) => t.created_at.startsWith(day) && t.status === "approved")
      .reduce((s, t) => s + Number(t.amount), 0),
  }));

  // Volume por método
  const methodMap: Record<string, number> = {};
  (transactions || []).filter((t) => t.status === "approved").forEach((t) => {
    const m = t.method || "outro";
    methodMap[m] = (methodMap[m] || 0) + Number(t.amount);
  });
  const byMethod = Object.entries(methodMap).map(([name, value]) => ({ name, value }));

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Pagamentos — Visão Geral</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={CreditCard} label="Transações hoje" value={String(todayTx.length)} />
        <MetricCard icon={DollarSign} label="Volume hoje" value={fmt(volumeToday)} />
        <MetricCard icon={TrendingUp} label="Taxa aprovação" value={`${approvalRate}%`} />
        <MetricCard icon={BarChart3} label="Ticket médio" value={fmt(avgTicket)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Volume por dia (7d)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeByDay}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Volume por método</CardTitle></CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            {byMethod.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                    {byMethod.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
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
