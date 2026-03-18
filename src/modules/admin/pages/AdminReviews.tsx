import { useCallback, useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  BarChart3, CheckCircle, Clock, Loader2, MessageSquare, RefreshCw,
  Search, Sparkles, Star, TrendingUp, Trash2, Calendar,
  Image as ImageIcon, FileText, Eye, ChevronDown, ChevronUp, Camera,
  Play, History, Zap, Package, Users,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

/* ------------------------------------------------------------------ */
/*  Feature Flag                                                       */
/* ------------------------------------------------------------------ */
const REVIEWS_ENABLE_IMAGES = false;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Review = {
  id: string;
  product_id: string;
  author_name: string;
  author_location: string | null;
  rating: number;
  title: string | null;
  content: string;
  pros: string | null;
  cons: string | null;
  approved: boolean;
  origin: string;
  created_at: string;
  product_name?: string;
};

type LogEntry = {
  id: string;
  created_at: string;
  level: string;
  event_type: string;
  source: string;
  message: string;
  metadata: any;
};

type DailyConfig = {
  id: string; enabled: boolean; max_reviews_per_day: number; min_reviews_per_day: number;
  max_reviews_per_product: number; max_total_per_product: number; start_hour: number;
  end_hour: number; image_percentage: number;
};

type DailyRun = {
  id: string; run_date: string; reviews_generated: number; images_attached: number;
  products_covered: number; target_count: number; status: string; error_message: string | null; created_at: string;
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewImageIds, setReviewImageIds] = useState<Set<string>>(new Set());
  const [reviewImageMap, setReviewImageMap] = useState<Map<string, string[]>>(new Map());
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "with_image">("pending");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showLogs, setShowLogs] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);
  const [totalProducts, setTotalProducts] = useState(0);
  const [reviewsWithImagesCount, setReviewsWithImagesCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  // Unified generation
  const [genMode, setGenMode] = useState<"text" | "image" | "text_image">("text");
  const [genProductScope, setGenProductScope] = useState<string>("10");
  const [genCountPer, setGenCountPer] = useState<string>("auto");
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState<{
    processed: number; total: number; created: number; images: number; done: boolean;
  } | null>(null);

  // Image pool
  const [searchingImages, setSearchingImages] = useState(false);
  const [poolStats, setPoolStats] = useState({ total_images: 0, products_with_pool: 0 });

  // Daily engine
  const [dailyConfig, setDailyConfig] = useState<DailyConfig | null>(null);
  const [dailyRuns, setDailyRuns] = useState<DailyRun[]>([]);
  const [dailyRunning, setDailyRunning] = useState(false);
  const [showDailyHistory, setShowDailyHistory] = useState(false);

  /* ---------- data loading ---------- */
  const load = useCallback(async () => {
    setLoading(true);
    const reviewsQ = cloud.from("product_reviews").select("*, store_products(name)").order("created_at", { ascending: false }).limit(1000);
    const logsQ = cloud.from("system_event_logs").select("*").in("source", ["review-system", "daily-reviews-engine"]).order("created_at", { ascending: false }).limit(50);
    const productsQ = cloud.from("store_products").select("id", { count: "exact", head: true }).eq("active", true).eq("status", "published");

    const [reviewsRes, logsRes, productsRes] = await Promise.all([reviewsQ, logsQ, productsQ]);

    let imagesRes: any = null;
    let poolStatsRes: any = null;
    if (REVIEWS_ENABLE_IMAGES) {
      [imagesRes, poolStatsRes] = await Promise.all([
        cloud.from("review_images").select("review_id, image_url"),
        cloud.functions.invoke("search-review-images", { body: { action: "stats" } }),
      ]);
    }

    if (reviewsRes.error) toast({ title: "Erro", description: reviewsRes.error.message, variant: "destructive" });

    const mapped = ((reviewsRes.data ?? []) as any[]).map((r) => ({
      ...r,
      product_name: r.store_products?.name ?? "—",
    }));
    setReviews(mapped);
    setLogs((logsRes.data ?? []) as LogEntry[]);
    setTotalProducts(productsRes.count ?? 0);

    if (REVIEWS_ENABLE_IMAGES && imagesRes) {
      if (poolStatsRes?.data && (poolStatsRes.data as any).ok) {
        setPoolStats({
          total_images: (poolStatsRes.data as any).total_images ?? 0,
          products_with_pool: (poolStatsRes.data as any).products_with_pool ?? 0,
        });
      }
      const imgMap = new Map<string, string[]>();
      for (const i of (imagesRes.data ?? []) as any[]) {
        const rid = i.review_id as string;
        const url = i.image_url as string;
        if (!imgMap.has(rid)) imgMap.set(rid, []);
        imgMap.get(rid)!.push(url);
      }
      setReviewImageMap(imgMap);
      const imgIds = new Set(imgMap.keys());
      setReviewImageIds(imgIds);
      setReviewsWithImagesCount(imgIds.size);
    }

    setSelected(new Set());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ---------- daily engine loading ---------- */
  const loadDailyEngine = useCallback(async () => {
    const [cfgRes, histRes] = await Promise.all([
      cloud.functions.invoke("daily-reviews-engine", { body: { action: "get_config" } }),
      cloud.functions.invoke("daily-reviews-engine", { body: { action: "history" } }),
    ]);
    if (cfgRes.data && (cfgRes.data as any).ok) setDailyConfig((cfgRes.data as any).config);
    if (histRes.data && (histRes.data as any).ok) setDailyRuns((histRes.data as any).runs ?? []);
  }, []);

  useEffect(() => { loadDailyEngine(); }, [loadDailyEngine]);

  /* ---------- computed ---------- */
  const filtered = useMemo(() => {
    let result = reviews;
    if (filter === "pending") result = result.filter((r) => !r.approved);
    if (filter === "approved") result = result.filter((r) => r.approved);
    if (filter === "with_image") result = result.filter((r) => reviewImageIds.has(r.id));
    const s = q.trim().toLowerCase();
    if (s) result = result.filter((r) =>
      r.content.toLowerCase().includes(s) ||
      r.author_name.toLowerCase().includes(s) ||
      (r.product_name ?? "").toLowerCase().includes(s)
    );
    return result;
  }, [reviews, filter, q, reviewImageIds]);

  const pendingCount = reviews.filter((r) => !r.approved).length;
  const approvedCount = reviews.filter((r) => r.approved).length;
  const aiCount = reviews.filter((r) => r.origin === "ai_generated").length;
  const realCount = reviews.filter((r) => r.origin === "customer").length;

  const todayCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return reviews.filter((r) => r.created_at.slice(0, 10) === today).length;
  }, [reviews]);

  const weekCount = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    return reviews.filter((r) => r.created_at >= weekAgo).length;
  }, [reviews]);

  const productsWithReviews = useMemo(() => {
    return new Set(reviews.filter((r) => r.approved).map((r) => r.product_id)).size;
  }, [reviews]);

  const coveragePercent = totalProducts > 0 ? Math.round((productsWithReviews / totalProducts) * 100) : 0;

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0;
    return Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1));
  }, [reviews]);

  const ratingDistribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
    return dist;
  }, [reviews]);

  /* ---------- actions ---------- */
  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  };

  const batchAction = async (action: "approve" | "reject") => {
    if (!selected.size) return;
    setActionLoading(true);
    const ids = [...selected];
    const { error } = await cloud.functions.invoke("generate-reviews", {
      body: { action, review_ids: ids },
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
    else toast({ title: action === "approve" ? "Aprovadas" : "Removidas", description: `${ids.length} avaliações.` });
    setActionLoading(false);
    await load();
  };

  /* ---------- UNIFIED generation ---------- */
  const handleGenerate = async () => {
    setGenerating(true);
    setGenProgress(null);

    const isAuto = genCountPer === "auto";
    const productLimit = genProductScope === "0" ? 0 : Number(genProductScope);
    const mode = REVIEWS_ENABLE_IMAGES ? genMode : "text";

    try {
      if (isAuto) {
        // Use catalog action (smart distribution)
        let batchIndex = 0;
        let totalCreated = 0;
        let totalImages = 0;
        let totalProcessed = 0;
        let totalEligible = 0;

        while (true) {
          const { data, error } = await cloud.functions.invoke("generate-reviews", {
            body: { action: "catalog", limit: productLimit, batch_index: batchIndex },
          });
          if (error) throw error;
          const result = data as any;

          totalCreated += result.total_created ?? 0;
          totalImages += result.total_images ?? 0;
          totalProcessed += result.products_in_batch ?? 0;
          totalEligible = result.total_eligible ?? totalEligible;

          setGenProgress({
            processed: totalProcessed,
            total: totalEligible,
            created: totalCreated,
            images: totalImages,
            done: result.done,
          });

          if (result.done || !result.next_batch_index) break;
          batchIndex = result.next_batch_index;
        }

        toast({
          title: "Geração concluída!",
          description: `${totalCreated} reviews para ${totalProcessed} produtos.`,
        });
      } else {
        // Use generate action (fixed count per product)
        const count = Number(genCountPer);
        const limit = productLimit === 0 ? 1000 : productLimit;

        const { data: products } = await cloud
          .from("store_products")
          .select("id")
          .eq("active", true)
          .eq("status", "published")
          .limit(limit);

        if (!products?.length) {
          toast({ title: "Nenhum produto ativo encontrado", variant: "destructive" });
          setGenerating(false);
          return;
        }

        const productIds = products.map((p: any) => p.id);
        setGenProgress({ processed: 0, total: productIds.length, created: 0, images: 0, done: false });

        // Process in batches of 10
        const BATCH = 10;
        let totalCreated = 0;
        let totalImages = 0;

        for (let i = 0; i < productIds.length; i += BATCH) {
          const batch = productIds.slice(i, i + BATCH);
          const { data, error } = await cloud.functions.invoke("generate-reviews", {
            body: { action: "generate", product_ids: batch, count, mode },
          });
          if (error) throw error;
          const results = (data as any)?.results ?? [];
          totalCreated += results.reduce((sum: number, r: any) => sum + (r.reviews_created ?? 0), 0);
          totalImages += results.reduce((sum: number, r: any) => sum + (r.images_attached ?? 0), 0);

          setGenProgress({
            processed: Math.min(i + BATCH, productIds.length),
            total: productIds.length,
            created: totalCreated,
            images: totalImages,
            done: i + BATCH >= productIds.length,
          });
        }

        toast({
          title: "Geração concluída!",
          description: `${totalCreated} reviews para ${productIds.length} produtos.`,
        });
      }
      await load();
    } catch (e: any) {
      toast({ title: "Erro na geração", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  /* ---------- Image pool ---------- */
  const searchReviewImagesBatch = async () => {
    setSearchingImages(true);
    try {
      const { data, error } = await cloud.functions.invoke("search-review-images", {
        body: { action: "batch", limit: 20 },
      });
      if (error) throw error;
      const result = data as any;
      toast({
        title: "Busca concluída",
        description: `${result.processed ?? 0} produtos, ${result.total_saved ?? 0} imagens salvas.`,
      });
      await load();
    } catch (e: any) {
      toast({ title: "Erro na busca", description: e.message, variant: "destructive" });
    }
    setSearchingImages(false);
  };

  /* ---------- Daily engine actions ---------- */
  const toggleDailyEngine = async () => {
    if (!dailyConfig) return;
    const newEnabled = !dailyConfig.enabled;
    await cloud.functions.invoke("daily-reviews-engine", { body: { action: "update_config", enabled: newEnabled } });
    setDailyConfig({ ...dailyConfig, enabled: newEnabled });
    toast({ title: newEnabled ? "Engine ativada" : "Engine desativada" });
  };

  const updateDailyConfig = async (field: string, value: number) => {
    if (!dailyConfig) return;
    await cloud.functions.invoke("daily-reviews-engine", { body: { action: "update_config", [field]: value } });
    setDailyConfig({ ...dailyConfig, [field]: value } as any);
  };

  const runDailyNow = async () => {
    setDailyRunning(true);
    try {
      const { data, error } = await cloud.functions.invoke("daily-reviews-engine", { body: { action: "run" } });
      if (error) throw error;
      const result = data as any;
      if (result.skipped) {
        toast({ title: "Engine pulou execução", description: result.reason });
      } else {
        toast({ title: "Engine executada!", description: `${result.reviews_generated} reviews para ${result.products_covered} produtos.` });
        await load();
      }
      await loadDailyEngine();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setDailyRunning(false);
  };

  /* ---------- helpers ---------- */
  const stars = (n: number) => Array.from({ length: 5 }, (_, i) => (
    <Star key={i} className={`h-3.5 w-3.5 ${i < n ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
  ));

  const visibleFiltered = filtered.slice(0, visibleCount);
  const progressPct = genProgress && genProgress.total > 0 ? Math.round((genProgress.processed / genProgress.total) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Avaliações Inteligentes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie e gere avaliações com IA — sistema unificado.
          </p>
        </div>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* ====== Dashboard Metrics ====== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Total", value: reviews.length, icon: MessageSquare, color: "text-primary" },
          { label: "Hoje", value: todayCount, icon: Calendar, color: "text-blue-500" },
          { label: "Semana", value: weekCount, icon: TrendingUp, color: "text-emerald-500" },
          { label: "Pendentes", value: pendingCount, icon: Clock, color: "text-yellow-600" },
          { label: "Aprovadas", value: approvedCount, icon: CheckCircle, color: "text-green-600" },
        ].map((m) => (
          <Card key={m.label} className="rounded-2xl">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className={`rounded-xl bg-muted/60 p-2 ${m.color}`}>
                <m.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{m.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coverage + Rating + Extra stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Cobertura
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{coveragePercent}%</span>
              <span className="text-xs text-muted-foreground">
                {productsWithReviews}/{totalProducts}
              </span>
            </div>
            <Progress value={coveragePercent} className="h-2" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" /> Distribuição
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {[5, 4, 3, 2, 1].map((n) => {
              const count = ratingDistribution[n - 1];
              const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
              return (
                <div key={n} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-right font-medium">{n}</span>
                  <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                  <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-10 text-right text-muted-foreground">{pct}%</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Detalhes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Nota média</span>
              <span className="font-bold">{avgRating} ★</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Reviews IA</span>
              <span className="font-medium">{aiCount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Reviews reais</span>
              <span className="font-medium">{realCount}</span>
            </div>
            {REVIEWS_ENABLE_IMAGES && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Com imagem</span>
                <span className="font-medium">{reviewsWithImagesCount}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Produtos com reviews</span>
              <span className="font-medium">{productsWithReviews}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ====== UNIFIED Generate Section ====== */}
      <Card className="rounded-2xl border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Gerar avaliações com IA</p>
              <p className="text-xs text-muted-foreground">
                Sistema unificado — selecione escopo, modo e quantidade.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Mode */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Modo</Label>
              <Select value={genMode} onValueChange={(v) => setGenMode(v as any)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Apenas texto</SelectItem>
                  <SelectItem value="image" disabled={!REVIEWS_ENABLE_IMAGES}>Apenas imagem</SelectItem>
                  <SelectItem value="text_image" disabled={!REVIEWS_ENABLE_IMAGES}>Texto + imagem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Products */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Produtos</Label>
              <Select value={genProductScope} onValueChange={setGenProductScope}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { v: "10", l: "10 produtos" },
                    { v: "50", l: "50 produtos" },
                    { v: "100", l: "100 produtos" },
                    { v: "200", l: "200 produtos" },
                    { v: "500", l: "500 produtos" },
                    { v: "0", l: "Catálogo inteiro" },
                  ].map((o) => (
                    <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reviews per product */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Reviews/produto</Label>
              <Select value={genCountPer} onValueChange={setGenCountPer}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 review</SelectItem>
                  <SelectItem value="3">3 reviews</SelectItem>
                  <SelectItem value="5">5 reviews</SelectItem>
                  <SelectItem value="10">10 reviews</SelectItem>
                  <SelectItem value="auto">Automático (inteligente)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Button */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground invisible">Ação</Label>
              <Button onClick={handleGenerate} disabled={generating} className="w-full h-9 gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Gerar com IA
              </Button>
            </div>
          </div>

          {genCountPer === "auto" && (
            <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
              ⚡ Modo automático: popular = 80-150 reviews • médio = 30-80 • comum = 10-30 • Max 150/produto
            </p>
          )}

          {/* Progress */}
          {generating && genProgress && (
            <div className="space-y-2 bg-muted/30 rounded-xl p-4">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Processando catálogo…</span>
                <span>{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-2.5" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                <span>Produtos: <strong className="text-foreground">{genProgress.processed} / {genProgress.total}</strong></span>
                <span>Reviews: <strong className="text-foreground">{genProgress.created}</strong></span>
                <span>Imagens: <strong className="text-foreground">{genProgress.images}</strong></span>
                <span>Restantes: <strong className="text-foreground">{Math.max(0, genProgress.total - genProgress.processed)}</strong></span>
              </div>
            </div>
          )}
          {generating && !genProgress && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground animate-pulse">Analisando catálogo…</p>
              <Progress className="h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== Image Pool Section ====== */}
      {REVIEWS_ENABLE_IMAGES && (
        <Card className="rounded-2xl border border-purple-200/50 dark:border-purple-800/30">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-purple-100 dark:bg-purple-900/30 p-2.5">
                  <Camera className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Pool de imagens de reviews</p>
                  <p className="text-xs text-muted-foreground">
                    Total: <strong>{poolStats.total_images}</strong> imagens em <strong>{poolStats.products_with_pool}</strong> produtos.
                  </p>
                </div>
              </div>
              <Button
                onClick={searchReviewImagesBatch}
                disabled={searchingImages}
                variant="outline"
                size="sm"
                className="gap-2 ml-auto"
              >
                {searchingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Buscar imagens reais
              </Button>
            </div>
            {searchingImages && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground animate-pulse">Buscando imagens reais…</p>
                <Progress className="h-1.5 mt-1" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ====== Daily Reviews Engine ====== */}
      <Card className="rounded-2xl border border-amber-200/50 dark:border-amber-800/30">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-100 dark:bg-amber-900/30 p-2.5">
                <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Engine de Reviews Diárias</p>
                <p className="text-xs text-muted-foreground">
                  Gera automaticamente todos os dias com distribuição natural.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              {dailyConfig && (
                <div className="flex items-center gap-2">
                  <Switch checked={dailyConfig.enabled} onCheckedChange={toggleDailyEngine} />
                  <Label className="text-xs font-medium">{dailyConfig.enabled ? "Ativa" : "Inativa"}</Label>
                </div>
              )}
              <Button onClick={runDailyNow} disabled={dailyRunning || !dailyConfig?.enabled} size="sm" variant="outline" className="gap-1.5">
                {dailyRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Executar agora
              </Button>
            </div>
          </div>

          {dailyConfig && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { field: "min_reviews_per_day", label: "Min/dia", min: 1, max: 100 },
                { field: "max_reviews_per_day", label: "Max/dia", min: 1, max: 100 },
                { field: "max_reviews_per_product", label: "Max/produto", min: 1, max: 10 },
                { field: "start_hour", label: "Início (hora)", min: 0, max: 23 },
                { field: "end_hour", label: "Fim (hora)", min: 1, max: 23 },
              ].map((cfg) => (
                <div key={cfg.field} className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">{cfg.label}</Label>
                  <Input
                    type="number"
                    value={(dailyConfig as any)[cfg.field]}
                    min={cfg.min}
                    max={cfg.max}
                    onChange={(e) => updateDailyConfig(cfg.field, Number(e.target.value))}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          {dailyRuns.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap border-t pt-3">
              <span className="font-medium text-foreground">Última:</span>
              <span>{new Date(dailyRuns[0].created_at).toLocaleString("pt-BR")}</span>
              <Badge variant="outline" className="text-[10px]">{dailyRuns[0].reviews_generated} reviews</Badge>
              <Badge variant="outline" className="text-[10px]">{dailyRuns[0].products_covered} produtos</Badge>
            </div>
          )}

          <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => setShowDailyHistory(!showDailyHistory)}>
            <History className="h-3.5 w-3.5" />
            Histórico ({dailyRuns.length})
            {showDailyHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>

          {showDailyHistory && dailyRuns.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 font-medium">Data</th>
                    <th className="text-right p-2 font-medium">Meta</th>
                    <th className="text-right p-2 font-medium">Reviews</th>
                    <th className="text-right p-2 font-medium">Produtos</th>
                    <th className="text-left p-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRuns.map((run) => (
                    <tr key={run.id} className="border-t">
                      <td className="p-2">{new Date(run.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="p-2 text-right">{run.target_count}</td>
                      <td className="p-2 text-right font-medium">{run.reviews_generated}</td>
                      <td className="p-2 text-right">{run.products_covered}</td>
                      <td className="p-2">
                        <Badge variant={run.status === "completed" ? "default" : "destructive"} className="text-[10px]">{run.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== Search + Filters ====== */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por conteúdo, autor ou produto..." className="pl-9" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(["pending", "approved", ...(REVIEWS_ENABLE_IMAGES ? ["with_image" as const] : []), "all"] as const).map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" className="text-xs gap-1" onClick={() => { setFilter(f as any); setVisibleCount(40); }}>
              {f === "with_image" && <ImageIcon className="h-3 w-3" />}
              {f === "pending" ? `Pendentes (${pendingCount})` : f === "approved" ? `Aprovadas (${approvedCount})` : f === "with_image" ? `Com imagem (${reviewsWithImagesCount})` : `Todas (${reviews.length})`}
            </Button>
          ))}
        </div>
      </div>

      {/* ====== Bulk Actions ====== */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border">
          <span className="text-sm font-medium">{selected.size} selecionadas</span>
          <Button size="sm" className="gap-1.5" onClick={() => batchAction("approve")} disabled={actionLoading}>
            {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} Aprovar
          </Button>
          <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => batchAction("reject")} disabled={actionLoading}>
            {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Remover
          </Button>
        </div>
      )}

      {/* ====== Reviews List ====== */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma avaliação encontrada</p>
          <p className="text-xs mt-1">Use o gerador de IA acima para criar avaliações.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={selectAll}>
              <Checkbox checked={selected.size === filtered.length && filtered.length > 0} className="h-3.5 w-3.5 pointer-events-none" />
              {selected.size === filtered.length ? "Desmarcar" : "Selecionar"} todas
            </Button>
            <span className="text-xs text-muted-foreground">{filtered.length} resultados</span>
          </div>

          {visibleFiltered.map((r) => (
            <Card
              key={r.id}
              className={`rounded-xl transition-all cursor-pointer ${selected.has(r.id) ? "ring-2 ring-primary bg-primary/5" : "hover:shadow-md"}`}
              onClick={() => toggleSelect(r.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox checked={selected.has(r.id)} className="mt-1 pointer-events-none" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div className="flex">{stars(r.rating)}</div>
                      <Badge variant={r.approved ? "default" : "secondary"} className="text-[10px]">
                        {r.approved ? "Aprovada" : "Pendente"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        {r.origin === "ai_generated" ? <Sparkles className="h-2.5 w-2.5" /> : <FileText className="h-2.5 w-2.5" />}
                        {r.origin === "ai_generated" ? "IA" : r.origin}
                      </Badge>
                      {REVIEWS_ENABLE_IMAGES && reviewImageIds.has(r.id) && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-purple-300 text-purple-600">
                          <ImageIcon className="h-2.5 w-2.5" /> Imagem
                        </Badge>
                      )}
                    </div>
                    {r.title && <p className="font-semibold text-sm">{r.title}</p>}
                    <p className="text-sm text-muted-foreground line-clamp-2">{r.content}</p>
                    {/* Image thumbnails */}
                    {REVIEWS_ENABLE_IMAGES && reviewImageMap.has(r.id) && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {(reviewImageMap.get(r.id) ?? []).map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Review image ${idx + 1}`}
                            className="w-[120px] h-[120px] object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); setLightboxUrl(url); }}
                          />
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="font-medium text-foreground">{r.author_name}</span>
                      {r.author_location && <span>• {r.author_location}</span>}
                      <span>• {r.product_name}</span>
                      <span>• {new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                    {(r.pros || r.cons) && (
                      <div className="flex gap-4 mt-2 text-xs flex-wrap">
                        {r.pros && <span className="text-green-600">✓ {r.pros}</span>}
                        {r.cons && <span className="text-red-500">✗ {r.cons}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {visibleCount < filtered.length && (
            <div className="text-center pt-2">
              <Button variant="outline" size="sm" onClick={() => setVisibleCount((c) => c + 40)}>
                <ChevronDown className="h-4 w-4 mr-1" />
                Carregar mais ({filtered.length - visibleCount} restantes)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ====== Activity Logs ====== */}
      <Card className="rounded-2xl">
        <CardHeader className="cursor-pointer" onClick={() => setShowLogs(!showLogs)}>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            Logs de Atividade
            {showLogs ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </CardTitle>
        </CardHeader>
        {showLogs && (
          <CardContent className="pt-0 space-y-2 max-h-80 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum log registrado</p>
            ) : logs.map((l) => (
              <div key={l.id} className="flex items-start gap-2 text-xs border-b pb-2 last:border-0">
                <Badge variant={l.level === "error" ? "destructive" : l.level === "warning" ? "secondary" : "outline"} className="text-[10px] shrink-0">
                  {l.level}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{l.message}</p>
                  <p className="text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</p>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* ====== Image Lightbox ====== */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl p-2 bg-background/95 backdrop-blur">
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Review image enlarged"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
