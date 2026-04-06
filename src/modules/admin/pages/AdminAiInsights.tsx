import { useEffect, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Lightbulb, RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Sparkles, Loader2 } from "lucide-react";

type Insight = {
  type: "alert" | "suggestion" | "info";
  title: string;
  description: string;
};

export default function AdminAiInsights() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [rawMetrics, setRawMetrics] = useState<Record<string, number>>({});

  const loadMetrics = async () => {
    setLoading(true);
    try {
      // Get tracking data
      const { data: events } = await cloud.from("tracking_events").select("type").limit(1000);
      const { data: vEvents } = await cloud.from("visitor_events").select("type").limit(1000);
      const { data: sessions } = await cloud.from("tracking_sessions").select("score, temperature, device").limit(500);
      const { data: vSessions } = await cloud.from("visitor_sessions").select("score, counters").limit(500);
      const { data: abandoned } = await cloud.from("abandoned_checkouts").select("id, recovery_status").limit(200);

      const allEvents = [...(events ?? []), ...(vEvents ?? [])];
      const counts: Record<string, number> = {};
      allEvents.forEach((e: any) => { counts[e.type] = (counts[e.type] || 0) + 1; });

      const totalSessions = (sessions?.length ?? 0) + (vSessions?.length ?? 0);
      const hotSessions = (sessions ?? []).filter((s: any) => s.temperature === "quente").length;
      const mobileCount = (sessions ?? []).filter((s: any) => /mobile|android|iphone/i.test(s.device || "")).length;
      const desktopCount = totalSessions - mobileCount;
      const abandonedOpen = (abandoned ?? []).filter((a: any) => a.recovery_status === "open").length;

      const metrics = {
        totalSessions,
        hotSessions,
        mobileCount,
        desktopCount,
        abandonedOpen,
        pageViews: counts["page_view"] || 0,
        productViews: counts["product_view"] || 0,
        addToCart: (counts["add_to_cart"] || 0) + (counts["add_cart"] || 0),
        checkoutStart: counts["checkout_start"] || 0,
        chatOpen: counts["chat_open"] || 0,
        whatsappClick: counts["whatsapp_click"] || 0,
        bannerClick: counts["banner_click"] || 0,
      };
      setRawMetrics(metrics);

      // Generate local insights based on rules
      const localInsights: Insight[] = [];

      // Checkout drop
      if (metrics.addToCart > 0 && metrics.checkoutStart > 0) {
        const dropRate = ((metrics.addToCart - metrics.checkoutStart) / metrics.addToCart) * 100;
        if (dropRate >= 70) {
          localInsights.push({
            type: "alert",
            title: `Checkout caiu ${Math.round(dropRate)}%`,
            description: `De ${metrics.addToCart} adições ao carrinho, apenas ${metrics.checkoutStart} iniciaram checkout. Considere simplificar o processo.`,
          });
        }
      }

      // Mobile vs Desktop
      if (totalSessions > 10 && mobileCount > desktopCount * 1.5) {
        localInsights.push({
          type: "info",
          title: "Maioria mobile",
          description: `${Math.round((mobileCount / totalSessions) * 100)}% dos usuários são mobile. Priorize otimização mobile.`,
        });
      }

      // Abandoned carts
      if (metrics.abandonedOpen > 5) {
        localInsights.push({
          type: "alert",
          title: `${metrics.abandonedOpen} carrinhos abandonados`,
          description: "Considere implementar recuperação por WhatsApp ou email para esses leads.",
        });
      }

      // Product view to cart ratio
      if (metrics.productViews > 20 && metrics.addToCart < metrics.productViews * 0.05) {
        localInsights.push({
          type: "suggestion",
          title: "Baixa conversão produto → carrinho",
          description: `Apenas ${((metrics.addToCart / metrics.productViews) * 100).toFixed(1)}% dos produtos vistos são adicionados ao carrinho. Revise preços ou CTAs.`,
        });
      }

      // Chat engagement
      if (metrics.chatOpen > 5) {
        localInsights.push({
          type: "info",
          title: `${metrics.chatOpen} aberturas de chat`,
          description: "O chat está sendo usado. Analise as conversas para melhorar respostas automáticas.",
        });
      }

      // WhatsApp clicks
      if (metrics.whatsappClick > 0) {
        localInsights.push({
          type: "info",
          title: `${metrics.whatsappClick} cliques no WhatsApp`,
          description: "Leads estão buscando contato direto. Garanta resposta rápida.",
        });
      }

      // Hot leads
      if (metrics.hotSessions > 0) {
        localInsights.push({
          type: "suggestion",
          title: `${metrics.hotSessions} leads quentes detectados`,
          description: "Esses visitantes mostram alta intenção de compra. Considere abordagem proativa.",
        });
      }

      // Banner engagement
      if (metrics.bannerClick > 0) {
        const bannerRate = ((metrics.bannerClick / metrics.pageViews) * 100).toFixed(2);
        localInsights.push({
          type: "info",
          title: `Banners com ${bannerRate}% CTR`,
          description: `${metrics.bannerClick} cliques em banners de ${metrics.pageViews} visualizações. ${Number(bannerRate) < 1 ? "CTR baixo — considere mudar a criatividade." : "CTR razoável."}`,
        });
      }

      if (localInsights.length === 0) {
        localInsights.push({
          type: "info",
          title: "Dados insuficientes",
          description: "Ainda não há dados suficientes para gerar insights significativos. Continue rastreando.",
        });
      }

      setInsights(localInsights);
    } catch { /* silent */ }
    setLoading(false);
  };

  const generateAiReport = async () => {
    setGenerating(true);
    try {
      const { data, error } = await cloud.functions.invoke("ai-daily-report", {
        body: { manual: true },
      });
      if (!error && data) {
        // Refresh metrics after AI report
        await loadMetrics();
      }
    } catch { /* silent */ }
    setGenerating(false);
  };

  useEffect(() => { loadMetrics(); }, []);

  const iconFor = (type: string) => {
    if (type === "alert") return <AlertTriangle className="h-5 w-5 text-destructive" />;
    if (type === "suggestion") return <Lightbulb className="h-5 w-5 text-amber-500" />;
    return <TrendingUp className="h-5 w-5 text-primary" />;
  };

  const badgeFor = (type: string) => {
    if (type === "alert") return <Badge variant="destructive" className="text-[10px]">Alerta</Badge>;
    if (type === "suggestion") return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[10px]">Sugestão</Badge>;
    return <Badge variant="secondary" className="text-[10px]">Info</Badge>;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> Insights Inteligentes
          </h1>
          <p className="text-sm text-muted-foreground">Análise automática baseada em dados de comportamento</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={generateAiReport} disabled={generating} className="gap-1.5">
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Gerar Relatório IA
          </Button>
          <Button variant="outline" size="sm" onClick={loadMetrics} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </div>

      {/* Metrics summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Sessões", value: rawMetrics.totalSessions || 0 },
          { label: "Produtos Vistos", value: rawMetrics.productViews || 0 },
          { label: "Add Carrinho", value: rawMetrics.addToCart || 0 },
          { label: "Checkouts", value: rawMetrics.checkoutStart || 0 },
        ].map((m, i) => (
          <Card key={i} className="rounded-2xl">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-xs text-muted-foreground mb-1">{m.label}</div>
              <div className="text-2xl font-bold">{loading ? "—" : m.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Insights */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Insights ({insights.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-muted-foreground text-center py-12">Analisando dados...</div>
          ) : insights.length === 0 ? (
            <div className="text-muted-foreground text-center py-12">Nenhum insight disponível.</div>
          ) : (
            insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border p-4 hover:bg-muted/30 transition-colors">
                <div className="mt-0.5 flex-shrink-0">{iconFor(insight.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm">{insight.title}</span>
                    {badgeFor(insight.type)}
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
