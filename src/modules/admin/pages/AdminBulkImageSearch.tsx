import { useEffect, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ProductImageSearchModal } from "@/components/admin/ProductImageSearchModal";
import { ImageIcon, Search, ArrowLeft, Trash2, X } from "lucide-react";

type ProductRow = {
  id: string;
  name: string;
  active: boolean;
  imageCount: number;
  images: Array<{ id: string; path: string; sort_order: number }>;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

function getPublicUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${path}`;
}

export default function AdminBulkImageSearch() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const [detailProduct, setDetailProduct] = useState<ProductRow | null>(null);
  const [filter, setFilter] = useState<"all" | "no-images">("no-images");
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

      // Update detail product if open
      if (detailProduct) {
        const updated = mapped.find((p) => p.id === detailProduct.id);
        if (updated) setDetailProduct(updated);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = filter === "no-images"
    ? products.filter((p) => p.imageCount === 0)
    : products;

  const noImagesCount = products.filter((p) => p.imageCount === 0).length;

  const openSearch = (product: ProductRow) => {
    setSelectedProduct(product);
    setSearchOpen(true);
  };

  const openDetail = (product: ProductRow) => {
    setDetailProduct(product);
  };

  const deleteImage = async (imageId: string, path: string) => {
    setDeletingImageId(imageId);
    try {
      // Delete from storage
      const storagePath = path.replace(/^product-images\//, "");
      await cloud.storage.from("product-images").remove([storagePath]);

      // Delete from database
      const { error } = await cloud.from("store_product_images").delete().eq("id", imageId);
      if (error) throw error;

      toast({ title: "Imagem removida" });
      await load();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Falha ao remover imagem", variant: "destructive" });
    } finally {
      setDeletingImageId(null);
    }
  };

  // DETAIL VIEW
  if (detailProduct) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setDetailProduct(null)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">{detailProduct.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={detailProduct.active ? "outline" : "secondary"} className="text-xs">
              {detailProduct.active ? "Ativo" : "Inativo"}
            </Badge>
            <Badge variant={detailProduct.imageCount > 0 ? "default" : "secondary"} className="text-xs">
              {detailProduct.imageCount} imagem(ns)
            </Badge>
          </div>
        </div>

        {/* Existing images */}
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Imagens do produto</CardTitle>
            <Button size="sm" onClick={() => openSearch(detailProduct)}>
              <Search className="w-4 h-4 mr-1" /> Buscar mais imagens
            </Button>
          </CardHeader>
          <CardContent>
            {detailProduct.images.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Nenhuma imagem cadastrada.</p>
                <p className="text-sm mt-1">Clique em "Buscar mais imagens" para adicionar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {detailProduct.images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="relative group rounded-xl border border-border overflow-hidden bg-muted/20"
                  >
                    <img
                      src={getPublicUrl(img.path)}
                      alt={`Imagem ${idx + 1}`}
                      className="w-full aspect-square object-cover cursor-pointer"
                      loading="lazy"
                      onClick={() => setPreviewUrl(getPublicUrl(img.path))}
                    />
                    <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-xs font-medium px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </div>
                    <button
                      type="button"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full p-1.5 hover:bg-destructive/90"
                      disabled={deletingImageId === img.id}
                      onClick={() => deleteImage(img.id, img.path)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search modal */}
        {selectedProduct && (
          <ProductImageSearchModal
            open={searchOpen}
            onOpenChange={setSearchOpen}
            productId={selectedProduct.id}
            initialQuery={selectedProduct.name}
            onImported={load}
          />
        )}

        {/* Full preview */}
        {previewUrl && (
          <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
            <button className="absolute top-4 right-4 text-foreground/90 hover:text-foreground z-10" onClick={() => setPreviewUrl(null)}>
              <X className="w-8 h-8" />
            </button>
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg border border-border"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ImageIcon className="w-6 h-6" /> Gerador de Imagens
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Busque e importe imagens da internet para todos os produtos do catálogo.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{products.length}</div>
            <div className="text-xs text-muted-foreground">Total de produtos</div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-destructive">{noImagesCount}</div>
            <div className="text-xs text-muted-foreground">Sem imagens</div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{products.length - noImagesCount}</div>
            <div className="text-xs text-muted-foreground">Com imagens</div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {products.length > 0
                ? Math.round(((products.length - noImagesCount) / products.length) * 100)
                : 0}%
            </div>
            <div className="text-xs text-muted-foreground">Cobertura</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={filter === "no-images" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("no-images")}
        >
          Sem imagens ({noImagesCount})
        </Button>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          Todos ({products.length})
        </Button>
      </div>

      {/* Products list */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">
            {filter === "no-images" ? "Produtos sem imagens" : "Todos os produtos"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              {filter === "no-images"
                ? "🎉 Todos os produtos já possuem imagens!"
                : "Nenhum produto encontrado."}
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 hover:bg-muted/30 transition cursor-pointer"
                  onClick={() => openDetail(p)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{p.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={p.imageCount > 0 ? "default" : "secondary"} className="text-xs">
                        {p.imageCount} img
                      </Badge>
                      <Badge variant={p.active ? "outline" : "secondary"} className="text-xs">
                        {p.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openSearch(p); }} className="shrink-0">
                    <Search className="w-4 h-4 mr-1" /> Buscar imagens
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search modal */}
      {selectedProduct && (
        <ProductImageSearchModal
          open={searchOpen}
          onOpenChange={setSearchOpen}
          productId={selectedProduct.id}
          initialQuery={selectedProduct.name}
          onImported={load}
        />
      )}
    </div>
  );
}
