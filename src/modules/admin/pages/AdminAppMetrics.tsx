import { useEffect, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, MousePointerClick, Smartphone, RefreshCw, TrendingUp, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminAppMetrics() {
  const [loading, setLoading] = useState(true);
  const [bannerClicks, setBannerClicks] = useState(0);
  const [appDownloadClicks, setAppDownloadClicks] = useState(0);
  const [appSessions, setAppSessions] = useState(0);
  const [dailyClicks, setDailyClicks] = useState<{ date: string; clicks: number }[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      // Count banner_click events (app banner)
      const { data: bannerEvents } = await cloud
        .from("visitor_events")
        .select("id, metadata, created_at")
        .eq("type", "banner_click")
        .limit(1000);

      const appBannerClicks = (bannerEvents ?? []).filter((e: any) =>
        e.metadata?.click_type === "app_download_click" || e.metadata?.banner_type === "app"
      );

      setBannerClicks(bannerEvents?.length ?? 0);
      setAppDownloadClicks(appBannerClicks.length);

      // Count sessions from app (check referrer or source)
      const { data: sessions } = await cloud
        .from("visitor_sessions")
        .select("id, referrer, utm_source")
        .limit(500);

      const fromApp = (sessions ?? []).filter((s: any) =>
        s.utm_source === "app" || (s.referrer || "").includes("app")
      );
      setAppSessions(fromApp.length);

      // Daily clicks chart (last 7 days)
      const now = new Date();
      const dailyMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        dailyMap[key] = 0;
      }

      (bannerEvents ?? []).forEach((e: any) => {
        const day = e.created_at?.split("T")[0];
        if (day && dailyMap[day] !== undefined) dailyMap[day]++;
      });

      setDailyClicks(Object.entries(dailyMap).map(([date, clicks]) => ({
        date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        clicks,
      })));

    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const conversionRate = bannerClicks > 0 ? ((appDownloadClicks / bannerClicks) * 100).toFixed(1) : "0";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-primary" /> Métricas do Aplicativo
          </h1>
          <p className="text-sm text-muted-foreground">Downloads, cliques no banner e sessões originadas pelo app</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <MousePointerClick className="h-4 w-4" />, label: "Cliques no Banner", value: bannerClicks, color: "" },
          { icon: <Download className="h-4 w-4" />, label: "Downloads (cliques)", value: appDownloadClicks, color: "text-green-600" },
          { icon: <TrendingUp className="h-4 w-4" />, label: "Taxa Conversão", value: `${conversionRate}%`, color: "text-primary" },
          { icon: <Smartphone className="h-4 w-4" />, label: "Sessões do App", value: appSessions, color: "text-blue-600" },
        ].map((card, i) => (
          <Card key={i} className="rounded-2xl">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">{card.icon} {card.label}</div>
              <div className={`text-3xl font-bold ${card.color}`}>{loading ? "—" : card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily chart */}
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Cliques no Banner (7 dias)</CardTitle></CardHeader>
        <CardContent>
          {dailyClicks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyClicks}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Bar dataKey="clicks" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Sobre as métricas</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Cliques no Banner:</strong> Total de vezes que o banner de download do app foi clicado.</p>
          <p>• <strong>Downloads:</strong> Cliques específicos no link de download do APK.</p>
          <p>• <strong>Taxa Conversão:</strong> Proporção de cliques no banner que resultaram em download.</p>
          <p>• <strong>Sessões do App:</strong> Visitantes que chegaram ao site via aplicativo (utm_source=app).</p>
        </CardContent>
      </Card>
    </div>
  );
}
