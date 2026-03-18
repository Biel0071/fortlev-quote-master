import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, TrendingUp, TrendingDown, Target, BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";

export default function AdminAiReportsPage() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const { data: products } = useQuery({
    queryKey: ["ai-reports-products"],
    queryFn: async () => {
      const { data } = await supabase.from("store_products").select("id, name, price, category, stock, active").eq("active", true).order("price", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["ai-reports-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("store_orders").select("id, total, status, payment_method, created_at, customer_name").order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
  });

  const { data: recentReports } = useQuery({
    queryKey: ["ai-reports-history"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_project_reports").select("*").order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  const totalRevenue = orders?.reduce((s, o) => s + (o.status === "pago" ? Number(o.total) : 0), 0) || 0;
  const paidOrders = orders?.filter((o) => o.status === "pago") || [];
  const ticketMedio = paidOrders.length ? totalRevenue / paidOrders.length : 0;
  const convRate = orders?.length ? (paidOrders.length / orders.length * 100) : 0;

  const topProducts = [...(products || [])].sort((a, b) => (b.price || 0) - (a.price || 0)).slice(0, 5);
  const lowStock = (products || []).filter((p) => (p.stock || 0) < 5 && (p.stock || 0) >= 0);

  const generateAiAnalysis = async () => {
    setLoading(true);
    try {
      const context = {
        total_products: products?.length || 0,
        total_orders: orders?.length || 0,
        total_revenue: totalRevenue,
        ticket_medio: ticketMedio,
        conversion_rate: convRate,
        top_products: topProducts.map((p) => p.name).slice(0, 5),
        low_stock: lowStock.map((p) => `${p.name} (${p.stock})`).slice(0, 5),
        payment_methods: Object.entries(
          (orders || []).reduce((acc: any, o) => {
            const m = o.payment_method || "não informado";
            acc[m] = (acc[m] || 0) + 1;
            return acc;
          }, {})
        ),
      };

      const suggestions = [
        totalRevenue < 1000 ? "Receita baixa — considere campanhas de marketing e promoções em produtos de alta margem." : "Receita saudável — mantenha o ritmo e explore upselling.",
        lowStock.length > 3 ? `${lowStock.length} produtos com estoque crítico. Reposição urgente recomendada.` : "Estoque em níveis adequados.",
        convRate < 20 ? "Taxa de conversão abaixo de 20%. Revise o checkout e ofereça descontos PIX." : "Boa taxa de conversão!",
        ticketMedio < 100 ? "Ticket médio baixo. Considere combos e kits de produtos." : "Ticket médio saudável.",
      ];

      setAnalysis({ context, suggestions, generated_at: new Date().toISOString() });

      await supabase.from("ai_project_reports").insert({
        report_json: { context, suggestions },
        selected_scope: "vendas",
        mode: "auto",
      });

      toast.success("Análise gerada!");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Relatórios IA
          </h1>
          <p className="text-sm text-muted-foreground">Análise inteligente do desempenho da loja.</p>
        </div>
        <Button onClick={generateAiAnalysis} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Gerar análise
        </Button>
      </div>

      {/* Quick metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Receita total</p>
            <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Ticket médio</p>
            <p className="text-xl font-bold">{formatCurrency(ticketMedio)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Conversão</p>
            <p className="text-xl font-bold">{convRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Produtos ativos</p>
            <p className="text-xl font-bold">{products?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top products */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Produtos de maior valor</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-sm font-medium truncate pr-3">{p.name}</span>
                <Badge variant="secondary">{formatCurrency(p.price)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Low stock */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4" /> Estoque crítico</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum produto com estoque crítico.</p>
            ) : (
              lowStock.slice(0, 8).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium truncate pr-3">{p.name}</span>
                  <Badge variant="destructive">{p.stock} un</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Analysis results */}
      {analysis && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Sugestões da IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.suggestions.map((s: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{s}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent reports */}
      {recentReports && recentReports.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Relatórios anteriores</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentReports.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <span>{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                <Badge variant="outline">{r.selected_scope}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
