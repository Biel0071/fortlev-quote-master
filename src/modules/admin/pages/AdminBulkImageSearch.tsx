import { useEffect, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { ProductImageSearchModal } from "@/components/admin/ProductImageSearchModal";
import { ImageIcon, Search, ArrowLeft, Trash2, X, CheckSquare, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ProductRow = {
  id: string;
  name: string;
  active: boolean;
  imageCount: number;
  images: Array<{ id: string; path: string; sort_order: number }>;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

function getPublicUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}

export default function AdminBulkImageSearch() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const [detailProduct, setDetailProduct] = useState<ProductRow | null>(null);
  const [filter, setFilter] = useState<"all" | "no-images">("no-images");
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await cloud
      .from("store_products")
      .select("id, name, active, store_product_images(id, path, sort_order)")
      .order("name", { ascending: true })
      .limit(500);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setProducts([]);
    } else {
      const mapped = (data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        active: p.active,
        imageCount: Array.isArray(p.store_product_images) ? p.store_product_images.length : 0,
        images: Array.isArray(p.store_product_images)
          ? (p.store_product_images as any[]).sort((a: any, b: any) => a.sort_order - b.sort_order)
          : [],
      }));
      setProducts(mapped);

      if (detailProduct) {
        const updated = mapped.find((p) => p.id === detailProduct.id);
        if (updated) setDetailProduct(updated);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === "no-images" ? products.filter((p) => p.imageCount === 0) : products;
  const noImagesCount = products.filter((p) => p.imageCount === 0).length;

  const openSearch = (product: ProductRow) => { setSelectedProduct(product); setSearchOpen(true); };
  const openDetail = (product: ProductRow) => { setDetailProduct(product); setSelectedImages(new Set()); setSelectionMode(false); };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(imageId)) next.delete(imageId); else next.add(imageId);
      return next;
    });
  };

  const selectAllImages = () => {
    if (!detailProduct) return;
    if (selectedImages.size === detailProduct.images.length) setSelectedImages(new Set());
    else setSelectedImages(new Set(detailProduct.images.map((img) => img.id)));
  };

  const deleteImage = async (imageId: string, path: string) => {
    setDeletingImageId(imageId);
    try {
      await cloud.storage.from("product-images").remove([path]);
      const { error } = await cloud.from("store_product_images").delete().eq("id", imageId);
      if (error) throw error;
      toast({ title: "Imagem removida" });
      await load();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Falha ao remover imagem", variant: "destructive" });
    } finally { setDeletingImageId(null); }
  };

  const bulkDelete = async () => {
    if (!detailProduct || selectedImages.size === 0) return;
    setBulkDeleting(true);
    try {
      const toDelete = detailProduct.images.filter((img) => selectedImages.has(img.id));
      await cloud.storage.from("product-images").remove(toDelete.map((img) => img.path));
      const { error } = await cloud.from("store_product_images").delete().in("id", toDelete.map((img) => img.id));
      if (error) throw error;
      toast({ title: `${toDelete.length} imagem(ns) removida(s)` });
      setSelectedImages(new Set());
      setSelectionMode(false);
      await load();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Falha ao remover imagens", variant: "destructive" });
    } finally { setBulkDeleting(false); }
  };

  // ─── DETAIL VIEW ───
  if (detailProduct) {
    return (
      <div className="space-y-4 px-1 sm:px-0">
        {/* Back + Title */}
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" className="shrink-0 mt-0.5 h-8 w-8" onClick={() => setDetailProduct(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight leading-tight truncate">{detailProduct.name}</h1>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant={detailProduct.active ? "outline" : "secondary"} className="text-[10px] sm:text-xs">
                {detailProduct.active ? "Ativo" : "Inativo"}
              </Badge>
              <Badge variant={detailProduct.imageCount > 0 ? "default" : "secondary"} className="text-[10px] sm:text-xs">
                {detailProduct.imageCount} imagem(ns)
              </Badge>
            </div>
          </div>
        </div>

        <Card className="rounded-xl sm:rounded-2xl">
          {/* Card header: stack on mobile, row on desktop */}
          <CardHeader className="pb-3 space-y-2 sm:space-y-0 sm:flex sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base sm:text-lg">Imagens do produto</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {detailProduct.images.length > 0 && (
                <Button
                  size="sm"
                  variant={selectionMode ? "default" : "outline"}
                  className="h-8 text-xs sm:text-sm"
                  onClick={() => { setSelectionMode(!selectionMode); setSelectedImages(new Set()); }}
                >
                  <CheckSquare className="w-3.5 h-3.5 mr-1" />
                  {selectionMode ? "Cancelar" : "Selecionar"}
                </Button>
              )}
              {selectionMode && selectedImages.size > 0 && (
                <Button size="sm" variant="destructive" className="h-8 text-xs sm:text-sm" onClick={bulkDelete} disabled={bulkDeleting}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Excluir {selectedImages.size}
                </Button>
              )}
              <Button size="sm" className="h-8 text-xs sm:text-sm" onClick={() => openSearch(detailProduct)}>
                <Search className="w-3.5 h-3.5 mr-1" /> Buscar imagens
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {selectionMode && detailProduct.images.length > 0 && (
              <div className="mb-3">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAllImages}>
                  {selectedImages.size === detailProduct.images.length ? "Desmarcar todos" : "Selecionar todos"}
                </Button>
              </div>
            )}
            {detailProduct.images.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhuma imagem cadastrada.</p>
                <p className="text-xs mt-1">Clique em "Buscar imagens" para adicionar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                {detailProduct.images.map((img, idx) => {
                  const isSelected = selectedImages.has(img.id);
                  return (
                    <div
                      key={img.id}
                      className={`relative group rounded-lg sm:rounded-xl border-2 overflow-hidden bg-muted/20 transition-all ${
                        selectionMode && isSelected ? "border-primary ring-2 ring-primary/30" : "border-border"
                      }`}
                      onClick={() => { if (selectionMode) toggleImageSelection(img.id); else setPreviewUrl(getPublicUrl(img.path)); }}
                    >
                      {selectionMode && (
                        <div className="absolute top-1.5 left-1.5 z-10">
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleImageSelection(img.id)} className="bg-background/80 h-4 w-4" />
                        </div>
                      )}
                      <img
                        src={getPublicUrl(img.path)}
                        alt={`Imagem ${idx + 1}`}
                        className="w-full aspect-square object-cover cursor-pointer"
                        loading="lazy"
                      />
                      {!selectionMode && (
                        <div className="absolute top-1 left-1 bg-background/80 backdrop-blur-sm text-[10px] font-medium px-1 py-0.5 rounded">
                          #{idx + 1}
                        </div>
                      )}
                      {!selectionMode && (
                        <button
                          type="button"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 sm:transition-opacity bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                          disabled={deletingImageId === img.id}
                          onClick={(e) => { e.stopPropagation(); deleteImage(img.id, img.path); }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedProduct && (
          <ProductImageSearchModal open={searchOpen} onOpenChange={setSearchOpen} productId={selectedProduct.id} initialQuery={selectedProduct.name} onImported={load} />
        )}

        {previewUrl && (
          <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" onClick={() => setPreviewUrl(null)}>
            <button className="absolute top-3 right-3 sm:top-4 sm:right-4 text-foreground/90 hover:text-foreground z-10" onClick={() => setPreviewUrl(null)}>
              <X className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg border border-border" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="space-y-4 px-1 sm:px-0">
      {/* Header */}
      <div className="flex items-start gap-2">
        <Button variant="ghost" size="icon" className="shrink-0 mt-0.5 h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" /> Gerador de Imagens
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Busque e importe imagens para os produtos do catálogo.
          </p>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => load()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Stats — 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {[
          { value: products.length, label: "Total", color: "" },
          { value: noImagesCount, label: "Sem imagens", color: "text-destructive" },
          { value: products.length - noImagesCount, label: "Com imagens", color: "text-primary" },
          { value: `${products.length > 0 ? Math.round(((products.length - noImagesCount) / products.length) * 100) : 0}%`, label: "Cobertura", color: "" },
        ].map((stat) => (
          <Card key={stat.label} className="rounded-xl">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className={`text-xl sm:text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 sm:gap-2">
        <Button variant={filter === "no-images" ? "default" : "outline"} size="sm" className="h-8 text-xs sm:text-sm" onClick={() => setFilter("no-images")}>
          Sem imagens ({noImagesCount})
        </Button>
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" className="h-8 text-xs sm:text-sm" onClick={() => setFilter("all")}>
          Todos ({products.length})
        </Button>
      </div>

      {/* Products list */}
      <Card className="rounded-xl sm:rounded-2xl">
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">
            {filter === "no-images" ? "Produtos sem imagens" : "Todos os produtos"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              {filter === "no-images" ? "🎉 Todos os produtos já possuem imagens!" : "Nenhum produto encontrado."}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-0.5 sm:pr-1">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border border-border p-2.5 sm:p-3 hover:bg-muted/30 transition cursor-pointer active:bg-muted/50"
                  onClick={() => openDetail(p)}
                >
                  {/* Thumbnail preview for items with images */}
                  {p.imageCount > 0 && p.images[0] && (
                    <img
                      src={getPublicUrl(p.images[0].path)}
                      alt=""
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-md object-cover shrink-0 border border-border"
                      loading="lazy"
                    />
                  )}
                  {p.imageCount === 0 && (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-muted/40 flex items-center justify-center shrink-0 border border-border">
                      <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs sm:text-sm truncate">{p.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant={p.imageCount > 0 ? "default" : "secondary"} className="text-[10px] sm:text-xs px-1.5 py-0">
                        {p.imageCount} img
                      </Badge>
                      <Badge variant={p.active ? "outline" : "secondary"} className="text-[10px] sm:text-xs px-1.5 py-0">
                        {p.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
                    onClick={(e) => { e.stopPropagation(); openSearch(p); }}
                  >
                    <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-0.5 sm:mr-1" />
                    <span className="hidden xs:inline">Buscar</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProduct && (
        <ProductImageSearchModal open={searchOpen} onOpenChange={setSearchOpen} productId={selectedProduct.id} initialQuery={selectedProduct.name} onImported={load} />
      )}
    </div>
  );
}