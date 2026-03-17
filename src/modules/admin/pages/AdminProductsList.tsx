import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/formatters";
import {
  ArrowUp, Brain, CheckCircle, ChevronDown, ChevronUp, Copy, DollarSign, Download, Globe, Grid2x2, Grid3x3,
  ImagePlus, LayoutGrid, Loader2, MoreHorizontal, Package, Pencil, Play, Plus, Power,
  RefreshCw, Search, Trash2, Upload, XCircle, AlertTriangle, Eye, EyeOff,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { toast as sonnerToast } from "sonner";

type Row = {
  id: string;
  name: string;
  sku?: string | null;
  price: number;
  promo_price: number;
  stock: number;
  active: boolean;
  status?: string | null;
  category?: string | null;
  category_id?: string | null;
};

type Category = { id: string; name: string; slug: string };
type GridSize = "sm" | "md" | "lg";

const GRID_COLS: Record<GridSize, string> = {
  sm: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
  md: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  lg: "grid-cols-1 sm:grid-cols-2",
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getImageUrl(path: string) {
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}

// Debounce hook
function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function AdminProductsList() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [gridSize, setGridSize] = useState<GridSize>("md");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [batchAction, setBatchAction] = useState<string | null>(null);

  // Bulk action confirmation
  const [bulkConfirm, setBulkConfirm] = useState<{ action: "activate" | "deactivate" | "delete"; count: number } | null>(null);

  const [batchRunning, setBatchRunning] = useState(false);
  const [batchDone, setBatchDone] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const cancelRef = useRef(false);
  const runningRef = useRef(false);
  const [priceReport, setPriceReport] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const PAGE_SIZE = 1000;
    let allRows: Row[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await cloud
        .from("store_products")
        .select("id, name, sku, price, promo_price, stock, active, status, category, category_id")
        .order("name", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        break;
      }
      const batch = (data ?? []) as Row[];
      allRows = [...allRows, ...batch];
      hasMore = batch.length === PAGE_SIZE;
      from += PAGE_SIZE;
    }

    setRows(allRows);
    setLoading(false);

    // Load first image for each product
    const imgMap: Record<string, string> = {};
    const IMG_PAGE = 1000;
    let imgFrom = 0;
    let imgMore = true;
    while (imgMore) {
      const { data: imgs } = await cloud
        .from("store_product_images")
        .select("product_id, path")
        .order("sort_order", { ascending: true })
        .range(imgFrom, imgFrom + IMG_PAGE - 1);
      if (!imgs || imgs.length === 0) break;
      for (const img of imgs as any[]) {
        if (!imgMap[img.product_id]) imgMap[img.product_id] = img.path;
      }
      imgMore = imgs.length === IMG_PAGE;
      imgFrom += IMG_PAGE;
    }
    setImageMap(imgMap);
  };

  const loadCategories = async () => {
    const { data } = await cloud
      .from("store_categories")
      .select("id, name, slug")
      .order("name", { ascending: true });
    setCategories((data ?? []) as Category[]);
  };

  useEffect(() => { load(); loadCategories(); }, []);

  const runBatchAction = async (action: "validate_prices" | "download_images" | "both") => {
    setBatchAction(action);
    try {
      const { data, error } = await cloud.functions.invoke("batch-product-ops", { body: { action } });
      if (error) throw error;
      if (action === "validate_prices" || action === "both") {
        const report = action === "both" ? data?.prices : data;
        setPriceReport(report);
        sonnerToast.success(`Preços: ${report?.corrected ?? 0} corrigidos, ${report?.promo_fixed ?? 0} promos ajustados`);
      }
      if (action === "download_images") {
        sonnerToast.success(`Imagens: ${data.success ?? 0} baixadas`);
      }
      await load();
    } catch (e) {
      sonnerToast.error("Erro ao executar operação");
      console.error(e);
    }
    setBatchAction(null);
  };

  const [visibleCount, setVisibleCount] = useState(60);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Reset visible count when filter changes
  useEffect(() => { setVisibleCount(60); }, [debouncedQ, filterActive, filterCategory]);

  // Scroll-to-top visibility
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const filtered = useMemo(() => {
    let result = rows;
    if (filterActive === "active") result = result.filter(r => r.active);
    if (filterActive === "inactive") result = result.filter(r => !r.active);
    if (filterCategory !== "all") {
      result = result.filter(r => r.category_id === filterCategory || r.category === filterCategory);
    }
    const s = debouncedQ.trim().toLowerCase();
    if (s) {
      result = result.filter(r =>
        r.name.toLowerCase().includes(s) ||
        (r.sku && r.sku.toLowerCase().includes(s)) ||
        (r.category && r.category.toLowerCase().includes(s)) ||
        String(r.price).includes(s)
      );
    }
    return result;
  }, [debouncedQ, rows, filterActive, filterCategory]);

  const visibleItems = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const activeCount = rows.filter(r => r.active).length;
  const inactiveCount = rows.length - activeCount;

  // Stats
  const suspiciousCount = useMemo(() => {
    return rows.filter(r => r.price <= 0 || r.price > 100000).length;
  }, [rows]);

  const noImageCount = useMemo(() => {
    return rows.filter(r => r.status === "no_image_found").length;
  }, [rows]);

  const reprocessNoImage = async () => {
    const ids = rows.filter(r => r.status === "no_image_found").map(r => r.id);
    if (ids.length === 0) return;
    // Optimistic
    setRows(prev => prev.map(r => r.status === "no_image_found" ? { ...r, active: true, status: "import_pending" } : r));
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      await cloud.from("store_products").update({ active: true, status: "import_pending" } as any).in("id", batch);
    }
    toast({ title: "Reprocessamento agendado", description: `${ids.length} produtos reativados para nova importação.` });
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      const cat = r.category_id || r.category || "sem_categoria";
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(r => r.id)));
    }
  };

  const selectAllCategory = () => {
    if (filterCategory === "all") return;
    const catProducts = rows.filter(r => r.category_id === filterCategory || r.category === filterCategory);
    setSelected(new Set(catProducts.map(r => r.id)));
  };

  const toggleActive = async (p: Row) => {
    // Optimistic update
    setRows(prev => prev.map(r => r.id === p.id ? { ...r, active: !r.active } : r));
    const { error } = await cloud.from("store_products").update({ active: !p.active } as any).eq("id", p.id);
    if (error) {
      // Rollback
      setRows(prev => prev.map(r => r.id === p.id ? { ...r, active: p.active } : r));
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: p.active ? "Desativado" : "Ativado", description: p.name });
  };

  // Bulk actions
  const bulkActivate = async () => {
    const ids = Array.from(selected);
    // Optimistic
    setRows(prev => prev.map(r => ids.includes(r.id) ? { ...r, active: true } : r));
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      await cloud.from("store_products").update({ active: true } as any).in("id", batch);
    }
    toast({ title: "Ativados", description: `${ids.length} produtos ativados.` });
    setSelected(new Set());
    setBulkConfirm(null);
  };

  const bulkDeactivate = async () => {
    const ids = Array.from(selected);
    setRows(prev => prev.map(r => ids.includes(r.id) ? { ...r, active: false } : r));
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      await cloud.from("store_products").update({ active: false } as any).in("id", batch);
    }
    toast({ title: "Desativados", description: `${ids.length} produtos desativados.` });
    setSelected(new Set());
    setBulkConfirm(null);
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      await cloud.from("store_product_images").delete().in("product_id", batch);
      await cloud.from("store_products").delete().in("id", batch);
    }
    setRows(prev => prev.filter(r => !ids.includes(r.id)));
    toast({ title: "Excluídos", description: `${ids.length} produtos removidos.` });
    setSelected(new Set());
    setBulkConfirm(null);
  };

  const duplicateProduct = async (p: Row) => {
    const { data: original, error: fetchErr } = await cloud.from("store_products").select("*").eq("id", p.id).single();
    if (fetchErr || !original) { toast({ title: "Erro ao duplicar", description: fetchErr?.message ?? "Não encontrado", variant: "destructive" }); return; }
    const { id, created_at, updated_at, views, clicks, sales, source_id, sku, ...rest } = original as any;
    const { data: newProd, error: insertErr } = await cloud
      .from("store_products")
      .insert({ ...rest, name: `${rest.name} (cópia)`, active: false, status: "draft", source_id: null, sku: null } as any)
      .select("id, name, sku, price, promo_price, stock, active, category, category_id")
      .single();
    if (insertErr) { toast({ title: "Erro ao duplicar", description: insertErr.message, variant: "destructive" }); return; }
    if (newProd) {
      toast({ title: "Duplicado", description: `${(newProd as any).name} criado como rascunho.` });
      setRows(prev => [...prev, newProd as any]);
    }
  };

  const deleteProduct = async () => {
    if (!deleteTarget) return;
    await cloud.from("store_product_images").delete().eq("product_id", deleteTarget.id);
    const { error } = await cloud.from("store_products").delete().eq("id", deleteTarget.id);
    if (error) { toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Excluído", description: deleteTarget.name });
    setRows(prev => prev.filter(r => r.id !== deleteTarget.id));
    setSelected(prev => { const n = new Set(prev); n.delete(deleteTarget.id); return n; });
    setDeleteTarget(null);
  };

  const startBatch = async () => {
    if (runningRef.current) return;
    const activeIds = rows.filter(r => r.active).map(r => r.id);
    runningRef.current = true;
    cancelRef.current = false;
    setBatchRunning(true);
    setBatchDone(0);
    setBatchTotal(activeIds.length);
    if (activeIds.length === 0) {
      toast({ title: "Nada para fazer", description: "Nenhum produto ativo encontrado." });
      setBatchRunning(false);
      runningRef.current = false;
      return;
    }
    let done = 0;
    for (const productId of activeIds) {
      if (cancelRef.current) break;
      await cloud.functions.invoke("generate-product-images", { body: { productId, overwrite: true, count: 5 } });
      done += 1;
      setBatchDone(done);
      await new Promise(r => setTimeout(r, 800));
    }
    setBatchRunning(false);
    runningRef.current = false;
    toast({ title: cancelRef.current ? "Interrompido" : "Concluído", description: `${done}/${activeIds.length} produtos.` });
    await load();
  };

  const exportExcel = async () => {
    toast({ title: "Exportando…" });
    const PAGE_SIZE = 1000;
    let allData: any[] = [];
    let from = 0;
    let hasMoreData = true;
    while (hasMoreData) {
      const { data, error } = await cloud
        .from("store_products")
        .select("id, name, sku, category, category_id, unit, price, promo_price, stock, min_stock, active, status, views, clicks, sales, created_at, store_categories(name)")
        .order("name", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      const batch = data ?? [];
      allData = [...allData, ...batch];
      hasMoreData = batch.length === PAGE_SIZE;
      from += PAGE_SIZE;
    }
    const data = allData;
    if (data.length === 0) { toast({ title: "Sem dados", variant: "destructive" }); return; }
    const header = ["ID","Nome","SKU","Categoria","Unidade","Preço","Preço Promo","Estoque","Estoque Mín","Ativo","Status","Views","Clicks","Vendas","Criado em"];
    const escape = (v: unknown) => { const s = String(v ?? ""); return s.includes(";") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; };
    const csvRows = [header.join(";")];
    for (const r of data as any[]) {
      const catName = r.store_categories?.name ?? r.category ?? "";
      csvRows.push([r.id, r.name, r.sku ?? "", catName, r.unit ?? "", String(r.price).replace(".", ","), String(r.promo_price ?? 0).replace(".", ","), r.stock, r.min_stock ?? 0, r.active ? "Sim" : "Não", r.status, r.views, r.clicks, r.sales, r.created_at].map(escape).join(";"));
    }
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `produtos-loja-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exportado!", description: `${data.length} produtos.` });
  };

  const displayPrice = (p: Row) => p.promo_price > 0 ? formatCurrency(Number(p.promo_price)) : formatCurrency(Number(p.price));
  const hasPromo = (p: Row) => p.promo_price > 0;

  const isCompact = gridSize === "sm";

  const getCategoryName = (p: Row) => {
    if (p.category_id) {
      const cat = categories.find(c => c.id === p.category_id);
      return cat?.name || p.category || null;
    }
    return p.category || null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie catálogo, preços, estoque e status.
          </p>
        </div>
        <Button onClick={() => nav("/admin/produtos/novo")} className="gap-2">
          <Plus className="h-4 w-4" /> Novo produto
        </Button>
      </div>

      {/* Stats panel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{activeCount}</p>
              <p className="text-[10px] text-muted-foreground">Produtos ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <EyeOff className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xl font-bold">{inactiveCount}</p>
              <p className="text-[10px] text-muted-foreground">Inativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{suspiciousCount}</p>
              <p className="text-[10px] text-muted-foreground">Preço suspeito</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <LayoutGrid className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{categories.length}</p>
              <p className="text-[10px] text-muted-foreground">Categorias</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportExcel} disabled={rows.length === 0}>
          <Download className="h-3.5 w-3.5" /> Exportar
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => nav("/admin/produtos/importar")}>
          <Upload className="h-3.5 w-3.5" /> Importar
        </Button>
        <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant={toolsOpen ? "default" : "outline"} size="sm" className="gap-1.5 text-xs">
              <Brain className="h-3.5 w-3.5" /> Ferramentas IA
              {toolsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      </div>

      {/* Orchestrator Panel */}
      <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
        <CollapsibleContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-xl border bg-card/80 backdrop-blur-sm">
            <Card className="border-primary/10 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => nav("/admin/produtos/scraper")}>
              <CardContent className="p-4 text-center space-y-2">
                <Globe className="h-8 w-8 mx-auto text-primary" />
                <h4 className="font-semibold text-sm">Scraper</h4>
                <p className="text-[10px] text-muted-foreground leading-tight">Captura produtos de sites concorrentes</p>
              </CardContent>
            </Card>
            <Card className="border-primary/10 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => nav("/admin/produtos/imagens")}>
              <CardContent className="p-4 text-center space-y-2">
                <ImagePlus className="h-8 w-8 mx-auto text-primary" />
                <h4 className="font-semibold text-sm">Imagens</h4>
                <p className="text-[10px] text-muted-foreground leading-tight">Busca e baixa imagens automaticamente</p>
              </CardContent>
            </Card>
            <Card className="border-primary/10 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => nav("/admin/produtos/inteligencia-preco")}>
              <CardContent className="p-4 text-center space-y-2">
                <DollarSign className="h-8 w-8 mx-auto text-primary" />
                <h4 className="font-semibold text-sm">Preços</h4>
                <p className="text-[10px] text-muted-foreground leading-tight">Valida e corrige preços por faixa de mercado</p>
              </CardContent>
            </Card>
            <Card className="border-primary/10 hover:border-primary/30 transition-colors">
              <CardContent className="p-4 text-center space-y-2">
                <DollarSign className="h-8 w-8 mx-auto text-primary" />
                <h4 className="font-semibold text-sm">Validar Preços</h4>
                <p className="text-[10px] text-muted-foreground leading-tight">Corrige preços em lote automaticamente</p>
                <Button size="sm" className="w-full text-xs gap-1" disabled={batchAction !== null} onClick={() => runBatchAction("validate_prices")}>
                  {batchAction === "validate_prices" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                  Executar
                </Button>
              </CardContent>
            </Card>
            <Card className="border-primary/10 hover:border-primary/30 transition-colors">
              <CardContent className="p-4 text-center space-y-2">
                <div className="flex justify-center gap-0.5">
                  <DollarSign className="h-6 w-6 text-primary" />
                  <ImagePlus className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold text-sm">Executar Tudo</h4>
                <p className="text-[10px] text-muted-foreground leading-tight">Valida preços + baixa imagens em sequência</p>
                <Button size="sm" className="w-full text-xs gap-1" disabled={batchAction !== null} onClick={() => runBatchAction("both")}>
                  {batchAction === "both" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                  Executar Tudo
                </Button>
              </CardContent>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Bulk selection bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border bg-primary/5 border-primary/20">
          <Badge variant="default" className="text-sm px-3 py-1">{selected.size} selecionados</Badge>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setBulkConfirm({ action: "activate", count: selected.size })}>
            <Eye className="h-3.5 w-3.5" /> Ativar
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setBulkConfirm({ action: "deactivate", count: selected.size })}>
            <EyeOff className="h-3.5 w-3.5" /> Desativar
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs text-destructive hover:text-destructive" onClick={() => setBulkConfirm({ action: "delete", count: selected.size })}>
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </Button>
          <Button size="sm" variant="ghost" className="text-xs ml-auto" onClick={() => setSelected(new Set())}>
            Limpar seleção
          </Button>
        </div>
      )}

      {/* Batch progress */}
      {batchRunning && (
        <div className="rounded-xl border bg-card/80 backdrop-blur-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium text-sm">Gerando imagens…</p>
              <p className="text-xs text-muted-foreground">{batchDone}/{batchTotal} processados</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { cancelRef.current = true; }}>Parar</Button>
        </div>
      )}

      {/* Search + Filters + Grid Size */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome, SKU, categoria ou preço..." className="pl-9" />
          </div>

          {/* Category filter */}
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} {categoryCounts[c.id] ? `(${categoryCounts[c.id]})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "active", "inactive"] as const).map(f => (
              <Button
                key={f}
                variant={filterActive === f ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setFilterActive(f)}
              >
                {f === "all" ? `Todos (${rows.length})` : f === "active" ? `Ativos (${activeCount})` : `Inativos (${inactiveCount})`}
              </Button>
            ))}
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={load} disabled={loading || batchRunning}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            {filterCategory !== "all" && (
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={selectAllCategory}>
                Selecionar toda categoria
              </Button>
            )}
          </div>

          {/* Grid size + select all */}
          <div className="flex items-center gap-2">
            {filtered.length > 0 && (
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={selectAll}>
                <Checkbox
                  checked={selected.size === filtered.length && filtered.length > 0}
                  className="h-3.5 w-3.5 pointer-events-none"
                />
                {selected.size === filtered.length ? "Desmarcar" : "Selecionar"} todos
              </Button>
            )}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button variant={gridSize === "sm" ? "default" : "ghost"} size="icon" className="h-8 w-8 rounded-none" onClick={() => setGridSize("sm")} title="Grade pequena">
                <Grid3x3 className="h-3.5 w-3.5" />
              </Button>
              <Button variant={gridSize === "md" ? "default" : "ghost"} size="icon" className="h-8 w-8 rounded-none" onClick={() => setGridSize("md")} title="Grade média">
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button variant={gridSize === "lg" ? "default" : "ghost"} size="icon" className="h-8 w-8 rounded-none" onClick={() => setGridSize("lg")} title="Grade grande">
                <Grid2x2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Product grid */}
      {loading ? (
        <div className={`grid ${GRID_COLS[gridSize]} gap-4`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{q ? "Nenhum produto encontrado." : "Nenhum produto cadastrado."}</p>
        </div>
      ) : (
        <>
        <div className={`grid ${GRID_COLS[gridSize]} gap-3`}>
          {visibleItems.map(p => {
            const thumb = imageMap[p.id];
            const isSelected = selected.has(p.id);
            const catName = getCategoryName(p);

            return isCompact ? (
              <div
                key={p.id}
                className={`group relative rounded-xl border bg-card/80 backdrop-blur-sm transition-all hover:shadow-md cursor-pointer ${
                  !p.active ? "opacity-60" : ""
                } ${isSelected ? "ring-2 ring-primary border-primary" : "hover:border-primary/20"}`}
                onClick={() => toggleSelect(p.id)}
              >
                <div className="aspect-square relative overflow-hidden rounded-t-xl bg-muted/20">
                  {thumb ? (
                    <img src={getImageUrl(thumb)} alt={p.name} className="w-full h-full object-contain p-1" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <Checkbox checked={isSelected} className="absolute top-2 left-2 h-4 w-4 bg-background/80" onClick={e => e.stopPropagation()} onCheckedChange={() => toggleSelect(p.id)} />
                  {!p.active && <Badge variant="secondary" className="absolute top-2 right-2 text-[9px] px-1.5 py-0">Inativo</Badge>}
                </div>
                <div className="p-2">
                  <h3 className="text-[11px] font-medium leading-tight line-clamp-2">{p.name}</h3>
                  {catName && <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{catName}</p>}
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs font-bold">{displayPrice(p)}</p>
                    <Switch
                      checked={p.active}
                      onCheckedChange={() => toggleActive(p)}
                      onClick={e => e.stopPropagation()}
                      className="scale-75"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={p.id}
                className={`group relative rounded-xl border bg-card/80 backdrop-blur-sm transition-all hover:shadow-md ${
                  !p.active ? "opacity-60" : ""
                } ${isSelected ? "ring-2 ring-primary border-primary" : "hover:border-primary/20"}`}
              >
                <div className="flex">
                  <div
                    className={`shrink-0 relative overflow-hidden rounded-l-xl bg-muted/20 flex items-center justify-center cursor-pointer ${gridSize === "lg" ? "w-32 h-32" : "w-20 h-20"}`}
                    onClick={() => toggleSelect(p.id)}
                  >
                    {thumb ? (
                      <img src={getImageUrl(thumb)} alt={p.name} className="w-full h-full object-contain p-1" loading="lazy" />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground/30" />
                    )}
                    <Checkbox checked={isSelected} className="absolute top-1.5 left-1.5 h-4 w-4 bg-background/80" onClick={e => e.stopPropagation()} onCheckedChange={() => toggleSelect(p.id)} />
                  </div>
                  <div className="flex-1 min-w-0 p-3 cursor-pointer" onClick={() => nav(`/admin/produtos/editar/${p.id}`)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm leading-tight line-clamp-2">{p.name}</h3>
                        {catName && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{catName}</p>}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => nav(`/admin/produtos/editar/${p.id}`)}><Pencil className="h-3.5 w-3.5 mr-2" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateProduct(p)}><Copy className="h-3.5 w-3.5 mr-2" /> Duplicar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive(p)}><Power className="h-3.5 w-3.5 mr-2" /> {p.active ? "Desativar" : "Ativar"}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(p)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-2 flex items-end justify-between">
                      <div>
                        <span className="text-base font-bold text-foreground leading-none">{displayPrice(p)}</span>
                        {hasPromo(p) && <span className="ml-1.5 text-xs text-muted-foreground line-through">{formatCurrency(Number(p.price))}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">Est: <span className="font-medium text-foreground">{p.stock}</span></div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/40 px-3 py-1.5 flex items-center gap-1">
                  <div className="flex items-center gap-2 mr-auto">
                    <Switch
                      checked={p.active}
                      onCheckedChange={() => toggleActive(p)}
                      className="scale-75"
                    />
                    <span className={`text-[10px] font-medium ${p.active ? "text-green-600" : "text-muted-foreground"}`}>
                      {p.active ? "🟢 Ativo" : "🔴 Inativo"}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => nav(`/admin/produtos/editar/${p.id}`)}><Pencil className="h-3 w-3" /> Editar</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => duplicateProduct(p)}><Copy className="h-3 w-3" /> Duplicar</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            );
          })}
        </div>
        {hasMore && (
          <div className="flex flex-col items-center gap-2 py-6">
            <p className="text-xs text-muted-foreground">Mostrando {visibleCount} de {filtered.length} produtos</p>
            <Button variant="outline" size="sm" onClick={() => setVisibleCount(prev => prev + 60)}>Carregar mais</Button>
          </div>
        )}
        {!hasMore && filtered.length > 60 && (
          <p className="text-center text-xs text-muted-foreground py-4">Todos os {filtered.length} produtos exibidos</p>
        )}
        </>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              O produto <strong>{deleteTarget?.name}</strong> será removido permanentemente junto com suas imagens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk action confirmation */}
      <AlertDialog open={!!bulkConfirm} onOpenChange={(open) => !open && setBulkConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkConfirm?.action === "activate" && "Ativar produtos?"}
              {bulkConfirm?.action === "deactivate" && "Desativar produtos?"}
              {bulkConfirm?.action === "delete" && "Excluir produtos?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkConfirm?.action === "activate" && `Tem certeza que deseja ativar ${bulkConfirm.count} produtos?`}
              {bulkConfirm?.action === "deactivate" && `Tem certeza que deseja desativar ${bulkConfirm.count} produtos?`}
              {bulkConfirm?.action === "delete" && `Tem certeza que deseja excluir ${bulkConfirm.count} produtos permanentemente? Esta ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (bulkConfirm?.action === "activate") bulkActivate();
                else if (bulkConfirm?.action === "deactivate") bulkDeactivate();
                else if (bulkConfirm?.action === "delete") bulkDelete();
              }}
              className={bulkConfirm?.action === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {bulkConfirm?.action === "activate" && "Ativar"}
              {bulkConfirm?.action === "deactivate" && "Desativar"}
              {bulkConfirm?.action === "delete" && "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Price validation report dialog */}
      <Dialog open={!!priceReport} onOpenChange={(open) => !open && setPriceReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Relatório de Validação de Preços
            </DialogTitle>
          </DialogHeader>
          {priceReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: "Total analisados", value: priceReport.total, icon: Package, color: "text-foreground" },
                  { label: "Preços OK", value: priceReport.validated, icon: CheckCircle, color: "text-green-600" },
                  { label: "Corrigidos", value: priceReport.corrected, icon: AlertTriangle, color: "text-amber-600" },
                  { label: "Promos ajustadas", value: priceReport.promo_fixed, icon: DollarSign, color: "text-blue-600" },
                  { label: "Preço zero fixado", value: priceReport.zero_price_fixed, icon: XCircle, color: "text-orange-600" },
                  { label: "Sem categoria", value: priceReport.skipped, icon: Package, color: "text-muted-foreground" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border bg-card p-2.5 text-center">
                    <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
                    <p className={`text-lg font-bold ${s.color}`}>{s.value ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
                  </div>
                ))}
              </div>

              {priceReport.by_category && Object.keys(priceReport.by_category).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Por categoria</h4>
                  <ScrollArea className="max-h-48">
                    <div className="space-y-1">
                      {Object.entries(priceReport.by_category)
                        .sort(([, a]: any, [, b]: any) => b.corrected - a.corrected)
                        .map(([cat, stats]: any) => (
                          <div key={cat} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-md hover:bg-muted/50">
                            <span className="font-medium capitalize">{cat}</span>
                            <div className="flex items-center gap-3 text-muted-foreground">
                              <span>{stats.total} total</span>
                              {stats.corrected > 0 && <span className="text-amber-600">{stats.corrected} fixados</span>}
                              {stats.errors > 0 && <span className="text-destructive">{stats.errors} erros</span>}
                              {stats.ok > 0 && <span className="text-green-600">{stats.ok} ok</span>}
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {priceReport.details && priceReport.details.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                    Detalhes ({priceReport.details.length} itens)
                  </h4>
                  <ScrollArea className="max-h-48">
                    <div className="space-y-1">
                      {priceReport.details.slice(0, 50).map((d: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-md hover:bg-muted/50 gap-2">
                          <span className="truncate flex-1 min-w-0">{d.name}</span>
                          {d.action === "corrected" || d.action === "zero_fixed" ? (
                            <span className="shrink-0 text-amber-600">
                              {formatCurrency(d.original)} → {formatCurrency(d.corrected)}
                            </span>
                          ) : (
                            <span className="shrink-0 text-destructive">
                              {formatCurrency(d.price)} (fora da faixa)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <Button className="w-full" onClick={() => setPriceReport(null)}>Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scroll to top FAB */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full shadow-lg"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
