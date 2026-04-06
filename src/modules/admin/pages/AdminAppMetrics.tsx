import { useEffect, useRef, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download,
  MousePointerClick,
  Smartphone,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Upload,
  Loader2,
  Save,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

const APK_URL_STORAGE_KEY = "app_download_url";
const APK_META_STORAGE_KEY = "app_apk_meta";
const MAX_APK_SIZE_BYTES = 100 * 1024 * 1024;

const fmtMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2);
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

interface ApkMeta {
  originalName: string;
  displayName: string;
  appName: string;
  size: number;
  uploadedAt: string;
}

function readLocalValue(key: string) {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalValue(key: string, value: string) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    // ignore fallback storage errors
  }
}

function parseLocalMeta(value: string | null) {
  if (!value) return null;

  try {
    return JSON.parse(value) as ApkMeta;
  } catch (error) {
    console.error("Erro ao parsear meta local", error);
    return null;
  }
}

export default function AdminAppMetrics() {
  const [loading, setLoading] = useState(true);
  const [bannerClicks, setBannerClicks] = useState(0);
  const [appDownloadClicks, setAppDownloadClicks] = useState(0);
  const [appSessions, setAppSessions] = useState(0);
  const [dailyClicks, setDailyClicks] = useState<{ date: string; clicks: number }[]>([]);

  const [uploading, setUploading] = useState(false);
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const [apkMeta, setApkMeta] = useState<ApkMeta | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [appName, setAppName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [persistToSystem, setPersistToSystem] = useState(true);

  const saveConfig = async (key: string, value: string) => {
    const { error } = await cloud
      .from("app_config")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

    if (error) {
      console.error("[APP_CONFIG_ERROR]", key, error);
      return false;
    }

    console.log("[APP_CONFIG_OK]", key);
    return true;
  };

  const load = async () => {
    setLoading(true);

    try {
      const [
        { data: bannerEvents },
        { data: trackingAppClicks },
        { data: sessions },
        { data: configRow, error: configError },
        { data: metaRow, error: metaError },
      ] = await Promise.all([
        cloud.from("visitor_events").select("id, metadata, created_at").eq("type", "banner_click").limit(1000),
        cloud.from("tracking_events").select("id, metadata, created_at").eq("type", "banner_click").limit(500),
        cloud.from("visitor_sessions").select("id, referrer, utm_source").limit(500),
        cloud.from("app_config").select("value").eq("key", "app_download_url").maybeSingle(),
        cloud.from("app_config").select("value").eq("key", "app_apk_meta").maybeSingle(),
      ]);

      const allBanner = bannerEvents ?? [];
      const appBanner = allBanner.filter(
        (event: any) =>
          event.metadata?.click_type === "app_download_click" || event.metadata?.banner_type === "app",
      );

      setBannerClicks(allBanner.length);

      const extraAppClicks = (trackingAppClicks ?? []).filter(
        (event: any) => event.metadata?.click_type === "app_download_click",
      );
      setAppDownloadClicks(appBanner.length + extraAppClicks.length);

      const fromApp = (sessions ?? []).filter(
        (session: any) => session.utm_source === "app" || (session.referrer || "").includes("app"),
      );
      setAppSessions(fromApp.length);

      const now = new Date();
      const dailyMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i -= 1) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        dailyMap[date.toISOString().split("T")[0]] = 0;
      }

      [...allBanner, ...(trackingAppClicks ?? [])].forEach((event: any) => {
        const day = event.created_at?.split("T")[0];
        if (day && dailyMap[day] !== undefined) {
          dailyMap[day] += 1;
        }
      });

      setDailyClicks(
        Object.entries(dailyMap).map(([date, clicks]) => ({
          date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          clicks,
        })),
      );

      const localUrl = readLocalValue(APK_URL_STORAGE_KEY);
      const localMeta = readLocalValue(APK_META_STORAGE_KEY);

      console.log("LOAD URL", configRow);
      console.log("LOAD META", metaRow);

      if (configError) {
        console.error("[APP_CONFIG_LOAD_ERROR]", configError);
      }

      if (metaError) {
        console.error("[APP_CONFIG_META_LOAD_ERROR]", metaError);
      }

      setApkUrl(configRow?.value ?? localUrl ?? null);

      if (metaRow?.value) {
        try {
          setApkMeta(JSON.parse(metaRow.value) as ApkMeta);
        } catch (error) {
          console.error("Erro ao parsear meta", error);
          setApkMeta(parseLocalMeta(localMeta));
        }
      } else {
        setApkMeta(parseLocalMeta(localMeta));
      }
    } catch (error) {
      console.error("[AppMetrics] load error:", error);
      const localUrl = readLocalValue(APK_URL_STORAGE_KEY);
      const localMeta = readLocalValue(APK_META_STORAGE_KEY);
      setApkUrl(localUrl);
      setApkMeta(parseLocalMeta(localMeta));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleFileSelect = () => {
    const file = fileRef.current?.files?.[0];
    if (file) {
      setDisplayName(file.name);
      if (!appName) setAppName(file.name.replace(/\.apk$/i, ""));
    }
  };

  const handleApkUpload = async () => {
    const file = fileRef.current?.files?.[0];

    if (!file) {
      toast.error("Selecione um arquivo .apk");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".apk")) {
      toast.error("Selecione um arquivo .apk");
      return;
    }

    if (file.size > MAX_APK_SIZE_BYTES) {
      toast.error("Tamanho máximo: 100 MB");
      return;
    }

    setUploading(true);

    try {
      const finalDisplayName = displayName || file.name;
      const finalAppName = appName || file.name.replace(/\.apk$/i, "");

      let publicUrl = "";

      if (persistToSystem) {
        const fileName = `app-${Date.now()}.apk`;
        const { error: uploadError } = await cloud.storage.from("apps").upload(fileName, file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = cloud.storage.from("apps").getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
      } else {
        publicUrl = URL.createObjectURL(file);
      }

      const meta: ApkMeta = {
        originalName: file.name,
        displayName: finalDisplayName,
        appName: finalAppName,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };

      console.log("UPLOAD OK", publicUrl);
      console.log("META", meta);

      if (persistToSystem) {
        const savedUrl = await saveConfig("app_download_url", publicUrl);
        const savedMeta = await saveConfig("app_apk_meta", JSON.stringify(meta));
        if (!savedUrl || !savedMeta) {
          console.warn("Salvando localStorage como fallback");
        }
      }

      writeLocalValue(APK_URL_STORAGE_KEY, publicUrl);
      writeLocalValue(APK_META_STORAGE_KEY, JSON.stringify(meta));

      setApkUrl(publicUrl);
      setApkMeta(meta);
      toast.success(persistToSystem ? "APK enviado e salvo no sistema" : "APK carregado (somente local)");

      if (fileRef.current) fileRef.current.value = "";
    } catch (error: any) {
      console.error("[AppMetrics] upload error:", error);
      toast.error(`Erro ao enviar APK: ${error?.message ?? "Falha desconhecida"}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveToSystem = async () => {
    if (!apkUrl || !apkMeta) {
      toast.error("Nenhum APK carregado para salvar");
      return;
    }
    setUploading(true);
    try {
      const savedUrl = await saveConfig("app_download_url", apkUrl);
      const savedMeta = await saveConfig("app_apk_meta", JSON.stringify(apkMeta));
      if (savedUrl && savedMeta) {
        toast.success("Configurações salvas no sistema");
      } else {
        toast.error("Falha ao salvar no sistema (verifique permissões)");
      }
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e?.message ?? ""));
    } finally {
      setUploading(false);
    }
  };

  const conversionRate = bannerClicks > 0 ? ((appDownloadClicks / bannerClicks) * 100).toFixed(1) : "0";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Smartphone className="h-6 w-6 text-primary" /> Métricas do Aplicativo
          </h1>
          <p className="text-sm text-muted-foreground">Downloads, cliques e sessões do app</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            icon: <MousePointerClick className="h-4 w-4" />,
            label: "Cliques no Banner",
            value: bannerClicks,
            color: "text-foreground",
          },
          {
            icon: <Download className="h-4 w-4" />,
            label: "Downloads (cliques)",
            value: appDownloadClicks,
            color: "text-primary",
          },
          {
            icon: <TrendingUp className="h-4 w-4" />,
            label: "Taxa Conversão",
            value: `${conversionRate}%`,
            color: "text-primary",
          },
          {
            icon: <Smartphone className="h-4 w-4" />,
            label: "Sessões do App",
            value: appSessions,
            color: "text-foreground",
          },
        ].map((card, index) => (
          <Card key={index} className="rounded-2xl">
            <CardContent className="px-4 pt-4 pb-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                {card.icon}
                {card.label}
              </div>
              <div className={`text-3xl font-bold ${card.color}`}>{loading ? "—" : card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" /> Cliques no Banner (7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyClicks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem dados</p>
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

      <Card className="rounded-2xl border-2 border-dashed border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4 text-primary" /> Upload de APK
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="appName" className="text-xs font-medium">Nome do App</Label>
              <Input id="appName" placeholder="Ex: Fortlev App" value={appName} onChange={(e) => setAppName(e.target.value)} disabled={uploading} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="text-xs font-medium">Nome do arquivo para download</Label>
              <Input id="displayName" placeholder="Ex: fortlev-app.apk" value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={uploading} />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Input ref={fileRef} type="file" accept=".apk" className="flex-1" disabled={uploading} onChange={handleFileSelect} />
            <Button onClick={handleApkUpload} disabled={uploading} className="gap-1.5">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Enviando..." : "Enviar APK"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="persist" checked={persistToSystem} onCheckedChange={(v) => setPersistToSystem(Boolean(v))} disabled={uploading} />
            <Label htmlFor="persist" className="text-sm cursor-pointer">Salvar APK no sistema (storage + banco)</Label>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 font-semibold text-foreground">📦 APK instalado</h3>

            {apkUrl || apkMeta ? (
              <>
                {apkMeta && (
                  <div className="space-y-2 text-sm text-foreground">
                    {apkMeta.appName && <div><b>App:</b> {apkMeta.appName}</div>}
                    <div><b>Arquivo original:</b> {apkMeta.originalName}</div>
                    <div><b>Nome download:</b> {apkMeta.displayName}</div>
                    <div><b>Tamanho:</b> {fmtMB(apkMeta.size)} MB</div>
                    <div><b>Enviado:</b> {fmtDate(apkMeta.uploadedAt)}</div>
                  </div>
                )}

                {apkUrl && (
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <a href={`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/download-app`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                        Baixar APK (link profissional)
                      </a>
                      <Button variant="outline" size="sm" onClick={handleSaveToSystem} disabled={uploading} className="gap-1.5">
                        <Save className="h-3.5 w-3.5" /> Salvar no sistema
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Link direto: <code className="bg-muted px-1 rounded text-[10px]">{`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/download-app`}</code>
                    </p>
                  </div>
                )}
                )}

                <p className="mt-2 text-xs text-muted-foreground">
                  Este link é usado automaticamente no banner do app.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum APK enviado ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Sobre as métricas</CardTitle>
        </CardHeader>
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
