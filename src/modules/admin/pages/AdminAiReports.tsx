import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cloud } from "@/lib/cloud";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Brain, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, BarChart3 } from "lucide-react";

type Report = {
  id: string;
  report_date: string;
  metrics_json: any;
  analysis_text: string | null;
  alerts: string[];
  suggestions: string[];
  comparison_json: any;
  created_at: string;
};

export default function AdminAiReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("ai_system_reports").select("*").order("report_date", { ascending: false }).limit(30);
    setReports(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generateNow = async () => {
    setGenerating(true);
    try {
      const { error } = await cloud.functions.invoke("ai-daily-report");
      if (error) throw error;
      toast.success("Relatório gerado!");
      await load();
    } catch (e) {
      toast.error("Erro ao gerar relatório");
    }
    setGenerating(false);
  };

  const latest = reports[0];
  const m = latest?.metrics_json;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> AI Operational Intelligence
          </h1>
          <p className="text-muted-foreground text-sm">Relatórios diários automáticos gerados por IA</p>
        </div>
        <Button onClick={generateNow} disabled={generating}>
          <RefreshCw className={`h-4 w-4 mr-1 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Gerando..." : "Gerar Agora"}
        </Button>
      </div>

      {latest && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Visitantes Hoje</div>
                <div className="text-2xl font-bold">{m?.visitors?.unique_today || 0}</div>
                <div className={`text-xs flex items-center gap-1 ${(m?.visitors?.traffic_change_pct || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {(m?.visitors?.traffic_change_pct || 0) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {m?.visitors?.traffic_change_pct || 0}% vs ontem
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Pedidos</div>
                <div className="text-2xl font-bold">{m?.conversion?.orders_today || 0}</div>
                <div className="text-xs text-muted-foreground">Ticket: R$ {m?.conversion?.ticket_medio || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Leads Quentes</div>
                <div className="text-2xl font-bold text-red-600">{m?.leads?.hot || 0}</div>
                <div className="text-xs text-muted-foreground">{m?.leads?.warm || 0} mornos / {m?.leads?.cold || 0} frios</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Carrinhos Abandonados</div>
                <div className="text-2xl font-bold text-yellow-600">{m?.conversion?.abandoned_carts || 0}</div>
                <div className="text-xs text-muted-foreground">Vendas: R$ {(m?.conversion?.total_sales || 0).toLocaleString("pt-BR")}</div>
              </CardContent>
            </Card>
          </div>

          {/* AI Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" /> Análise do Dia — {latest.report_date}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">{latest.analysis_text}</p>

              {latest.alerts?.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold flex items-center gap-1 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" /> Alertas
                  </h4>
                  {latest.alerts.map((a, i) => (
                    <p key={i} className="text-sm text-muted-foreground ml-5">• {a}</p>
                  ))}
                </div>
              )}

              {latest.suggestions?.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold flex items-center gap-1 text-blue-600">
                    <Lightbulb className="h-4 w-4" /> Sugestões
                  </h4>
                  {latest.suggestions.map((s, i) => (
                    <p key={i} className="text-sm text-muted-foreground ml-5">• {s}</p>
                  ))}
                </div>
              )}

              {/* Top Products */}
              {m?.top_products?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Produtos mais vistos</h4>
                  <div className="space-y-1">
                    {m.top_products.map((p: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground truncate">{i + 1}. {p.name}</span>
                        <span className="font-medium">{p.views} views</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources */}
              {m?.behavior?.sources && Object.keys(m.behavior.sources).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Origem do Tráfego</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(m.behavior.sources).map(([source, count]) => (
                      <span key={source} className="bg-muted px-2 py-1 rounded text-xs">
                        {source}: {count as number}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Relatórios</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-4">Carregando...</p>
          ) : reports.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhum relatório gerado ainda. Clique em "Gerar Agora".</p>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded border">
                  <div>
                    <span className="font-medium text-sm">{r.report_date}</span>
                    <p className="text-xs text-muted-foreground line-clamp-1">{r.analysis_text?.slice(0, 80)}...</p>
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>{r.metrics_json?.visitors?.unique_today || 0} visitantes</span>
                    <span>{r.metrics_json?.conversion?.orders_today || 0} pedidos</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
