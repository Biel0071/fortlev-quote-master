import { useEffect, useMemo, useRef, useState } from "react";
import { cloud } from "@/lib/cloud";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Link2,
  KeyRound,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Globe,
  Monitor,
  Pencil,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

interface ShortLinkClick {
  id: string;
  ip_hash: string | null;
  user_agent: string | null;
  device: string | null;
  browser: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  created_at: string;
  utm_source: string | null;
  utm_campaign: string | null;
  referrer: string | null;
}

interface ShortLinkRow {
  id: string;
  slug: string;
  original_url: string;
  clicks: number;
  created_at: string;
  active: boolean;
  link_type?: "apk" | "product" | "page";
  metadata?: Record<string, unknown>;
  click_details?: ShortLinkClick[];
}

interface ShortenerTokenRow {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  active: boolean;
}

interface ApkRow {
  id: string;
  download_token: string;
  file_name: string;
  version: string | null;
  active?: boolean;
  created_at?: string;
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
  const { activeStoreId } = useStore();
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

  const [shortLinks, setShortLinks] = useState<ShortLinkRow[]>([]);
  const [shortenerTokens, setShortenerTokens] = useState<ShortenerTokenRow[]>([]);
  const [shortUrlInput, setShortUrlInput] = useState("");
  const [shortSlugInput, setShortSlugInput] = useState("");
  const [tokenName, setTokenName] = useState("Integração Script");
  const [creatingShortLink, setCreatingShortLink] = useState(false);
  const [creatingToken, setCreatingToken] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [apkToken, setApkToken] = useState<string | null>(null);
  const [apks, setApks] = useState<ApkRow[]>([]);
  const [apkSlugInput, setApkSlugInput] = useState("");
  const [creatingApkLink, setCreatingApkLink] = useState(false);
  const [expandedLinks, setExpandedLinks] = useState<Record<string, boolean>>({});
  const [editingLink, setEditingLink] = useState<ShortLinkRow | null>(null);
  const [editUrlInput, setEditUrlInput] = useState("");
  const [editSlugInput, setEditSlugInput] = useState("");
  const [editApkToken, setEditApkToken] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);

  const professionalDownloadUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return apkToken ? `${window.location.origin}/api/apk/${encodeURIComponent(apkToken)}` : "";
  }, [apkToken]);

  const shortBaseUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    
    // Prioriza sempre o domínio customizado do cliente se estivermos em produção ou se o usuário quiser gerar links profissionais
    const isLocal = window.location.hostname === "localhost" || window.location.hostname.includes("127.0.0.1");
    
    if (!isLocal) {
      return `https://materialdecontrucao.online/r`;
    }
    
    return `${window.location.origin}/r`;
  }, []);

  const hashToken = async (raw: string) => {
    const data = new TextEncoder().encode(raw);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const sanitizeSlug = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);

  const randomSlug = () => Math.random().toString(36).slice(2, 9);

  const randomToken = () => `st_${crypto.randomUUID().replace(/-/g, "")}${Date.now().toString(36)}`;

  const scriptSnippet = useMemo(() => {
    if (!generatedToken || !activeStoreId || !shortBaseUrl) return "";
    return `const SHORTENER_TOKEN = "${generatedToken}";\n\nasync function createShortLink(originalUrl) {\n  const res = await fetch("${window.location.origin}/functions/v1/short-link-create", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({\n      token: SHORTENER_TOKEN,\n      store_id: "${activeStoreId}",\n      original_url: originalUrl\n    })\n  });\n\n  const data = await res.json();\n  if (!res.ok) throw new Error(data?.error || "Falha ao gerar link curto");\n  return data.short_url;\n}`;
  }, [generatedToken, activeStoreId, shortBaseUrl]);

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
        shortLinksRes,
        tokenRes,
        apkRes,
      ] = await Promise.all([
        cloud.from("visitor_events").select("id, metadata, created_at").eq("type", "banner_click").limit(1000),
        cloud.from("tracking_events").select("id, metadata, created_at").eq("type", "banner_click").limit(500),
        cloud.from("visitor_sessions").select("id, referrer, utm_source").limit(500),
        cloud.from("app_config").select("value").eq("key", "app_download_url").maybeSingle(),
        cloud.from("app_config").select("value").eq("key", "app_apk_meta").maybeSingle(),
        activeStoreId
          ? cloud
              .from("app_short_links")
              .select("id, slug, original_url, clicks, created_at, active, link_type, metadata")
              .eq("store_id", activeStoreId)
              .order("created_at", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [] }),
        activeStoreId
          ? cloud
              .from("app_shortener_tokens")
              .select("id, name, token_prefix, created_at, active")
              .eq("store_id", activeStoreId)
              .order("created_at", { ascending: false })
              .limit(10)
          : Promise.resolve({ data: [] }),
        activeStoreId
          ? cloud
              .from("apks")
              .select("id, download_token, file_name, version, active, created_at")
              .eq("store_id", activeStoreId)
              .order("created_at", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [] }),
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

      setShortLinks((shortLinksRes.data as ShortLinkRow[] | null) ?? []);
      setShortenerTokens((tokenRes.data as ShortenerTokenRow[] | null) ?? []);
      const apkList = ((apkRes as { data?: ApkRow[] | null }).data ?? []) as ApkRow[];
      setApks(apkList);
      setApkToken((apkList.find((a) => a.active) ?? apkList[0])?.download_token ?? null);
    } catch (error) {
      console.error("[AppMetrics] load error:", error);
      const localUrl = readLocalValue(APK_URL_STORAGE_KEY);
      const localMeta = readLocalValue(APK_META_STORAGE_KEY);
      setApkUrl(localUrl);
      setApkMeta(parseLocalMeta(localMeta));
      setApkToken(null);
      setShortLinks([]);
      setShortenerTokens([]);
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

        if (activeStoreId) {
          const newToken = `apk_${crypto.randomUUID().replace(/-/g, "")}`;

          await cloud
            .from("apks")
            .update({ active: false })
            .eq("store_id", activeStoreId)
            .eq("active", true);

          const { error: apkInsertError } = await cloud.from("apks").insert({
            store_id: activeStoreId,
            file_path: fileName,
            file_name: finalDisplayName,
            version: null,
            active: true,
            download_token: newToken,
          });

          if (apkInsertError) throw apkInsertError;
          setApkToken(newToken);
        }
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

  const handleCreateShortLink = async () => {
    if (!activeStoreId) {
      toast.error("Selecione uma loja antes de criar links curtos");
      return;
    }

    const original = shortUrlInput.trim();
    if (!original && !professionalDownloadUrl) {
      toast.error("Informe a URL original");
      return;
    }

    const finalOriginal = original || professionalDownloadUrl;

    try {
      const parsed = new URL(finalOriginal);
      if (!(parsed.protocol === "https:" || parsed.protocol === "http:")) {
        toast.error("URL deve começar com http:// ou https://");
        return;
      }
    } catch {
      toast.error("URL inválida");
      return;
    }

    setCreatingShortLink(true);
    try {
      const slug = sanitizeSlug(shortSlugInput) || randomSlug();
      const isApkLink = !!apkToken && finalOriginal.includes(`/api/apk/${apkToken}`);
      const { data, error } = await cloud
        .from("app_short_links")
        .insert({
          store_id: activeStoreId,
          slug,
          original_url: finalOriginal,
          created_via: "admin",
          link_type: isApkLink ? "apk" : "page",
          metadata: isApkLink ? { apk_token: apkToken } : {},
          active: true,
        })
        .select("id, slug, original_url, clicks, created_at, active, link_type, metadata")
        .single();

      if (error) {
        if ((error as { code?: string }).code === "23505") {
          toast.error("Slug já existe. Tente outro valor.");
          return;
        }
        throw error;
      }

      setShortLinks((prev) => [data as ShortLinkRow, ...prev]);
      setShortUrlInput("");
      setShortSlugInput("");
      toast.success("Link curto criado com sucesso");
    } catch (error: any) {
      toast.error(`Erro ao criar link curto: ${error?.message ?? "falha desconhecida"}`);
    } finally {
      setCreatingShortLink(false);
    }
  };

  const handleGenerateToken = async () => {
    if (!activeStoreId) {
      toast.error("Selecione uma loja antes de gerar token");
      return;
    }

    setCreatingToken(true);
    try {
      const raw = randomToken();
      const tokenHash = await hashToken(raw);
      const tokenPrefix = raw.slice(0, 8);

      const { data, error } = await cloud
        .from("app_shortener_tokens")
        .insert({
          store_id: activeStoreId,
          name: tokenName.trim() || "Integração Script",
          token_hash: tokenHash,
          token_prefix: tokenPrefix,
          active: true,
        })
        .select("id, name, token_prefix, created_at, active")
        .single();

      if (error) throw error;

      setGeneratedToken(raw);
      setShortenerTokens((prev) => [data as ShortenerTokenRow, ...prev]);
      toast.success("Token gerado. Copie agora: ele não será exibido novamente.");
    } catch (error: any) {
      toast.error(`Erro ao gerar token: ${error?.message ?? "falha desconhecida"}`);
    } finally {
      setCreatingToken(false);
    }
  };

  const toggleLinkDetails = async (linkId: string) => {
    const isExpanded = !!expandedLinks[linkId];
    setExpandedLinks((prev) => ({ ...prev, [linkId]: !isExpanded }));

    if (!isExpanded) {
      try {
        const { data, error } = await cloud
          .from("app_short_link_clicks")
          .select("*")
          .eq("short_link_id", linkId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        setShortLinks((prev) =>
          prev.map((link) => (link.id === linkId ? { ...link, click_details: data as ShortLinkClick[] } : link)),
        );
      } catch (error: any) {
        console.error("Erro ao carregar detalhes de cliques:", error);
        toast.error("Erro ao carregar detalhes");
      }
    }
  };

  const handleDeleteShortLink = async (id: string) => {
    try {
      const { error } = await cloud.from("app_short_links").delete().eq("id", id);
      if (error) throw error;
      setShortLinks((prev) => prev.filter((l) => l.id !== id));
      toast.success("Link curto removido");
    } catch (error: any) {
      toast.error(`Erro ao remover link: ${error?.message ?? "falha desconhecida"}`);
    }
  };

  const handleDeleteToken = async (id: string) => {
    try {
      const { error } = await cloud.from("app_shortener_tokens").delete().eq("id", id);
      if (error) throw error;
      setShortenerTokens((prev) => prev.filter((t) => t.id !== id));
      toast.success("Token removido");
    } catch (error: any) {
      toast.error(`Erro ao remover token: ${error?.message ?? "falha desconhecida"}`);
    }
  };

  const apkDownloadUrlFor = (token: string) =>
    typeof window === "undefined" ? "" : `${window.location.origin}/api/apk/${encodeURIComponent(token)}`;

  const handleCreateApkShortLink = async () => {
    if (!activeStoreId) {
      toast.error("Selecione uma loja antes de criar links curtos");
      return;
    }
    if (!apkToken) {
      toast.error("Envie um APK antes de gerar o link de download");
      return;
    }

    setCreatingApkLink(true);
    try {
      const slug = sanitizeSlug(apkSlugInput) || randomSlug();
      const { data, error } = await cloud
        .from("app_short_links")
        .insert({
          store_id: activeStoreId,
          slug,
          original_url: apkDownloadUrlFor(apkToken),
          created_via: "admin",
          link_type: "apk",
          campaign_origin: "apk_download",
          metadata: { apk_token: apkToken },
          active: true,
        })
        .select("id, slug, original_url, clicks, created_at, active, link_type, metadata")
        .single();

      if (error) {
        if ((error as { code?: string }).code === "23505") {
          toast.error("Slug já existe. Escolha outro.");
          return;
        }
        throw error;
      }

      setShortLinks((prev) => [data as ShortLinkRow, ...prev]);
      setApkSlugInput("");
      toast.success("Link de download do APK criado");
    } catch (error: any) {
      toast.error(`Erro ao criar link: ${error?.message ?? "falha desconhecida"}`);
    } finally {
      setCreatingApkLink(false);
    }
  };

  const handleUpdateLink = async () => {
    if (!editingLink) return;

    const newUrl = editUrlInput.trim();
    const newSlug = sanitizeSlug(editSlugInput);

    if (!newUrl) {
      toast.error("Informe a nova URL");
      return;
    }
    if (!newSlug) {
      toast.error("Informe um slug válido");
      return;
    }

    try {
      new URL(newUrl);
    } catch {
      toast.error("URL inválida");
      return;
    }

    const isApk = !!editApkToken;

    setSavingEdit(true);
    try {
      const { error } = await cloud
        .from("app_short_links")
        .update({
          original_url: newUrl,
          slug: newSlug,
          link_type: isApk ? "apk" : editingLink.link_type ?? "page",
          metadata: isApk ? { apk_token: editApkToken } : editingLink.metadata ?? {},
        })
        .eq("id", editingLink.id);

      if (error) {
        if ((error as { code?: string }).code === "23505") {
          toast.error("Slug já está em uso. Escolha outro.");
          return;
        }
        throw error;
      }

      setShortLinks((prev) =>
        prev.map((l) =>
          l.id === editingLink.id
            ? {
                ...l,
                original_url: newUrl,
                slug: newSlug,
                link_type: isApk ? "apk" : l.link_type,
                metadata: isApk ? { apk_token: editApkToken } : l.metadata,
              }
            : l,
        ),
      );
      setEditingLink(null);
      setEditUrlInput("");
      setEditSlugInput("");
      setEditApkToken("");
      toast.success("Link atualizado com sucesso");
    } catch (error: any) {
      toast.error(`Erro ao atualizar link: ${error?.message ?? "falha desconhecida"}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const startEditing = (link: ShortLinkRow) => {
    setEditingLink(link);
    setEditUrlInput(link.original_url);
    setEditSlugInput(link.slug);
    const metaToken = typeof link.metadata?.apk_token === "string" ? (link.metadata.apk_token as string) : "";
    setEditApkToken(link.link_type === "apk" ? metaToken || apkToken || "" : "");
  };

  const copyText = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado`);
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

                {apkUrl && professionalDownloadUrl && (
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <a href={professionalDownloadUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                        Baixar APK (link profissional)
                      </a>
                      <Button variant="outline" size="sm" onClick={handleSaveToSystem} disabled={uploading} className="gap-1.5">
                        <Save className="h-3.5 w-3.5" /> Salvar no sistema
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        Link direto: <code className="bg-muted px-1 rounded text-[10px]">{professionalDownloadUrl}</code>
                      </p>
                      <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => void copyText(professionalDownloadUrl, "Link direto")}>
                        <Copy className="h-3 w-3" /> Copiar
                      </Button>
                    </div>
                  </div>
                )}

                {apks.length > 1 && (
                  <div className="mt-3 space-y-1.5">
                    <Label className="text-xs font-medium">APK usado no link direto</Label>
                    <select
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={apkToken ?? ""}
                      onChange={(e) => setApkToken(e.target.value || null)}
                    >
                      {apks.map((a) => (
                        <option key={a.id} value={a.download_token}>
                          {a.file_name}{a.version ? ` (v${a.version})` : ""}{a.active ? " • ativo" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {professionalDownloadUrl && (
                  <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-primary" /> Link curto do APK (domínio da loja)
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        placeholder="slug: baixar-app"
                        value={apkSlugInput}
                        onChange={(e) => setApkSlugInput(e.target.value)}
                        disabled={creatingApkLink}
                        className="flex-1"
                      />
                      <Button onClick={handleCreateApkShortLink} disabled={creatingApkLink || !activeStoreId} className="gap-1.5">
                        {creatingApkLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                        Gerar link de download
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Prévia: <code className="bg-muted px-1 rounded">{shortBaseUrl}/{sanitizeSlug(apkSlugInput) || "slug-automatico"}</code> — cada clique é rastreado (IP, cidade, dispositivo) e vira lead nos clientes da loja.
                    </p>
                  </div>
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

      <Card className="rounded-2xl border border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-primary" /> Encurtador de URL (domínio da loja)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="shortUrlInput" className="text-xs font-medium">URL original</Label>
              <Input
                id="shortUrlInput"
                placeholder="https://seusite.com/pagina/campanha"
                value={shortUrlInput}
                onChange={(e) => setShortUrlInput(e.target.value)}
                disabled={creatingShortLink}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shortSlugInput" className="text-xs font-medium">Slug customizado (opcional)</Label>
              <Input
                id="shortSlugInput"
                placeholder="promo-abril"
                value={shortSlugInput}
                onChange={(e) => setShortSlugInput(e.target.value)}
                disabled={creatingShortLink}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreateShortLink} disabled={creatingShortLink || !activeStoreId} className="w-full gap-1.5">
                {creatingShortLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                {creatingShortLink ? "Gerando..." : "Gerar link curto"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-[10px] text-muted-foreground/30 italic">Direcione o usuário para a URL da página correspondente ao link IDPReview. Utilize um encurtador de links que permita a inclusão de um slug ou a geração de um link criptografado. Ao clicar no link, o download do arquivo deve iniciar automaticamente. O arquivo deve ser enviado para o servidor de download e o processo de resolução do link deve ser concluído em um tempo máximo de 3 a 5 segundos.</p>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground">🔑 Token para script de geração</h3>
              <Button variant="outline" size="sm" onClick={handleGenerateToken} disabled={creatingToken || !activeStoreId} className="gap-1.5">
                {creatingToken ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                Gerar token
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="tokenName" className="text-xs font-medium">Nome do token</Label>
                <Input id="tokenName" value={tokenName} onChange={(e) => setTokenName(e.target.value)} disabled={creatingToken} />
              </div>
            </div>

            {generatedToken && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                <p className="text-xs text-muted-foreground">Token gerado (copie agora, exibição única):</p>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-muted px-2 py-1 text-xs">{generatedToken}</code>
                  <Button size="sm" variant="outline" onClick={() => void copyText(generatedToken, "Token")} className="gap-1">
                    <Copy className="h-3.5 w-3.5" /> Copiar token
                  </Button>
                </div>
              </div>
            )}

            {scriptSnippet && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Script de integração</Label>
                <Textarea value={scriptSnippet} readOnly className="min-h-[220px] font-mono text-xs" />
                <Button size="sm" variant="outline" onClick={() => void copyText(scriptSnippet, "Script")} className="gap-1">
                  <Copy className="h-3.5 w-3.5" /> Copiar script
                </Button>
              </div>
            )}

            {shortenerTokens.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Tokens ativos recentes</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {shortenerTokens.map((token) => (
                    <div key={token.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{token.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{token.token_prefix}••••</span>
                        <span className="text-[9px] text-muted-foreground/60">{fmtDate(token.created_at)}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => handleDeleteToken(token.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-foreground">🔗 Links curtos recentes</h3>
            {shortLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum link curto criado ainda.</p>
            ) : (
              <div className="space-y-4">
                {shortLinks.map((link) => {
                  const shortUrl = `${shortBaseUrl}/${link.slug}`;
                  const isExpanded = !!expandedLinks[link.id];
                  return (
                    <div
                      key={link.id}
                      className={`rounded-2xl border p-3 text-xs space-y-2 transition-all hover:shadow-md ${
                        link.link_type === "apk"
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-background/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${link.link_type === "apk" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {link.link_type === "apk" ? <Smartphone className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            <a href={shortUrl} target="_blank" rel="noreferrer" className="text-primary font-bold underline truncate block text-sm">
                              {shortUrl}
                            </a>
                            <p className="text-muted-foreground truncate" title={link.original_url}>Destino: {link.original_url}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => void toggleLinkDetails(link.id)} className="h-8 w-8 p-0" title="Ver métricas">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void copyText(shortUrl, "Link curto")} className="h-8 w-8 p-0" title="Copiar link">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => startEditing(link)} 
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                            title="Editar slug, link e APK"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDeleteShortLink(link.id)} 
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            title="Excluir link"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          <MousePointerClick className="h-3 w-3" /> {link.clicks} cliques
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          /{link.slug}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {fmtDate(link.created_at)}
                        </span>
                        {link.link_type === "apk" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                            <Download className="h-3 w-3" /> Download APK
                          </span>
                        )}
                      </div>


                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2 animate-in fade-in slide-in-from-top-1">
                          <p className="font-bold text-foreground mb-2 flex items-center gap-1.5">
                            <BarChart3 className="h-3.5 w-3.5 text-primary" /> Últimos cliques detalhados:
                          </p>
                          {link.click_details && link.click_details.length > 0 ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                              {link.click_details.map((click) => (
                                <div key={click.id} className="p-2 rounded bg-muted/30 border border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-foreground font-medium">
                                      <Globe className="h-3 w-3 text-muted-foreground" />
                                      {click.ip_hash?.slice(0, 8)}...
                                      <span className="text-[10px] text-muted-foreground font-normal">({fmtDate(click.created_at)})</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <MapPin className="h-3 w-3" />
                                      {click.city || "?"}, {click.region || "?"}, {click.country || "?"}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Monitor className="h-3 w-3" />
                                      {click.device} / {click.browser}
                                    </div>
                                    {(click.utm_source || click.utm_campaign) && (
                                      <div className="text-[10px] bg-primary/10 text-primary-foreground px-1.5 py-0.5 rounded-full inline-block">
                                        {click.utm_source || 'direct'} / {click.utm_campaign || 'none'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center py-4 text-muted-foreground italic">Nenhum detalhe disponível ou carregando...</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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

      <Dialog open={!!editingLink} onOpenChange={(open) => !open && setEditingLink(null)}>
        <DialogContent className="sm:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>Editar Link Curto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Slug</Label>
              <Input
                value={editSlugInput}
                onChange={(e) => setEditSlugInput(e.target.value)}
                placeholder="baixar-app"
                disabled={savingEdit}
              />
              <p className="text-[11px] text-muted-foreground">
                URL final: <code className="bg-muted px-1 rounded">{shortBaseUrl}/{sanitizeSlug(editSlugInput) || "slug"}</code>
              </p>
            </div>

            {apks.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Apontar para um APK</Label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={editApkToken}
                  onChange={(e) => {
                    const token = e.target.value;
                    setEditApkToken(token);
                    if (token) setEditUrlInput(apkDownloadUrlFor(token));
                  }}
                  disabled={savingEdit}
                >
                  <option value="">URL personalizada (não é APK)</option>
                  {apks.map((a) => (
                    <option key={a.id} value={a.download_token}>
                      {a.file_name}{a.version ? ` (v${a.version})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">URL de Destino</Label>
              <Input 
                value={editUrlInput} 
                onChange={(e) => setEditUrlInput(e.target.value)}
                placeholder="https://exemplo.com/nova-pagina"
                disabled={savingEdit}
              />
            </div>

            <div className="rounded-xl bg-muted/40 p-3 text-[11px] text-muted-foreground">
              <b className="text-foreground">{editingLink?.clicks ?? 0} cliques</b> registrados · cada acesso gera lead rastreado (IP, cidade, dispositivo) na Análise de Clientes.
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditingLink(null)} disabled={savingEdit} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleUpdateLink} disabled={savingEdit} className="rounded-xl gap-2">
              {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
