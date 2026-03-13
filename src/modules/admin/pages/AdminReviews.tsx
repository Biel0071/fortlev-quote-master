import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  CheckCircle, Loader2, MessageSquare, RefreshCw, Search, Sparkles,
  Star, ThumbsDown, Trash2, XCircle,
} from "lucide-react";

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

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [genCount, setGenCount] = useState(5);
  const [genProductCount, setGenProductCount] = useState(10);

  const load = async () => {
    setLoading(true);
    const { data, error } = await cloud
      .from("product_reviews")
      .select("*, store_products(name)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
    const mapped = ((data ?? []) as any[]).map((r) => ({
      ...r,
      product_name: r.store_products?.name ?? "—",
    }));
    setReviews(mapped);
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let result = reviews;
    if (filter === "pending") result = result.filter((r) => !r.approved);
    if (filter === "approved") result = result.filter((r) => r.approved);
    const s = q.trim().toLowerCase();
    if (s) result = result.filter((r) =>
      r.content.toLowerCase().includes(s) ||
      r.author_name.toLowerCase().includes(s) ||
      (r.product_name ?? "").toLowerCase().includes(s)
    );
    return result;
  }, [reviews, filter, q]);

  const pendingCount = reviews.filter((r) => !r.approved).length;
  const approvedCount = reviews.filter((r) => r.approved).length;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  };

  const approveSelected = async () => {
    if (!selected.size) return;
    const ids = [...selected];
    const { data, error } = await cloud.functions.invoke("generate-reviews", {
      body: { action: "approve", review_ids: ids },
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Aprovadas", description: `${ids.length} avaliações aprovadas.` });
    await load();
  };

  const rejectSelected = async () => {
    if (!selected.size) return;
    const ids = [...selected];
    const { data, error } = await cloud.functions.invoke("generate-reviews", {
      body: { action: "reject", review_ids: ids },
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Removidas", description: `${ids.length} avaliações removidas.` });
    await load();
  };

  const generateBatch = async () => {
    setGenerating(true);
    try {
      // Get random active products
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
        body: { action: "generate", product_ids: productIds, count: genCount },
      });

      if (error) throw error;
      const results = (data as any)?.results ?? [];
      const total = results.reduce((sum: number, r: any) => sum + (r.reviews_created ?? 0), 0);
      const errors = results.filter((r: any) => r.error).length;

      toast({
        title: "Geração concluída",
        description: `${total} avaliações geradas para ${productIds.length} produtos${errors ? ` (${errors} erros)` : ""}.`,
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Avaliações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie e gere avaliações de produtos com IA.
          </p>
        </div>
      </div>

      {/* Generate section */}
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
            <div className="flex items-center gap-2 ml-auto">
              <Select value={String(genProductCount)} onValueChange={(v) => setGenProductCount(Number(v))}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50].map((n) => (
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
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{reviews.length}</span> total
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-yellow-500/10 rounded-lg px-3 py-1.5">
          <XCircle className="h-3.5 w-3.5 text-yellow-600" />
          <span className="font-medium text-foreground">{pendingCount}</span> pendentes
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-green-500/10 rounded-lg px-3 py-1.5">
          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
          <span className="font-medium text-foreground">{approvedCount}</span> aprovadas
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar avaliações..." className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          {(["pending", "approved", "all"] as const).map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setFilter(f)}>
              {f === "pending" ? `Pendentes (${pendingCount})` : f === "approved" ? `Aprovadas (${approvedCount})` : `Todas (${reviews.length})`}
            </Button>
          ))}
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border">
          <span className="text-sm font-medium">{selected.size} selecionadas</span>
          <Button size="sm" className="gap-1.5" onClick={approveSelected}>
            <CheckCircle className="h-3.5 w-3.5" /> Aprovar
          </Button>
          <Button size="sm" variant="destructive" className="gap-1.5" onClick={rejectSelected}>
            <Trash2 className="h-3.5 w-3.5" /> Remover
          </Button>
        </div>
      )}

      {/* Reviews list */}
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
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={selectAll}>
            <Checkbox checked={selected.size === filtered.length && filtered.length > 0} className="h-3.5 w-3.5 pointer-events-none" />
            {selected.size === filtered.length ? "Desmarcar" : "Selecionar"} todas
          </Button>
          {filtered.map((r) => (
            <Card
              key={r.id}
              className={`rounded-xl transition-all cursor-pointer ${selected.has(r.id) ? "ring-2 ring-primary bg-primary/5" : "hover:shadow-md"}`}
              onClick={() => toggleSelect(r.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox checked={selected.has(r.id)} className="mt-1 pointer-events-none" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex">{stars(r.rating)}</div>
                      <Badge variant={r.approved ? "default" : "secondary"} className="text-[10px]">
                        {r.approved ? "Aprovada" : "Pendente"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{r.origin}</span>
                    </div>
                    {r.title && <p className="font-semibold text-sm">{r.title}</p>}
                    <p className="text-sm text-muted-foreground line-clamp-2">{r.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{r.author_name}</span>
                      {r.author_location && <span>• {r.author_location}</span>}
                      <span>• {r.product_name}</span>
                    </div>
                    {(r.pros || r.cons) && (
                      <div className="flex gap-4 mt-2 text-xs">
                        {r.pros && <span className="text-green-600">✓ {r.pros}</span>}
                        {r.cons && <span className="text-red-500">✗ {r.cons}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
