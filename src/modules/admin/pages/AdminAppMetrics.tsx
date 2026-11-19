import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Clock,
  ShieldCheck,
  Store,
  Truck,
  Palette,
  ExternalLink,
  Check,
  CheckCircle2,
  Layers,
  Sparkles,
  Lock,
  Shield,
  Pause,
  Play,
  X,
  RotateCcw,
  Activity,
} from "lucide-react";
import { encodeEncryptedLink } from "@/utils/encryptedLinks";
import { Progress } from "@/components/ui/progress";
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

const MAX_APK_SIZE_BYTES = 250 * 1024 * 1024;

const fmtMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2);
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtDuration = (sec: number) => {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.floor(Math.max(0, sec) % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

interface GenerationProgressState {
  active: boolean;
  paused: boolean;
  percent: number;
  loadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
  statusText: string;
  slug: string;
  screenName: string;
  fileName: string;
  provisionalLinkId: string | null;
}

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

export interface CreatedAppScreen {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  path: string;
  type: "google_play_store" | "studio_preset" | "studio_custom" | "store_downloads" | "direct_binary";
  description: string;
  iconName: "store" | "truck" | "palette" | "globe" | "download";
}

export const CREATED_APP_SCREENS: CreatedAppScreen[] = [
  {
    id: "material_online",
    name: "Material Online — Google Play Oficial da Loja",
    badge: "Padrão Oficial",
    badgeColor: "bg-emerald-600 text-white",
    path: "/google-play",
    type: "google_play_store",
    description: "Página 1:1 Google Play exclusiva do Material Online com selos Safe Browsing, 4.8 estrelas, avaliações reais e instalação progressiva do APK.",
    iconName: "store",
  },
  {
    id: "jadlog_clean",
    name: "Jadlog Mobile Clean — APK Studio",
    badge: "Studio Rastreio",
    badgeColor: "bg-blue-600 text-white",
    path: "/downloads/jadlog",
    type: "studio_preset",
    description: "Template mobile clean de rastreio e entrega Jadlog criado no APK Studio com barra de download sincronizada ao APK.",
    iconName: "truck",
  },
  {
    id: "studio_custom",
    name: "Tela Customizada do APK Studio",
    badge: "Studio Personalizado",
    badgeColor: "bg-purple-600 text-white",
    path: "/downloads/index.html?s=60b2c9a7aa1bf9f4",
    type: "studio_custom",
    description: "Página interativa autônoma gerada e personalizada diretamente dentro do Google Play Studio.",
    iconName: "palette",
  },
  {
    id: "store_downloads",
    name: "Página de Downloads Geral (/downloads)",
    badge: "Loja Web",
    badgeColor: "bg-amber-600 text-white",
    path: "/downloads",
    type: "store_downloads",
    description: "Página responsiva de downloads da loja com orientações para Android e contador de acessos.",
    iconName: "globe",
  },
  {
    id: "direct_binary",
    name: "Download Direto do Binário .APK (Sem tela intermediária)",
    badge: "Arquivo .apk",
    badgeColor: "bg-slate-700 text-white",
    path: "direct_apk",
    type: "direct_binary",
    description: "O visitante ao abrir o link curto recebe o download do instalador .apk instantaneamente.",
    iconName: "download",
  },
];

export default function AdminAppMetrics() {
  const navigate = useNavigate();
  const { activeStoreId } = useStore();
  const [loading, setLoading] = useState(true);
  const [bannerClicks, setBannerClicks] = useState(0);
  const [appDownloadClicks, setAppDownloadClicks] = useState(0);
  const [appSessions, setAppSessions] = useState(0);
  const [avgAppTimeSec, setAvgAppTimeSec] = useState(0);
  const [avgAppPropensity, setAvgAppPropensity] = useState(0);
  const [encryptedLinkClicksTotal, setEncryptedLinkClicksTotal] = useState(0);
  const [dailyClicks, setDailyClicks] = useState<{ date: string; clicks: number }[]>([]);
  const [metricsError, setMetricsError] = useState(false);

  const [selectedScreenId, setSelectedScreenId] = useState<string>("material_online");
  const [screenSlugMap, setScreenSlugMap] = useState<Record<string, string>>({
    material_online: "app",
    jadlog_clean: "jadlog",
    studio_custom: "baixar-app",
    store_downloads: "downloads",
    direct_binary: "apk-direto",
  });
  const [creatingScreenLinkId, setCreatingScreenLinkId] = useState<string | null>(null);
  const [savingDefaultScreen, setSavingDefaultScreen] = useState(false);

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
  const [uploadSlugInput, setUploadSlugInput] = useState("");

  const [generatingScreen, setGeneratingScreen] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgressState>({
    active: false,
    paused: false,
    percent: 0,
    loadedBytes: 0,
    totalBytes: 0,
    speedBytesPerSec: 0,
    elapsedSeconds: 0,
    estimatedRemainingSeconds: 0,
    statusText: "",
    slug: "",
    screenName: "",
    fileName: "",
    provisionalLinkId: null,
  });

  const uploadXhrRef = useRef<XMLHttpRequest | null>(null);
  const uploadTimerRef = useRef<number | null>(null);
  const uploadStartTimeRef = useRef<number>(0);
  const uploadAccumulatedTimeRef = useRef<number>(0);
  const uploadFileRef = useRef<File | null>(null);
  const isPausedRef = useRef<boolean>(false);
  const activeProvisionalIdRef = useRef<string | null>(null);

  const [lastGeneratedScreenLink, setLastGeneratedScreenLink] = useState<{
    url: string;
    slug: string;
    encryptedUrl: string;
    encryptedSlug: string;
    screenName: string;
    fileName: string;
  } | null>(null);

  const [creatingApkLink, setCreatingApkLink] = useState(false);
  const [expandedLinks, setExpandedLinks] = useState<Record<string, boolean>>({});
  const [editingLink, setEditingLink] = useState<ShortLinkRow | null>(null);
  const [editUrlInput, setEditUrlInput] = useState("");
  const [editSlugInput, setEditSlugInput] = useState("");
  const [editApkToken, setEditApkToken] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);

  const apkDownloadUrlFor = (token: string) => {
    const base = import.meta.env.VITE_SUPABASE_URL;
    if (!base || !token) return "";
    return `${base}/functions/v1/download-apk-public?token=${encodeURIComponent(token)}`;
  };

  const professionalDownloadUrl = useMemo(() => {
    return apkToken ? apkDownloadUrlFor(apkToken) : "";
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
    const functionsBase = `${import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "")}/functions/v1`;
    return `const SHORTENER_TOKEN = "${generatedToken}";\n\nasync function createShortLink(originalUrl) {\n  const res = await fetch("${functionsBase}/short-link-create", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({\n      token: SHORTENER_TOKEN,\n      store_id: "${activeStoreId}",\n      original_url: originalUrl\n    })\n  });\n\n  const data = await res.json();\n  if (!res.ok) throw new Error(data?.error || "Falha ao gerar link curto");\n  return data.short_url;\n}`;
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

  const getTargetUrlForScreen = (screenId: string, token?: string | null) => {
    const screen = CREATED_APP_SCREENS.find((s) => s.id === screenId) || CREATED_APP_SCREENS[0];
    if (screen.id === "direct_binary") {
      const activeTok = token || apkToken;
      return activeTok ? apkDownloadUrlFor(activeTok) : "";
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "https://materialdecontrucao.online";
    const activeTok = token || apkToken;
    const separator = screen.path.includes("?") ? "&" : "?";
    return activeTok
      ? `${origin}${screen.path}${separator}apk_token=${encodeURIComponent(activeTok)}`
      : `${origin}${screen.path}`;
  };

  const handleSaveDefaultScreen = async (screenId: string) => {
    setSavingDefaultScreen(true);
    try {
      setSelectedScreenId(screenId);
      try {
        localStorage.setItem("admin_selected_apk_screen", screenId);
      } catch { /* ignore storage errors */ }
      const ok = await saveConfig("app_download_landing_screen", screenId);
      if (ok) {
        toast.success(`Tela padrão definida: ${CREATED_APP_SCREENS.find((s) => s.id === screenId)?.name}`);
      } else {
        toast.error("Falha ao salvar configuração");
      }
    } finally {
      setSavingDefaultScreen(false);
    }
  };

  const handleCreateScreenShortLink = async (screenId: string) => {
    if (!activeStoreId) {
      toast.error("Selecione uma loja antes de criar links curtos");
      return;
    }
    const screen = CREATED_APP_SCREENS.find((s) => s.id === screenId) || CREATED_APP_SCREENS[0];
    const rawSlug = screenSlugMap[screenId] || screen.id;
    const slug = sanitizeSlug(rawSlug) || randomSlug();
    const targetUrl = getTargetUrlForScreen(screen.id, apkToken) || (apkToken ? apkDownloadUrlFor(apkToken) : "");

    if (!targetUrl) {
      toast.error("Envie um APK antes de gerar link para esta tela");
      return;
    }

    setCreatingScreenLinkId(screenId);
    try {
      const isBinary = screen.id === "direct_binary";
      const { data, error } = await cloud
        .from("app_short_links")
        .insert({
          store_id: activeStoreId,
          slug,
          original_url: targetUrl,
          created_via: "admin",
          link_type: isBinary ? "apk" : "page",
          campaign_origin: "apk_screen_binding",
          metadata: {
            screen_id: screen.id,
            screen_name: screen.name,
            screen_path: screen.path,
            apk_token: apkToken,
          },
          active: true,
        })
        .select("id, slug, original_url, clicks, created_at, active, link_type, metadata")
        .single();

      if (error) {
        if ((error as { code?: string }).code === "23505") {
          toast.error(`O slug /r/${slug} já está em uso. Altere o slug para continuar.`);
          return;
        }
        throw error;
      }

      setShortLinks((prev) => [data as ShortLinkRow, ...prev]);
      toast.success(`Link /r/${slug} criado vinculado a ${screen.name}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "falha desconhecida";
      toast.error(`Erro ao criar link: ${message}`);
    } finally {
      setCreatingScreenLinkId(null);
    }
  };

  const uploadFileWithProgress = (
    fileName: string,
    file: File,
    onProgress: (loaded: number, total: number) => void,
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      uploadXhrRef.current = xhr;

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && !isPausedRef.current) {
          onProgress(evt.loaded, evt.total);
        }
      };

      xhr.onload = () => {
        uploadXhrRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const { data } = cloud.storage.from("apps").getPublicUrl(fileName);
            resolve(data.publicUrl);
          } catch {
            resolve(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/apps/${encodeURIComponent(fileName)}`);
          }
        } else {
          try {
            const res = JSON.parse(xhr.responseText);
            reject(new Error(res.message || res.error || `Erro HTTP ${xhr.status}`));
          } catch {
            reject(new Error(`Erro HTTP ${xhr.status} no envio do arquivo`));
          }
        }
      };

      xhr.onerror = () => {
        uploadXhrRef.current = null;
        if (isPausedRef.current) {
          reject(new Error("PAUSED"));
        } else {
          reject(new Error("Falha na conexão durante o envio do APK"));
        }
      };

      xhr.onabort = () => {
        uploadXhrRef.current = null;
        reject(new Error("PAUSED"));
      };

      const uploadUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/apps/${encodeURIComponent(fileName)}`;
      xhr.open("POST", uploadUrl, true);
      xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
      xhr.setRequestHeader("Authorization", `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`);
      xhr.setRequestHeader("x-upsert", "true");
      xhr.setRequestHeader("Content-Type", file.type || "application/vnd.android.package-archive");
      xhr.send(file);
    });
  };

  const handlePauseGeneration = () => {
    isPausedRef.current = true;
    if (uploadXhrRef.current) {
      try {
        uploadXhrRef.current.abort();
      } catch { /* ignore */ }
      uploadXhrRef.current = null;
    }
    if (uploadTimerRef.current) {
      clearInterval(uploadTimerRef.current);
      uploadTimerRef.current = null;
    }
    uploadAccumulatedTimeRef.current += Math.floor((Date.now() - uploadStartTimeRef.current) / 1000);

    setGenerationProgress((prev) => ({
      ...prev,
      paused: true,
      statusText: "Geração da tela pausada pelo usuário",
    }));

    if (activeProvisionalIdRef.current) {
      setShortLinks((prev) =>
        prev.map((l) =>
          l.id === activeProvisionalIdRef.current
            ? { ...l, metadata: { ...l.metadata, is_paused: true } }
            : l
        )
      );
    }

    toast.info("Geração pausada. Você pode retomar ou ativar novamente a qualquer momento.");
  };

  const handleCancelGeneration = () => {
    isPausedRef.current = true;
    if (uploadXhrRef.current) {
      try {
        uploadXhrRef.current.abort();
      } catch { /* ignore */ }
      uploadXhrRef.current = null;
    }
    if (uploadTimerRef.current) {
      clearInterval(uploadTimerRef.current);
      uploadTimerRef.current = null;
    }

    if (activeProvisionalIdRef.current) {
      setShortLinks((prev) => prev.filter((l) => l.id !== activeProvisionalIdRef.current));
      activeProvisionalIdRef.current = null;
    }

    setGenerationProgress({
      active: false,
      paused: false,
      percent: 0,
      loadedBytes: 0,
      totalBytes: 0,
      speedBytesPerSec: 0,
      elapsedSeconds: 0,
      estimatedRemainingSeconds: 0,
      statusText: "",
      slug: "",
      screenName: "",
      fileName: "",
      provisionalLinkId: null,
    });
    setGeneratingScreen(false);

    toast.info("Criação da tela cancelada.");
  };

  const handleResumeGeneration = () => {
    isPausedRef.current = false;
    uploadStartTimeRef.current = Date.now();

    setGenerationProgress((prev) => ({
      ...prev,
      paused: false,
      statusText: "Retomando criação da tela...",
    }));

    if (activeProvisionalIdRef.current) {
      setShortLinks((prev) =>
        prev.map((l) =>
          l.id === activeProvisionalIdRef.current
            ? { ...l, metadata: { ...l.metadata, is_paused: false } }
            : l
        )
      );
    }

    toast.success("Retomando criação da tela...");
    void executeGeneration(uploadFileRef.current);
  };

  const handleGenerateScreenWithApk = async () => {
    const file = fileRef.current?.files?.[0] || null;
    uploadFileRef.current = file;

    // Precisa ter um arquivo selecionado ou um APK já salvo no sistema
    if (!file && !apkToken && !apkUrl) {
      toast.error("Selecione um arquivo .apk para vincular à tela");
      fileRef.current?.click();
      return;
    }

    if (file) {
      if (!file.name.toLowerCase().endsWith(".apk")) {
        toast.error("O arquivo selecionado deve ser um instalador .apk");
        return;
      }
      if (file.size > MAX_APK_SIZE_BYTES) {
        toast.error("Tamanho máximo do APK permitido: 250 MB");
        return;
      }
    }

    uploadAccumulatedTimeRef.current = 0;
    uploadStartTimeRef.current = Date.now();
    isPausedRef.current = false;

    await executeGeneration(file);
  };

  const executeGeneration = async (file: File | null) => {
    if (!activeStoreId) {
      toast.error("Nenhuma loja ativa selecionada");
      return;
    }

    setGeneratingScreen(true);

    const chosenScreen = CREATED_APP_SCREENS.find((s) => s.id === selectedScreenId) || CREATED_APP_SCREENS[0];
    const finalDisplayName = displayName || (file ? file.name : apkMeta?.displayName || "app.apk");
    const finalAppName = appName || (file ? file.name.replace(/\.apk$/i, "") : apkMeta?.appName || "App");
    const isBinary = chosenScreen.id === "direct_binary";

    let finalSlug = sanitizeSlug(uploadSlugInput);
    if (!finalSlug) {
      finalSlug = sanitizeSlug(appName) || sanitizeSlug(finalDisplayName.replace(/\.apk$/i, "")) || randomSlug();
    }

    const provisionalId = activeProvisionalIdRef.current || `generating_${Date.now()}`;
    activeProvisionalIdRef.current = provisionalId;

    const initialTotal = file ? file.size : 100;

    setGenerationProgress({
      active: true,
      paused: false,
      percent: 5,
      loadedBytes: 0,
      totalBytes: initialTotal,
      speedBytesPerSec: 0,
      elapsedSeconds: uploadAccumulatedTimeRef.current,
      estimatedRemainingSeconds: file ? Math.round(file.size / (1.5 * 1024 * 1024)) : 2,
      statusText: file ? `Iniciando upload de ${finalDisplayName} (${fmtMB(file.size)} MB)...` : "Vinculando APK à tela...",
      slug: finalSlug,
      screenName: chosenScreen.name,
      fileName: finalDisplayName,
      provisionalLinkId: provisionalId,
    });

    // Adiciona o item na lista de links com status Gerando
    setShortLinks((prev) => {
      const exists = prev.some((l) => l.id === provisionalId);
      if (exists) {
        return prev.map((l) =>
          l.id === provisionalId
            ? {
                ...l,
                slug: finalSlug,
                metadata: {
                  ...l.metadata,
                  is_generating: true,
                  is_paused: false,
                  percent: 5,
                  screen_name: chosenScreen.name,
                  file_name: finalDisplayName,
                },
              }
            : l
        );
      }
      const newItem: ShortLinkRow = {
        id: provisionalId,
        slug: finalSlug,
        original_url: `${window.location.origin}${chosenScreen.path}`,
        clicks: 0,
        created_at: new Date().toISOString(),
        active: false,
        link_type: isBinary ? "apk" : "page",
        metadata: {
          is_generating: true,
          is_paused: false,
          percent: 5,
          screen_name: chosenScreen.name,
          file_name: finalDisplayName,
          elapsed_seconds: uploadAccumulatedTimeRef.current,
          remaining_seconds: 5,
          speed_bytes_sec: 0,
        },
      };
      return [newItem, ...prev];
    });

    // Inicia timer para atualizar tempo decorrido e estimado
    if (uploadTimerRef.current) clearInterval(uploadTimerRef.current);
    uploadTimerRef.current = window.setInterval(() => {
      if (isPausedRef.current) return;
      const elapsed = Math.floor((Date.now() - uploadStartTimeRef.current) / 1000) + uploadAccumulatedTimeRef.current;
      setGenerationProgress((prev) => {
        if (!prev.active || prev.paused) return prev;
        const speed = prev.loadedBytes / Math.max(1, elapsed);
        const remaining = speed > 0 && prev.totalBytes > prev.loadedBytes
          ? Math.max(0, Math.round((prev.totalBytes - prev.loadedBytes) / speed))
          : 0;
        return {
          ...prev,
          elapsedSeconds: elapsed,
          speedBytesPerSec: speed,
          estimatedRemainingSeconds: remaining,
        };
      });

      if (activeProvisionalIdRef.current) {
        setShortLinks((prev) =>
          prev.map((l) =>
            l.id === activeProvisionalIdRef.current
              ? {
                  ...l,
                  metadata: {
                    ...l.metadata,
                    elapsed_seconds: elapsed,
                  },
                }
              : l
          )
        );
      }
    }, 500);

    try {
      let activeDownloadToken = apkToken;
      let publicUrl = apkUrl || "";

      if (file) {
        const fileName = `app-${Date.now()}.apk`;
        publicUrl = await uploadFileWithProgress(fileName, file, (loaded, total) => {
          const percent = Math.min(92, Math.max(5, Math.round((loaded / total) * 92)));
          const elapsed = Math.floor((Date.now() - uploadStartTimeRef.current) / 1000) + uploadAccumulatedTimeRef.current;
          const speed = loaded / Math.max(1, elapsed);
          const remaining = speed > 0 ? Math.max(0, Math.round((total - loaded) / speed)) : 0;

          setGenerationProgress((prev) => ({
            ...prev,
            percent,
            loadedBytes: loaded,
            totalBytes: total,
            speedBytesPerSec: speed,
            elapsedSeconds: elapsed,
            estimatedRemainingSeconds: remaining,
            statusText: `Enviando ${fmtMB(loaded)} MB de ${fmtMB(total)} MB (${percent}%)...`,
          }));

          if (activeProvisionalIdRef.current) {
            setShortLinks((prev) =>
              prev.map((l) =>
                l.id === activeProvisionalIdRef.current
                  ? {
                      ...l,
                      metadata: {
                        ...l.metadata,
                        percent,
                        is_paused: false,
                        elapsed_seconds: elapsed,
                        remaining_seconds: remaining,
                        speed_bytes_sec: speed,
                      },
                    }
                  : l
              )
            );
          }
        });

        if (isPausedRef.current) return;

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
        activeDownloadToken = newToken;
        setApkToken(newToken);

        const meta: ApkMeta = {
          originalName: file.name,
          displayName: finalDisplayName,
          appName: finalAppName,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        };

        if (persistToSystem) {
          await saveConfig("app_download_url", publicUrl);
          await saveConfig("app_apk_meta", JSON.stringify(meta));
        }

        setApkUrl(publicUrl);
        setApkMeta(meta);
      } else {
        // Simula pequenos passos com progresso para arquivos já em cache
        for (let s = 1; s <= 3; s++) {
          if (isPausedRef.current) return;
          const p = s * 30;
          setGenerationProgress((prev) => ({
            ...prev,
            percent: p,
            statusText: s === 1 ? "Verificando token do APK..." : s === 2 ? "Gerando destinos e encurtador..." : "Vinculando criptografia...",
          }));
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      if (isPausedRef.current) return;

      setGenerationProgress((prev) => ({
        ...prev,
        percent: 96,
        statusText: "Criando links /r/slug e link criptografado...",
      }));

      const targetUrl = getTargetUrlForScreen(chosenScreen.id, activeDownloadToken) || (activeDownloadToken ? apkDownloadUrlFor(activeDownloadToken) : "");

      const { data: linkRow, error: linkError } = await cloud
        .from("app_short_links")
        .insert({
          store_id: activeStoreId,
          slug: finalSlug,
          original_url: targetUrl,
          created_via: "admin_screen_generator",
          link_type: isBinary ? "apk" : "page",
          campaign_origin: "gerar_tela_apk",
          metadata: {
            apk_token: activeDownloadToken,
            screen_id: chosenScreen.id,
            screen_name: chosenScreen.name,
            screen_path: chosenScreen.path,
            app_name: finalAppName,
            file_name: finalDisplayName,
          },
          active: true,
        })
        .select("id, slug, original_url, clicks, created_at, active, link_type, metadata")
        .single();

      let actualLinkRow = linkRow;
      if (linkError) {
        if ((linkError as { code?: string }).code === "23505") {
          const suffixedSlug = `${finalSlug}-${Math.floor(Math.random() * 900 + 100)}`;
          const { data: retryRow, error: retryError } = await cloud
            .from("app_short_links")
            .insert({
              store_id: activeStoreId,
              slug: suffixedSlug,
              original_url: targetUrl,
              created_via: "admin_screen_generator",
              link_type: isBinary ? "apk" : "page",
              campaign_origin: "gerar_tela_apk",
              metadata: {
                apk_token: activeDownloadToken,
                screen_id: chosenScreen.id,
                screen_name: chosenScreen.name,
                screen_path: chosenScreen.path,
                app_name: finalAppName,
                file_name: finalDisplayName,
              },
              active: true,
            })
            .select("id, slug, original_url, clicks, created_at, active, link_type, metadata")
            .single();

          if (retryError) throw retryError;
          actualLinkRow = retryRow;
          finalSlug = suffixedSlug;
        } else {
          throw linkError;
        }
      }

      await saveConfig("app_download_landing_screen", chosenScreen.id);

      const encryptedPath = encodeEncryptedLink(targetUrl, {
        source: "/admin",
        label: chosenScreen.name,
        channel: "app",
      });
      const encryptedSlug = encryptedPath.replace(/^\/r\//, "");
      const encryptedUrl = `https://materialdecontrucao.online${encryptedPath}`;

      try {
        const { data: encRow } = await cloud
          .from("app_short_links")
          .insert({
            store_id: activeStoreId,
            slug: encryptedSlug,
            original_url: targetUrl,
            created_via: "admin_screen_generator_enc",
            link_type: isBinary ? "apk" : "page",
            campaign_origin: "encrypted_screen_link",
            metadata: {
              apk_token: activeDownloadToken,
              screen_id: chosenScreen.id,
              screen_name: chosenScreen.name,
              is_encrypted: true,
            },
            active: true,
          })
          .select("id, slug, original_url, clicks, created_at, active, link_type, metadata")
          .single();

        if (encRow) {
          setShortLinks((prev) => [encRow as ShortLinkRow, ...prev]);
        }
      } catch {
        /* ignore duplicate */
      }

      // Substitui o item provisório pelo link real
      if (actualLinkRow) {
        setShortLinks((prev) => [
          actualLinkRow as ShortLinkRow,
          ...prev.filter((l) => l.id !== provisionalId),
        ]);
      }
      activeProvisionalIdRef.current = null;

      const generatedUrl = `${shortBaseUrl}/${finalSlug}`;
      setLastGeneratedScreenLink({
        url: generatedUrl,
        slug: finalSlug,
        encryptedUrl,
        encryptedSlug,
        screenName: chosenScreen.name,
        fileName: finalDisplayName,
      });

      setGenerationProgress((prev) => ({
        ...prev,
        active: false,
        percent: 100,
        statusText: "Tela e links gerados com sucesso!",
      }));

      toast.success(`Tela "${chosenScreen.name}" vinculada! Link /r/${finalSlug} pronto para uso.`);
    } catch (err: unknown) {
      if ((err as Error)?.message === "PAUSED") {
        return;
      }
      const message = err instanceof Error ? err.message : "Falha desconhecida";
      console.error("[GerarTela] Erro:", err);
      toast.error(`Erro ao gerar tela: ${message}`);
      setGenerationProgress((prev) => ({
        ...prev,
        active: false,
        statusText: `Erro: ${message}`,
      }));
    } finally {
      if (uploadTimerRef.current) {
        clearInterval(uploadTimerRef.current);
        uploadTimerRef.current = null;
      }
      if (!isPausedRef.current) {
        setGeneratingScreen(false);
      }
    }
  };

  const load = async () => {
    setLoading(true);
    setMetricsError(false);

    try {
      const [
        { data: trackingAppEvents, error: trackingEventsError },
        { data: trackingSessionsRows, error: sessionsError },
        { data: configRow, error: configError },
        { data: metaRow, error: metaError },
        { data: landingScreenRow },
        shortLinksRes,
        tokenRes,
        apkRes,
      ] = await Promise.all([
        cloud
          .from("tracking_events")
          .select("id, type, path, metadata, created_at")
          .in("type", ["link_click", "download_apk", "app_banner_click", "banner_click", "app_install"])
          .order("created_at", { ascending: false })
          .limit(1000),
        cloud
          .from("tracking_sessions")
          .select("id, channel, app_time_seconds, site_time_seconds, encrypted_clicks, purchase_probability, is_bot")
          .order("last_seen_at", { ascending: false })
          .limit(500),
        cloud.from("app_config").select("value").eq("key", "app_download_url").maybeSingle(),
        cloud.from("app_config").select("value").eq("key", "app_apk_meta").maybeSingle(),
        cloud.from("app_config").select("value").eq("key", "app_download_landing_screen").maybeSingle(),
        activeStoreId
          ? cloud
              .from("app_short_links")
              .select("id, slug, original_url, clicks, created_at, active, link_type, metadata")
              .eq("store_id", activeStoreId)
              .order("clicks", { ascending: false })
              .limit(40)
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

      if (trackingEventsError || sessionsError) {
        throw new Error("Falha ao carregar métricas reais do banco de dados");
      }

      const appEvList = (trackingAppEvents ?? []) as Array<{
        id: string;
        type: string;
        path: string | null;
        metadata: Record<string, unknown> | null;
        created_at: string;
      }>;
      const bannerList = appEvList.filter(
        (ev) =>
          ev.type === "app_banner_click" ||
          ev.metadata?.label === "top_app_banner" ||
          ev.metadata?.label === "footer_google_play" ||
          ev.metadata?.click_type === "app_download_click",
      );
      const installList = appEvList.filter(
        (ev) =>
          ev.type === "download_apk" ||
          ev.type === "app_install" ||
          (ev.type === "link_click" && String(ev.path || "").startsWith("/google-play")),
      );
      const encList = appEvList.filter((ev) => ev.type === "link_click");

      setBannerClicks(bannerList.length);
      setAppDownloadClicks(installList.length);

      const humanSessions = ((trackingSessionsRows ?? []) as Array<{
        is_bot?: boolean | null;
        channel?: string | null;
        app_time_seconds?: number | null;
        purchase_probability?: number | null;
      }>).filter((s) => !s.is_bot);
      const onlyApp = humanSessions.filter(
        (s) => s.channel === "app" || s.channel === "site+app" || Number(s.app_time_seconds || 0) > 0,
      );
      setAppSessions(onlyApp.length);

      const totalAppSec = onlyApp.reduce((acc, s) => acc + Number(s.app_time_seconds || 0), 0);
      setAvgAppTimeSec(onlyApp.length > 0 ? Math.round(totalAppSec / onlyApp.length) : 0);

      const avgProb =
        onlyApp.length > 0
          ? Math.round(onlyApp.reduce((acc, s) => acc + Number(s.purchase_probability || 0), 0) / onlyApp.length)
          : 0;
      setAvgAppPropensity(avgProb);

      const shortLinksList = (shortLinksRes.data as ShortLinkRow[] | null) ?? [];
      const sumShortClicks = shortLinksList.reduce((acc, row) => acc + Number(row.clicks || 0), 0);
      setEncryptedLinkClicksTotal(Math.max(encList.length, sumShortClicks));

      const now = new Date();
      const dailyMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i -= 1) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        dailyMap[date.toISOString().split("T")[0]] = 0;
      }

      [...bannerList, ...encList].forEach((event) => {
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

      if (configError) {
        console.error("[APP_CONFIG_LOAD_ERROR]", configError);
      }

      if (metaError) {
        console.error("[APP_CONFIG_META_LOAD_ERROR]", metaError);
      }

      setApkUrl(configRow?.value ?? null);

      if (metaRow?.value) {
        try {
          setApkMeta(JSON.parse(metaRow.value) as ApkMeta);
        } catch (error) {
          console.error("Erro ao parsear meta", error);
          setApkMeta(null);
        }
      } else {
        setApkMeta(null);
      }

      setShortLinks(shortLinksList);
      setShortenerTokens((tokenRes.data as ShortenerTokenRow[] | null) ?? []);
      if (landingScreenRow?.value && CREATED_APP_SCREENS.some((s) => s.id === landingScreenRow.value)) {
        setSelectedScreenId(landingScreenRow.value);
      }
      const apkList = ((apkRes as { data?: ApkRow[] | null }).data ?? []) as ApkRow[];
      setApks(apkList);
      setApkToken((apkList.find((a) => a.active) ?? apkList[0])?.download_token ?? null);
    } catch (error) {
      console.error("[AppMetrics] load error:", error);
      setMetricsError(true);
      setBannerClicks(0);
      setAppDownloadClicks(0);
      setAppSessions(0);
      setAvgAppTimeSec(0);
      setAvgAppPropensity(0);
      setEncryptedLinkClicksTotal(0);
      setDailyClicks([]);
      setApkUrl(null);
      setApkMeta(null);
      setApkToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [activeStoreId]);

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
      toast.error("Tamanho máximo: 250 MB");
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

          const uploadSlug = sanitizeSlug(uploadSlugInput);
          if (uploadSlug) {
            const chosenScreen = CREATED_APP_SCREENS.find((s) => s.id === selectedScreenId) || CREATED_APP_SCREENS[0];
            const targetUrl = getTargetUrlForScreen(chosenScreen.id, newToken) || apkDownloadUrlFor(newToken);
            const isBinary = chosenScreen.id === "direct_binary";

            const { data: linkRow, error: linkError } = await cloud
              .from("app_short_links")
              .insert({
                store_id: activeStoreId,
                slug: uploadSlug,
                original_url: targetUrl,
                created_via: "admin",
                link_type: isBinary ? "apk" : "page",
                campaign_origin: "apk_download",
                metadata: {
                  apk_token: newToken,
                  screen_id: chosenScreen.id,
                  screen_name: chosenScreen.name,
                  screen_path: chosenScreen.path,
                },
                active: true,
              })
              .select("id, slug, original_url, clicks, created_at, active, link_type, metadata")
              .single();

            if (linkError) {
              toast.error(
                (linkError as { code?: string }).code === "23505"
                  ? "APK enviado, mas o slug já existe"
                  : `APK enviado, mas falhou o link curto: ${linkError.message}`,
              );
            } else if (linkRow) {
              setShortLinks((prev) => [linkRow as ShortLinkRow, ...prev]);
              setUploadSlugInput("");
              toast.success(`Link curto criado vinculado a ${chosenScreen.name}: /r/${uploadSlug}`);
            }
          }
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
      const isApkLink = !!apkToken && (finalOriginal.includes(`/api/apk/${apkToken}`) || finalOriginal.includes(`token=${apkToken}`));
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Smartphone className="h-6 w-6 text-primary" /> Métricas do Aplicativo
          </h1>
          <p className="text-sm text-muted-foreground">Downloads, cliques e sessões do app</p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          {
            icon: <Smartphone className="h-4 w-4" />,
            label: "Sessões no App",
            value: appSessions,
            color: "text-foreground",
          },
          {
            icon: <Clock className="h-4 w-4" />,
            label: "Tempo Médio App",
            value: avgAppTimeSec >= 60 ? `${Math.floor(avgAppTimeSec / 60)}m ${avgAppTimeSec % 60}s` : `${avgAppTimeSec}s`,
            color: "text-emerald-600",
          },
          {
            icon: <Link2 className="h-4 w-4" />,
            label: "Links Criptografados",
            value: encryptedLinkClicksTotal,
            color: "text-sky-600",
          },
          {
            icon: <ShieldCheck className="h-4 w-4" />,
            label: "Propensão App",
            value: `${avgAppPropensity}%`,
            color: "text-primary",
          },
          {
            icon: <MousePointerClick className="h-4 w-4" />,
            label: "Cliques Banner App",
            value: bannerClicks,
            color: "text-foreground",
          },
          {
            icon: <Download className="h-4 w-4" />,
            label: "Instalações / GP",
            value: appDownloadClicks,
            color: "text-primary",
          },
        ].map((card, index) => (
          <Card key={index} className="rounded-2xl">
            <CardContent className="px-4 pt-4 pb-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                {card.icon}
                {card.label}
              </div>
              <div className={`text-3xl font-bold ${card.color}`}>
                {loading || metricsError ? "—" : card.value}
              </div>
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
          {metricsError ? (
            <p className="py-8 text-center text-sm text-destructive">Não foi possível carregar os dados reais. Verifique a conexão com o banco e tente novamente.</p>
          ) : dailyClicks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem dados registrados nos últimos 7 dias</p>
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

          <div className="space-y-1.5">
            <Label htmlFor="uploadSlug" className="text-xs font-medium">Slug do link curto (opcional)</Label>
            <Input
              id="uploadSlug"
              placeholder="ex: jadlogenvio"
              value={uploadSlugInput}
              onChange={(e) => setUploadSlugInput(e.target.value)}
              disabled={uploading}
            />
            <p className="text-[11px] text-muted-foreground">
              Ao enviar com slug, já criamos <code className="bg-muted px-1 rounded font-mono">{shortBaseUrl}/{sanitizeSlug(uploadSlugInput) || "slug"}</code> apontando para a tela selecionada abaixo.
            </p>
          </div>

          {/* Opção de escolher telas criadas do APK Studio para vínculo */}
          <div className="space-y-2.5 rounded-xl border border-primary/30 bg-primary/[0.04] p-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <Label htmlFor="screenSelect" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" />
                Vincular à Tela Criada (APK Studio & Loja)
              </Label>
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full w-fit">
                {CREATED_APP_SCREENS.length} Telas Prontas
              </span>
            </div>

            <select
              id="screenSelect"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={selectedScreenId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedScreenId(nextId);
                try {
                  localStorage.setItem("admin_selected_apk_screen", nextId);
                } catch { /* ignore */ }
              }}
              disabled={uploading}
            >
              {CREATED_APP_SCREENS.map((screen) => (
                <option key={screen.id} value={screen.id}>
                  {screen.name} ({screen.badge})
                </option>
              ))}
            </select>

            {(() => {
              const currentScreen = CREATED_APP_SCREENS.find((s) => s.id === selectedScreenId) || CREATED_APP_SCREENS[0];
              return (
                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentScreen.badgeColor}`}>
                      {currentScreen.badge}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Destino: {currentScreen.path.startsWith("/") ? currentScreen.path : "Download Direto do Binário"}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {currentScreen.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {currentScreen.path.startsWith("/") && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(currentScreen.path, "_blank")}
                          className="h-7 text-xs gap-1"
                        >
                          <ExternalLink className="h-3 w-3" /> Ver Tela no Navegador
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => window.open(currentScreen.path, "_blank")}
                          className="h-7 text-xs gap-1"
                        >
                          <Globe className="h-3 w-3" /> Testar Destino
                        </Button>
                      </>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open("/google-play-studio", "_blank")}
                      className="h-7 text-xs gap-1"
                    >
                      <Palette className="h-3 w-3" /> Abrir no APK Studio
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void copyText(fullTargetUrl || currentScreen.path, currentScreen.name)}
                      className="h-7 text-xs gap-1"
                    >
                      <Copy className="h-3 w-3" /> Copiar Link
                    </Button>
                    <Button
                      type="button"
                      onClick={handleGenerateScreenWithApk}
                      disabled={uploading || generatingScreen}
                      size="sm"
                      className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm ml-auto"
                    >
                      {generatingScreen ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Gerar Tela Vinculada
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>


          <div className="flex flex-col gap-3 sm:flex-row">
            <Input ref={fileRef} type="file" accept=".apk" className="flex-1" disabled={uploading || generatingScreen} onChange={handleFileSelect} />
            <Button
              type="button"
              onClick={handleGenerateScreenWithApk}
              disabled={uploading || generatingScreen}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/25 px-5 transition-all"
            >
              {generatingScreen ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generatingScreen ? "Gerando Tela..." : "Gerar Tela"}
            </Button>
            <Button
              type="button"
              onClick={handleApkUpload}
              disabled={uploading || generatingScreen}
              variant="outline"
              className="gap-1.5"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Enviando..." : "Enviar APK"}
            </Button>
          </div>

          {/* Barra e Painel de Progresso Rico com %, Tempo Decorrido, Estimado e Controles Pausar / Retomar / Cancelar */}
          {(generationProgress.active || generationProgress.paused) && (
            <div className={`rounded-xl border p-4 space-y-3 transition-all animate-in fade-in slide-in-from-top-2 ${
              generationProgress.paused
                ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-200"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {generationProgress.paused ? (
                    <Pause className="h-5 w-5 text-amber-600 animate-pulse" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-emerald-600 animate-spin" />
                  )}
                  <div>
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <span>{generationProgress.paused ? "Criação da Tela Pausada" : "Gerando Tela e Vinculando APK..."}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-black ${
                        generationProgress.paused ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      }`}>
                        {generationProgress.percent}%
                      </span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tela: <b>{generationProgress.screenName}</b> • Slug: <code className="bg-background/80 px-1 py-0.5 rounded font-mono">/r/{generationProgress.slug}</code>
                    </p>
                  </div>
                </div>

                {/* Controles de Pausar / Retomar / Cancelar */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {generationProgress.paused ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleResumeGeneration}
                      className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Retomar / Ativar
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handlePauseGeneration}
                      className="h-8 gap-1.5 border-amber-500/50 text-amber-600 hover:bg-amber-500/15 font-bold"
                    >
                      <Pause className="h-3.5 w-3.5 fill-current" /> Pausar
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelGeneration}
                    className="h-8 gap-1 text-destructive hover:bg-destructive/10 text-xs"
                  >
                    <X className="h-3.5 w-3.5" /> Cancelar
                  </Button>
                </div>
              </div>

              {/* Barra de Progresso Animada */}
              <div className="space-y-1">
                <Progress
                  value={generationProgress.percent}
                  className={`h-3 rounded-full ${generationProgress.paused ? "bg-amber-950/20" : "bg-emerald-950/20"}`}
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span>{generationProgress.statusText}</span>
                  <span className="font-bold text-foreground">{generationProgress.percent}% concluído</span>
                </div>
              </div>

              {/* Grid com Métricas: Decorrido, Estimado, Velocidade e Bytes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-border/40 text-xs">
                <div className="rounded-lg bg-background/60 p-2 space-y-0.5">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3 text-primary" /> Tempo Decorrido
                  </div>
                  <div className="font-mono font-bold text-sm text-foreground">
                    {fmtDuration(generationProgress.elapsedSeconds)}
                  </div>
                </div>

                <div className="rounded-lg bg-background/60 p-2 space-y-0.5">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <Activity className="h-3 w-3 text-primary" /> Tempo Estimado
                  </div>
                  <div className="font-mono font-bold text-sm text-foreground">
                    ~{fmtDuration(generationProgress.estimatedRemainingSeconds)}
                  </div>
                </div>

                <div className="rounded-lg bg-background/60 p-2 space-y-0.5">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-primary" /> Velocidade
                  </div>
                  <div className="font-mono font-bold text-sm text-foreground">
                    {fmtMB(generationProgress.speedBytesPerSec)} MB/s
                  </div>
                </div>

                <div className="rounded-lg bg-background/60 p-2 space-y-0.5">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <Upload className="h-3 w-3 text-primary" /> Transferência
                  </div>
                  <div className="font-mono font-bold text-sm text-foreground">
                    {fmtMB(generationProgress.loadedBytes)} / {fmtMB(generationProgress.totalBytes)} MB
                  </div>
                </div>
              </div>
            </div>
          )}

          {lastGeneratedScreenLink && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-emerald-950 dark:text-emerald-200 animate-in fade-in slide-in-from-top-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400 text-base">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Tela Vinculada ao APK com Sucesso!</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Tela: <b className="text-foreground">{lastGeneratedScreenLink.screenName}</b> • Arquivo: <b className="text-foreground">{lastGeneratedScreenLink.fileName}</b>
                </div>
              </div>

              {/* Opção 1: Link com Slug Amigável */}
              <div className="rounded-lg border border-emerald-500/30 bg-background/80 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    <Link2 className="h-3.5 w-3.5" />
                    <span>Link Curto com Slug (/r/{lastGeneratedScreenLink.slug})</span>
                  </div>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                    Slug Direto
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="font-mono text-xs sm:text-sm font-semibold text-foreground select-all break-all">
                    {lastGeneratedScreenLink.url}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      onClick={() => window.open(lastGeneratedScreenLink.url, "_blank")}
                    >
                      <ExternalLink className="h-3 w-3" /> Abrir
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5 border-emerald-500/40 font-medium"
                      onClick={() => void copyText(lastGeneratedScreenLink.url, "Link com Slug")}
                    >
                      <Copy className="h-3 w-3" /> Copiar Link
                    </Button>
                  </div>
                </div>
              </div>

              {/* Opção 2: Link Criptografado com Anti-Cloaking e Tracking */}
              {lastGeneratedScreenLink.encryptedUrl && (
                <div className="rounded-lg border border-purple-500/30 bg-background/80 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                      <Lock className="h-3.5 w-3.5" />
                      <span>Link Criptografado Anti-Cloaking & Anti-Bot</span>
                    </div>
                    <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:text-purple-300">
                      Criptografia FNV-1a + Track IP
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="font-mono text-xs sm:text-sm font-semibold text-foreground select-all break-all">
                      {lastGeneratedScreenLink.encryptedUrl}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-medium"
                        onClick={() => window.open(lastGeneratedScreenLink.encryptedUrl, "_blank")}
                      >
                        <ExternalLink className="h-3 w-3" /> Abrir Encrypt
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5 border-purple-500/40 font-medium"
                        onClick={() => void copyText(lastGeneratedScreenLink.encryptedUrl, "Link Criptografado")}
                      >
                        <Copy className="h-3 w-3" /> Copiar Encrypt
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox id="persist" checked={persistToSystem} onCheckedChange={(v) => setPersistToSystem(Boolean(v))} disabled={uploading} />
            <Label htmlFor="persist" className="text-sm cursor-pointer">Salvar APK no sistema (storage + banco)</Label>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 font-semibold text-foreground flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" /> APK instalado
            </h3>

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

      {/* Card Independente de Telas Criadas do APK Studio & Destinos de Download */}
      <Card className="rounded-2xl border border-primary/20 bg-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-primary" /> Telas Criadas do APK Studio & Destinos de Download
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                {CREATED_APP_SCREENS.length} Telas Prontas
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("/google-play-studio", "_blank")}
                className="gap-1.5 text-xs"
              >
                <Palette className="h-3.5 w-3.5 text-primary" /> Abrir APK Studio
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Selecione qualquer tela criada no APK Studio ou na Loja para vincular ao download e gerar links curtos (/r/slug).
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
            {CREATED_APP_SCREENS.map((screen) => {
              const isDefault = selectedScreenId === screen.id;
              const screenSlug = screenSlugMap[screen.id] || "";
              const fullUrl = getTargetUrlForScreen(screen.id, apkToken);

              return (
                <div
                  key={screen.id}
                  className={`rounded-xl border p-3.5 space-y-3 transition-colors ${
                    isDefault
                      ? "border-primary/60 bg-primary/[0.04] shadow-sm ring-1 ring-primary/20"
                      : "border-border bg-card hover:border-border/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${screen.badgeColor}`}>
                          {screen.badge}
                        </span>
                        {isDefault && (
                          <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                            <Check className="h-3 w-3" /> Padrão Ativo
                          </span>
                        )}
                      </div>
                      <h5 className="text-sm font-bold text-foreground">{screen.name}</h5>
                    </div>

                    <Button
                      variant={isDefault ? "secondary" : "outline"}
                      size="sm"
                      disabled={savingDefaultScreen || isDefault}
                      onClick={() => void handleSaveDefaultScreen(screen.id)}
                      className="h-7 text-[11px] gap-1 shrink-0"
                    >
                      {isDefault ? "Padrão" : "Definir Padrão"}
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {screen.description}
                  </p>

                  {/* Link de Destino & Ações */}
                  <div className="space-y-1.5 pt-1 border-t border-border/40">
                    <Label className="text-[11px] font-medium text-muted-foreground">URL de destino da tela:</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={fullUrl || (screen.path.startsWith("/") ? screen.path : "Download Direto do Binário")}
                        className="h-7 text-xs bg-background/80 font-mono"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => void copyText(fullUrl || screen.path, screen.name)}
                        title="Copiar URL"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      {screen.path.startsWith("/") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => window.open(screen.path, "_blank")}
                          title="Abrir no Navegador"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                      {(screen.type === "studio_preset" || screen.type === "studio_custom") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => window.open("/google-play-studio", "_blank")}
                          title="Editar no Studio"
                        >
                          <Palette className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Gerador de Link Curto com Slug para Esta Tela */}
                  <div className="rounded-lg bg-background/80 border border-border/60 p-2.5 space-y-2">
                    <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                      <Link2 className="h-3 w-3 text-primary" /> Criar link curto /r/slug para esta tela:
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder={`Ex: ${screen.id === "jadlog_clean" ? "rastreio-jadlog" : "baixar-app"}`}
                        value={screenSlug}
                        onChange={(e) =>
                          setScreenSlugMap((prev) => ({
                            ...prev,
                            [screen.id]: e.target.value,
                          }))
                        }
                        className="h-8 text-xs flex-1"
                      />
                      <Button
                        size="sm"
                        disabled={creatingScreenLinkId === screen.id || !screenSlug.trim()}
                        onClick={() => void handleCreateScreenShortLink(screen.id)}
                        className="h-8 text-xs gap-1 shrink-0"
                      >
                        {creatingScreenLinkId === screen.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Link2 className="h-3 w-3" />
                        )}
                        Gerar Link
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {shortBaseUrl}/{sanitizeSlug(screenSlug) || "seu-slug"} ➔ {screen.badge}
                    </p>
                  </div>
                </div>
              );
            })}
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
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" /> Token para script de geração
              </h3>
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
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" /> Links curtos recentes
            </h3>
            {shortLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum link curto criado ainda.</p>
            ) : (
              <div className="space-y-4">
                {shortLinks.map((link) => {
                  const shortUrl = `${shortBaseUrl}/${link.slug}`;
                  const isExpanded = !!expandedLinks[link.id];

                  if (link.metadata?.is_generating) {
                    const isPaused = Boolean(link.metadata.is_paused);
                    const pct = Number(link.metadata.percent || 0);
                    const elapsed = Number(link.metadata.elapsed_seconds || 0);
                    const remaining = Number(link.metadata.remaining_seconds || 0);

                    return (
                      <div
                        key={link.id}
                        className={`rounded-2xl border p-4 text-xs space-y-3 transition-all shadow-sm ${
                          isPaused
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-200"
                            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                              isPaused ? "bg-amber-500/20 text-amber-600" : "bg-emerald-500/20 text-emerald-600 animate-pulse"
                            }`}>
                              {isPaused ? <Pause className="h-4 w-4" /> : <Sparkles className="h-4 w-4 animate-spin" />}
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-foreground truncate">
                                  /r/{link.slug}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  isPaused ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 animate-pulse"
                                }`}>
                                  {isPaused ? "Pausado" : "Gerando"} ({pct}%)
                                </span>
                              </div>
                              <p className="text-muted-foreground truncate">
                                Vinculando tela <b>{String(link.metadata.screen_name || "Tela")}</b> ao APK <b>{String(link.metadata.file_name || "app.apk")}</b>
                              </p>
                            </div>
                          </div>

                          {/* Ações Diretas na Lista: Pausar, Retomar/Ativar, Cancelar */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {isPaused ? (
                              <Button
                                size="sm"
                                onClick={handleResumeGeneration}
                                className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              >
                                <Play className="h-3 w-3 fill-current" /> Ativar / Retomar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handlePauseGeneration}
                                className="h-7 text-xs gap-1 border-amber-500/50 text-amber-600 font-bold"
                              >
                                <Pause className="h-3 w-3 fill-current" /> Pausar
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelGeneration}
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-3 w-3" /> Cancelar
                            </Button>
                          </div>
                        </div>

                        {/* Barra de Progresso */}
                        <div className="space-y-1">
                          <Progress
                            value={pct}
                            className={`h-2 rounded-full ${isPaused ? "bg-amber-950/20" : "bg-emerald-950/20"}`}
                          />
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                            <span>{pct}% concluído</span>
                            <div className="flex items-center gap-2">
                              <span>Decorrido: <b>{fmtDuration(elapsed)}</b></span>
                              <span>Estimado: <b>~{fmtDuration(remaining)}</b></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

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
              <Label className="text-sm font-medium">Vincular a uma tela criada (APK Studio / Loja)</Label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                defaultValue=""
                onChange={(e) => {
                  const sId = e.target.value;
                  if (!sId) return;
                  const screen = CREATED_APP_SCREENS.find((s) => s.id === sId);
                  if (screen) {
                    const target = getTargetUrlForScreen(screen.id, editApkToken || apkToken);
                    if (target) setEditUrlInput(target);
                  }
                }}
                disabled={savingEdit}
              >
                <option value="">Selecione para preencher URL automaticamente...</option>
                {CREATED_APP_SCREENS.map((screen) => (
                  <option key={screen.id} value={screen.id}>
                    {screen.name} ({screen.badge})
                  </option>
                ))}
              </select>
            </div>

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
