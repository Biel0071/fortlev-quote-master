import { useEffect, useState, useRef } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, MousePointerClick, Smartphone, RefreshCw, TrendingUp, BarChart3, Upload, Link2, CheckCircle2, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

export default function AdminAppMetrics() {
  const [loading, setLoading] = useState(true);
  const [bannerClicks, setBannerClicks] = useState(0);
  const [appDownloadClicks, setAppDownloadClicks] = useState(0);
  const [appSessions, setAppSessions] = useState(0);
  const [dailyClicks, setDailyClicks] = useState<{ date: string; clicks: number }[]>([]);

  // APK upload state
  const [uploading, setUploading] = useState(false);
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
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

      const { data: sessions } = await cloud
        .from("visitor_sessions")
        .select("id, referrer, utm_source")
        .limit(500);

      const fromApp = (sessions ?? []).filter((s: any) =>
        s.utm_source === "app" || (s.referrer || "").includes("app")
      );
      setAppSessions(fromApp.length);

      // Also check tracking_events for app_download_click
      const { data: trackingAppClicks } = await cloud
        .from("tracking_events")
        .select("id, metadata, created_at")
        .eq("type", "banner_click")
        .limit(500);

      const extraAppClicks = (trackingAppClicks ?? []).filter((e: any) =>
        e.metadata?.click_type === "app_download_click"
      );
      setAppDownloadClicks(prev => prev + extraAppClicks.length);

      // Daily clicks chart (last 7 days)
      const now = new Date();
      const dailyMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        dailyMap[d.toISOString().split("T")[0]] = 0;
      }
      [...(bannerEvents ?? []), ...(trackingAppClicks ?? [])].forEach((e: any) => {
        const day = e.created_at?.split("T")[0];
        if (day && dailyMap[day] !== undefined) dailyMap[day]++;
      });
      setDailyClicks(Object.entries(dailyMap).map(([date, clicks]) => ({
        date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        clicks,
      })));

      // Load current APK URL
      const { data: configRow } = await cloud
        .from("app_config")
        .select("value")
        .eq("key", "app_download_url")
        .maybeSingle();
      if (configRow?.value) setApkUrl(configRow.value);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleApkUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error("Selecione um arquivo .apk"); return; }
    if (!file.name.endsWith(".apk")) { toast.error("Apenas arquivos .apk são aceitos"); return; }

    setUploading(true);
    try {
      const fileName = `app-${Date.now()}.apk`;
      const { error: uploadError } = await cloud.storage
        .from("apps")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = cloud.storage.from("apps").getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      // Save to app_config
      const { error: upsertError } = await cloud
        .from("app_config")
        .upsert({ key: "app_download_url", value: publicUrl, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (upsertError) throw upsertError;

      setApkUrl(publicUrl);
      toast.success("APK enviado com sucesso!");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      toast.error(`Erro ao enviar APK: ${err.message}`);
    }
    setUploading(false);
  };

  const conversionRate = bannerClicks > 0 ? ((appDownloadClicks / bannerClicks) * 100).toFixed(1) : "0";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-primary" /> Métricas do Aplicativo
          </h1>
          <p className="text-sm text-muted-foreground">Downloads, cliques e sessões do app</p>
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

      {/* APK Upload */}
      <Card className="rounded-2xl border-2 border-dashed border-primary/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" /> Upload de APK
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              ref={fileRef}
              type="file"
              accept=".apk"
              className="flex-1"
              disabled={uploading}
            />
            <Button onClick={handleApkUpload} disabled={uploading} className="gap-1.5">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Enviando..." : "Enviar APK"}
            </Button>
          </div>

          {apkUrl && (
            <div className="rounded-xl bg-muted/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                <CheckCircle2 className="h-4 w-4" /> APK disponível
              </div>
              <div className="flex items-center gap-2">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <a href={apkUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary underline truncate">
                  {apkUrl}
                </a>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Este link é usado automaticamente no banner de download do app.
              </p>
            </div>
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
