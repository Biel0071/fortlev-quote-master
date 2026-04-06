import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, RefreshCw, MousePointerClick, Eye, ShoppingCart, Globe, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

type PathClick = { path: string; count: number };
type TypeCount = { type: string; count: number };

export default function AdminClickMap() {
  const [loading, setLoading] = useState(true);
  const [pathClicks, setPathClicks] = useState<PathClick[]>([]);
  const [typeBreakdown, setTypeBreakdown] = useState<TypeCount[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<{ name: string; value: number }[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      // Get events with paths
      const { data: events } = await cloud
        .from("tracking_events")
        .select("type, metadata")
        .limit(1000);

      const { data: vEvents } = await cloud
        .from("visitor_events")
        .select("type, path, metadata")
        .limit(1000);

      // Path clicks
      const pathMap: Record<string, number> = {};
      (vEvents ?? []).forEach((e: any) => {
        if (e.path) {
          const clean = e.path.split("?")[0].split("#")[0] || "/";
          pathMap[clean] = (pathMap[clean] || 0) + 1;
        }
      });
      const sortedPaths = Object.entries(pathMap)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);
      setPathClicks(sortedPaths);

      // Event type breakdown
      const typeMap: Record<string, number> = {};
      [...(events ?? []), ...(vEvents ?? [])].forEach((e: any) => {
        if (e.type && e.type !== "page_view" && e.type !== "scroll") {
          typeMap[e.type] = (typeMap[e.type] || 0) + 1;
        }
      });
      const sortedTypes = Object.entries(typeMap)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);
      setTypeBreakdown(sortedTypes);

      // Device breakdown from sessions
      const { data: sessions } = await cloud
        .from("tracking_sessions")
        .select("device")
        .limit(500);

      let mobile = 0, desktop = 0;
      (sessions ?? []).forEach((s: any) => {
        if (/mobile|android|iphone|ipad/i.test(s.device || "")) mobile++;
        else desktop++;
      });
      setDeviceBreakdown([
        { name: "Mobile", value: mobile },
        { name: "Desktop", value: desktop },
      ].filter(d => d.value > 0));

    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const eventLabelMap: Record<string, string> = {
    product_view: "Ver Produto", add_to_cart: "Add Carrinho", add_cart: "Add Carrinho",
    checkout_start: "Checkout", request_quote: "Orçamento", banner_click: "Banner",
    chat_open: "Chat", chat_message_sent: "Msg Chat", whatsapp_click: "WhatsApp",
    category_click: "Categoria", chat_close: "Fechar Chat",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" /> Mapa de Cliques
          </h1>
          <p className="text-sm text-muted-foreground">Atividade por página, tipo de evento e dispositivo</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-center py-16">Carregando dados...</div>
      ) : (
        <>
          {/* Top pages heatmap */}
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MousePointerClick className="h-4 w-4 text-primary" /> Páginas Mais Acessadas</CardTitle></CardHeader>
            <CardContent>
              {pathClicks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados de navegação</p>
              ) : (
                <div className="space-y-2">
                  {pathClicks.map((p, i) => {
                    const maxC = pathClicks[0]?.count || 1;
                    const pct = (p.count / maxC) * 100;
                    const heat = pct >= 80 ? "bg-red-500" : pct >= 50 ? "bg-amber-500" : pct >= 25 ? "bg-blue-500" : "bg-muted-foreground";
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${heat} flex-shrink-0`} />
                        <span className="text-sm font-mono truncate flex-1 min-w-0">{p.path}</span>
                        <Badge variant="secondary" className="font-mono text-xs">{p.count}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Event type chart */}
            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Tipos de Interação</CardTitle></CardHeader>
              <CardContent>
                {typeBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem interações</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={typeBreakdown.slice(0, 8).map(t => ({ name: eventLabelMap[t.type] || t.type, valor: t.count }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={100} />
                      <Tooltip />
                      <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Device breakdown */}
            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Dispositivos</CardTitle></CardHeader>
              <CardContent>
                {deviceBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={deviceBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                        {deviceBreakdown.map((_, i) => (
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

          {/* Interaction summary */}
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-base">Resumo de Interações</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {typeBreakdown.slice(0, 8).map((t) => (
                  <div key={t.type} className="rounded-xl border p-3 text-center">
                    <div className="text-2xl font-bold">{t.count}</div>
                    <div className="text-xs text-muted-foreground mt-1">{eventLabelMap[t.type] || t.type}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
