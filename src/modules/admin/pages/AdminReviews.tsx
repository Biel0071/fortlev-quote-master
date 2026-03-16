import { useCallback, useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  BarChart3, CheckCircle, Clock, Loader2, MessageSquare, RefreshCw,
  Search, Sparkles, Star, TrendingUp, Trash2, XCircle, Calendar,
  Image as ImageIcon, FileText, Eye, ChevronDown, ChevronUp,
} from "lucide-react";

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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewImageIds, setReviewImageIds] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "with_image">("pending");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [genCount, setGenCount] = useState(5);
  const [genProductCount, setGenProductCount] = useState(10);
  const [genMode, setGenMode] = useState<"text" | "image" | "ai">("text");
  const [showLogs, setShowLogs] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);
  const [totalProducts, setTotalProducts] = useState(0);
  const [reviewsWithImagesCount, setReviewsWithImagesCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  /* ---------- data loading ---------- */
  const load = useCallback(async () => {
    setLoading(true);
    const [reviewsRes, logsRes, productsRes, imagesRes] = await Promise.all([
      cloud.from("product_reviews").select("*, store_products(name)").order("created_at", { ascending: false }).limit(1000),
      cloud.from("system_event_logs").select("*").eq("source", "review-system").order("created_at", { ascending: false }).limit(50),
      cloud.from("store_products").select("id", { count: "exact", head: true }).eq("active", true).eq("status", "published"),
      cloud.from("review_images").select("review_id"),
    ]);

    if (reviewsRes.error) toast({ title: "Erro", description: reviewsRes.error.message, variant: "destructive" });

    const mapped = ((reviewsRes.data ?? []) as any[]).map((r) => ({
      ...r,
      product_name: r.store_products?.name ?? "—",
    }));
    setReviews(mapped);
    setLogs((logsRes.data ?? []) as LogEntry[]);
    setTotalProducts(productsRes.count ?? 0);

    const imgIds = new Set((imagesRes.data ?? []).map((i: any) => i.review_id as string));
    setReviewImageIds(imgIds);
    setReviewsWithImagesCount(imgIds.size);

    setSelected(new Set());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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

  const generateBatch = async () => {
    setGenerating(true);
    try {
      const { data: products } = await cloud
        .from("store_products")
        .select("id")
        .eq("active", true)
        .eq("status", "published")
        .limit(genProductCount);

      if (!products?.length) {
        toast({ title: "Nenhum produto ativo encontrado", variant: "destructive" });
        setGenerating(false);
        return;
      }

      const productIds = products.map((p: any) => p.id);
      const { data, error } = await cloud.functions.invoke("generate-reviews", {
        body: { action: "generate", product_ids: productIds, count: genCount, mode: genMode },
      });

      if (error) throw error;
      const results = (data as any)?.results ?? [];
      const total = results.reduce((sum: number, r: any) => sum + (r.reviews_created ?? 0), 0);
      const totalImgs = results.reduce((sum: number, r: any) => sum + (r.images_attached ?? 0), 0);
      const errors = results.filter((r: any) => r.error).length;

      toast({
        title: "Geração concluída",
        description: `${total} avaliações (${totalImgs} com imagem) para ${productIds.length} produtos${errors ? ` (${errors} erros)` : ""}.`,
      });
      await load();
    } catch (e: any) {
      toast({ title: "Erro na geração", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const stars = (n: number) => Array.from({ length: 5 }, (_, i) => (
    <Star key={i} className={`h-3.5 w-3.5 ${i < n ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
  ));

  const visibleFiltered = filtered.slice(0, visibleCount);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Avaliações Inteligentes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie e gere avaliações de produtos com IA — sistema automatizado.
        </p>
      </div>

      {/* ====== Dashboard Metrics ====== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Total", value: reviews.length, icon: MessageSquare, color: "text-primary" },
          { label: "Hoje", value: todayCount, icon: Calendar, color: "text-blue-500" },
          { label: "Semana", value: weekCount, icon: TrendingUp, color: "text-emerald-500" },
          { label: "Pendentes", value: pendingCount, icon: Clock, color: "text-yellow-600" },
          { label: "Aprovadas", value: approvedCount, icon: CheckCircle, color: "text-green-600" },
          { label: "Com imagem", value: reviewsWithImagesCount, icon: ImageIcon, color: "text-purple-500" },
          { label: "Nota média", value: avgRating, icon: Star, color: "text-yellow-500" },
        ].map((m) => (
          <Card key={m.label} className="rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
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

      {/* Coverage + Rating distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Cobertura de Produtos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{coveragePercent}%</span>
              <span className="text-xs text-muted-foreground">
                {productsWithReviews} de {totalProducts} produtos com avaliações
              </span>
            </div>
            <Progress value={coveragePercent} className="h-2" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" /> Distribuição de Notas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((n) => {
              const count = ratingDistribution[n - 1];
              const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
              return (
                <div key={n} className="flex items-center gap-2 text-xs">
                  <span className="w-4 text-right font-medium">{n}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-12 text-right text-muted-foreground">{count} ({pct}%)</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* ====== Generate Section ====== */}
      <Card className="rounded-2xl border-dashed border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Gerar avaliações com IA</p>
                <p className="text-xs text-muted-foreground">Selecione quantidade de produtos e reviews por produto</p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <Select value={genMode} onValueChange={(v) => setGenMode(v as any)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Apenas texto</SelectItem>
                  <SelectItem value="image">Texto + imagem real</SelectItem>
                  <SelectItem value="ai">Apenas IA (texto)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(genProductCount)} onValueChange={(v) => setGenProductCount(Number(v))}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} produtos</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(genCount)} onValueChange={(v) => setGenCount(Number(v))}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 5, 8].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} reviews</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={generateBatch} disabled={generating} className="gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Gerar
              </Button>
            </div>
          </div>
          {generating && (
            <div className="mt-4 space-y-1.5">
              <p className="text-xs text-muted-foreground animate-pulse">
                Gerando avaliações com IA para {genProductCount} produtos ({genCount} cada)…
              </p>
              <Progress className="h-1.5" />
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
          {(["pending", "approved", "with_image", "all"] as const).map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" className="text-xs gap-1" onClick={() => { setFilter(f); setVisibleCount(40); }}>
              {f === "with_image" && <ImageIcon className="h-3 w-3" />}
              {f === "pending" ? `Pendentes (${pendingCount})` : f === "approved" ? `Aprovadas (${approvedCount})` : f === "with_image" ? `Com imagem (${reviewsWithImagesCount})` : `Todas (${reviews.length})`}
            </Button>
          ))}
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
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
                    </div>
                    {r.title && <p className="font-semibold text-sm">{r.title}</p>}
                    <p className="text-sm text-muted-foreground line-clamp-2">{r.content}</p>
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
    </div>
  );
}
