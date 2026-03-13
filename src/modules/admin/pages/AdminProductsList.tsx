import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Copy, Download, Grid2x2, Grid3x3, Globe, ImagePlus, LayoutGrid,
  Loader2, MoreHorizontal, Package, Pencil, Plus, Power, RefreshCw,
  Search, Trash2, Upload,
} from "lucide-react";

type Row = {
  id: string;
  name: string;
  price: number;
  promo_price: number;
  stock: number;
  active: boolean;
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
  return `${SUPABASE_URL}/storage/v1/object/public/store-images/${path}`;
}

export default function AdminProductsList() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [gridSize, setGridSize] = useState<GridSize>("md");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);

  const [batchRunning, setBatchRunning] = useState(false);
  const [batchDone, setBatchDone] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const cancelRef = useRef(false);
  const runningRef = useRef(false);

  const load = async () => {
    setLoading(true);
    const PAGE_SIZE = 1000;
    let allRows: Row[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await cloud
        .from("store_products")
        .select("id, name, price, promo_price, stock, active, category, category_id")
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
    const productIds = allRows.map(r => r.id);
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

  const filtered = useMemo(() => {
    let result = rows;
    if (filterActive === "active") result = result.filter(r => r.active);
    if (filterActive === "inactive") result = result.filter(r => !r.active);
    if (filterCategory !== "all") {
      result = result.filter(r => r.category_id === filterCategory || r.category === filterCategory);
    }
    const s = q.trim().toLowerCase();
    if (s) result = result.filter(r => r.name.toLowerCase().includes(s));
    return result;
  }, [q, rows, filterActive, filterCategory]);

  const activeCount = rows.filter(r => r.active).length;
  const activeIds = useMemo(() => rows.filter(r => r.active).map(r => r.id), [rows]);

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

  const toggleActive = async (p: Row) => {
    const { error } = await cloud.from("store_products").update({ active: !p.active } as any).eq("id", p.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: p.active ? "Desativado" : "Ativado", description: p.name });
    setRows(prev => prev.map(r => r.id === p.id ? { ...r, active: !r.active } : r));
  };

  const duplicateProduct = async (p: Row) => {
    const { data: original, error: fetchErr } = await cloud.from("store_products").select("*").eq("id", p.id).single();
    if (fetchErr || !original) { toast({ title: "Erro ao duplicar", description: fetchErr?.message ?? "Não encontrado", variant: "destructive" }); return; }
    const { id, created_at, updated_at, views, clicks, sales, source_id, sku, ...rest } = original as any;
    const { data: newProd, error: insertErr } = await cloud
      .from("store_products")
      .insert({ ...rest, name: `${rest.name} (cópia)`, active: false, status: "draft", source_id: null, sku: null } as any)
      .select("id, name, price, promo_price, stock, active, category, category_id")
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
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await cloud
        .from("store_products")
        .select("id, name, sku, category, category_id, unit, price, promo_price, stock, min_stock, active, status, views, clicks, sales, created_at, store_categories(name)")
        .order("name", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      const batch = data ?? [];
      allData = [...allData, ...batch];
      hasMore = batch.length === PAGE_SIZE;
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

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportExcel} disabled={rows.length === 0}>
          <Download className="h-3.5 w-3.5" /> Excel
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => nav("/admin/produtos/imagens")}>
          <ImagePlus className="h-3.5 w-3.5" /> Imagens
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => nav("/admin/produtos/importar")}>
          <Upload className="h-3.5 w-3.5" /> Importar
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => nav("/admin/produtos/scraper")}>
          <Globe className="h-3.5 w-3.5" /> Scraper
        </Button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-1.5">
          <Package className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{rows.length}</span> total
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-1.5">
          <Power className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-foreground">{activeCount}</span> ativos
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-1.5 text-sm bg-primary/10 text-primary rounded-lg px-3 py-1.5 font-medium">
            {selected.size} selecionados
          </div>
        )}
      </div>

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
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar produto..." className="pl-9" />
          </div>

          {/* Category filter */}
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {(["all", "active", "inactive"] as const).map(f => (
              <Button
                key={f}
                variant={filterActive === f ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setFilterActive(f)}
              >
                {f === "all" ? "Todos" : f === "active" ? "Ativos" : "Inativos"}
              </Button>
            ))}
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={load} disabled={loading || batchRunning}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
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
              <Button
                variant={gridSize === "sm" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-none"
                onClick={() => setGridSize("sm")}
                title="Grade pequena"
              >
                <Grid3x3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={gridSize === "md" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-none"
                onClick={() => setGridSize("md")}
                title="Grade média"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={gridSize === "lg" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-none"
                onClick={() => setGridSize("lg")}
                title="Grade grande"
              >
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
        <div className={`grid ${GRID_COLS[gridSize]} gap-3`}>
          {filtered.map(p => {
            const thumb = imageMap[p.id];
            const isSelected = selected.has(p.id);

            return isCompact ? (
              /* ───── Compact card (sm grid) ───── */
              <div
                key={p.id}
                className={`group relative rounded-xl border bg-card/80 backdrop-blur-sm transition-all hover:shadow-md cursor-pointer ${
                  !p.active ? "opacity-60" : ""
                } ${isSelected ? "ring-2 ring-primary border-primary" : "hover:border-primary/20"}`}
                onClick={() => toggleSelect(p.id)}
              >
                <div className="aspect-square relative overflow-hidden rounded-t-xl bg-muted/20">
                  {thumb ? (
                    <img
                      src={getImageUrl(thumb)}
                      alt={p.name}
                      className="w-full h-full object-contain p-1"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <Checkbox
                    checked={isSelected}
                    className="absolute top-2 left-2 h-4 w-4 bg-background/80"
                    onClick={e => e.stopPropagation()}
                    onCheckedChange={() => toggleSelect(p.id)}
                  />
                  {!p.active && (
                    <Badge variant="secondary" className="absolute top-2 right-2 text-[9px] px-1.5 py-0">Inativo</Badge>
                  )}
                </div>
                <div className="p-2">
                  <h3 className="text-[11px] font-medium leading-tight line-clamp-2">{p.name}</h3>
                  <p className="text-xs font-bold mt-1">{displayPrice(p)}</p>
                </div>
              </div>
            ) : (
              /* ───── Standard card (md/lg grid) ───── */
              <div
                key={p.id}
                className={`group relative rounded-xl border bg-card/80 backdrop-blur-sm transition-all hover:shadow-md ${
                  !p.active ? "opacity-60" : ""
                } ${isSelected ? "ring-2 ring-primary border-primary" : "hover:border-primary/20"}`}
              >
                <div className="flex">
                  {/* Thumbnail */}
                  <div
                    className={`shrink-0 relative overflow-hidden rounded-l-xl bg-muted/20 flex items-center justify-center cursor-pointer ${
                      gridSize === "lg" ? "w-32 h-32" : "w-20 h-20"
                    }`}
                    onClick={() => toggleSelect(p.id)}
                  >
                    {thumb ? (
                      <img
                        src={getImageUrl(thumb)}
                        alt={p.name}
                        className="w-full h-full object-contain p-1"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground/30" />
                    )}
                    <Checkbox
                      checked={isSelected}
                      className="absolute top-1.5 left-1.5 h-4 w-4 bg-background/80"
                      onClick={e => e.stopPropagation()}
                      onCheckedChange={() => toggleSelect(p.id)}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 p-3 cursor-pointer" onClick={() => nav(`/admin/produtos/editar/${p.id}`)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm leading-tight line-clamp-2">{p.name}</h3>
                        {p.category && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{p.category}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => nav(`/admin/produtos/editar/${p.id}`)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateProduct(p)}>
                            <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive(p)}>
                            <Power className="h-3.5 w-3.5 mr-2" /> {p.active ? "Desativar" : "Ativar"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(p)}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-2 flex items-end justify-between">
                      <div>
                        <span className="text-base font-bold text-foreground leading-none">{displayPrice(p)}</span>
                        {hasPromo(p) && (
                          <span className="ml-1.5 text-xs text-muted-foreground line-through">{formatCurrency(Number(p.price))}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Est: <span className="font-medium text-foreground">{p.stock}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="border-t border-border/40 px-3 py-1.5 flex items-center gap-1">
                  <Badge variant={p.active ? "default" : "secondary"} className="text-[10px] px-2 py-0 mr-auto">
                    {p.active ? "Ativo" : "Inativo"}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => nav(`/admin/produtos/editar/${p.id}`)}>
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => duplicateProduct(p)}>
                    <Copy className="h-3 w-3" /> Duplicar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
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
    </div>
  );
}
