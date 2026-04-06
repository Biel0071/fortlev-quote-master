import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, ArrowDown, BarChart3, Eye, RefreshCw, ShoppingCart, Target, TrendingDown, CreditCard, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type FunnelData = {
  stage: string;
  count: number;
  icon: any;
};

export default function AdminConversionFunnel() {
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<FunnelData[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      // Get event counts from tracking_events
      const { data: events } = await cloud
        .from("tracking_events")
        .select("type")
        .limit(1000);

      const counts: Record<string, number> = {};
      (events ?? []).forEach((e: any) => {
        counts[e.type] = (counts[e.type] || 0) + 1;
      });

      // Also check visitor_events
      const { data: vEvents } = await cloud
        .from("visitor_events")
        .select("type")
        .limit(1000);

      (vEvents ?? []).forEach((e: any) => {
        counts[e.type] = (counts[e.type] || 0) + 1;
      });

      const stages: FunnelData[] = [
        { stage: "Visualizações", count: counts["page_view"] || 0, icon: Eye },
        { stage: "Produtos Vistos", count: counts["product_view"] || 0, icon: Eye },
        { stage: "Adicionou ao Carrinho", count: (counts["add_to_cart"] || 0) + (counts["add_cart"] || 0), icon: ShoppingCart },
        { stage: "Iniciou Checkout", count: counts["checkout_start"] || 0, icon: CreditCard },
        { stage: "Compra / Orçamento", count: (counts["request_quote"] || 0), icon: CheckCircle2 },
      ];

      setFunnel(stages);

      // Generate alerts
      const newAlerts: string[] = [];
      for (let i = 1; i < stages.length; i++) {
        if (stages[i - 1].count > 0) {
          const drop = ((stages[i - 1].count - stages[i].count) / stages[i - 1].count) * 100;
          if (drop >= 70) {
            newAlerts.push(`⚠️ Queda de ${Math.round(drop)}% entre "${stages[i - 1].stage}" e "${stages[i].stage}"`);
          }
        }
      }
      setAlerts(newAlerts);
    } catch {
      // silent
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const maxCount = useMemo(() => Math.max(...funnel.map((f) => f.count), 1), [funnel]);

  const chartData = funnel.map((f) => ({ name: f.stage, valor: f.count }));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" /> Funil de Conversão
          </h1>
          <p className="text-sm text-muted-foreground">Análise detalhada do funil com % de drop entre etapas</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              <span>{alert}</span>
            </div>
          ))}
        </div>
      )}

      {/* Visual Funnel */}
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Funil Visual</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-muted-foreground text-center py-12">Carregando funil...</div>
          ) : (
            funnel.map((stage, i) => {
              const pct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
              const dropPct = i > 0 && funnel[i - 1].count > 0
                ? Math.round(((funnel[i - 1].count - stage.count) / funnel[i - 1].count) * 100)
                : 0;
              const Icon = stage.icon;

              return (
                <div key={stage.stage}>
                  {i > 0 && (
                    <div className="flex items-center justify-center gap-2 py-1">
                      <ArrowDown className="h-4 w-4 text-muted-foreground" />
                      <span className={`text-xs font-medium ${dropPct >= 70 ? "text-destructive" : dropPct >= 40 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {dropPct > 0 ? `-${dropPct}%` : "0%"}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{stage.stage}</span>
                        <span className="text-sm font-bold">{stage.count.toLocaleString("pt-BR")}</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Bar Chart */}
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Gráfico do Funil</CardTitle></CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Conversion rates */}
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4 text-primary" /> Taxas de Conversão</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {funnel.slice(1).map((stage, i) => {
              const prev = funnel[i];
              const rate = prev.count > 0 ? ((stage.count / prev.count) * 100).toFixed(1) : "0";
              return (
                <div key={stage.stage} className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-sm">{prev.stage} → {stage.stage}</span>
                  <Badge variant={Number(rate) >= 30 ? "default" : Number(rate) >= 10 ? "secondary" : "outline"} className="font-mono">
                    {rate}%
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
