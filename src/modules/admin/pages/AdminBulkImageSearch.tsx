import { useEffect, useState } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ProductImageSearchModal } from "@/components/admin/ProductImageSearchModal";
import { ImageIcon, Search } from "lucide-react";

type ProductRow = {
  id: string;
  name: string;
  active: boolean;
  imageCount: number;
};

export default function AdminBulkImageSearch() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const [filter, setFilter] = useState<"all" | "no-images">("no-images");

  const load = async () => {
    setLoading(true);
    const { data, error } = await cloud
      .from("store_products")
      .select("id, name, active, store_product_images(id)")
      .order("name", { ascending: true })
      .limit(500);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setProducts([]);
    } else {
      setProducts(
        (data ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          active: p.active,
          imageCount: Array.isArray(p.store_product_images) ? p.store_product_images.length : 0,
        }))
      );
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
            <div className="text-2xl font-bold text-green-600">{products.length - noImagesCount}</div>
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
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 hover:bg-muted/30 transition"
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
                  <Button size="sm" variant="outline" onClick={() => openSearch(p)} className="shrink-0">
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
