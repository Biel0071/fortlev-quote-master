import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useStoreCategories } from "@/hooks/useStoreCategories";
import { formatCurrency } from "@/utils/formatters";

export default function StoreCatalog() {
  const cart = useCart();
  const { activeProducts, loading, error } = useStoreProducts();
  const { activeCategories } = useStoreCategories();

  const [q, setQ] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedSlug = searchParams.get("categoria") ?? "all";

  const categories = useMemo(() => {
    return [
      { slug: "all", name: "Todas" },
      ...activeCategories.map((c) => ({ slug: c.slug, name: c.name })),
    ];
  }, [activeCategories]);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    return activeProducts.filter((p) => {
      if (selectedSlug !== "all") {
        const cat = (p.category ?? "").toLowerCase();
        // Until product.category_id is fully wired in admin, match by legacy text too.
        if (cat !== selectedSlug.toLowerCase()) return false;
      }
      if (!search) return true;
      return p.name.toLowerCase().includes(search) || (p.description ?? "").toLowerCase().includes(search);
    });
  }, [activeProducts, q, selectedSlug]);

  return (
    <div className="min-h-screen bg-background">
      <StoreTopbar cartCount={cart.totalItems} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <header className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Catálogo</h1>
            <p className="text-sm text-muted-foreground">Navegue por categorias e encontre seus produtos.</p>
          </div>
          <Button asChild variant="outline"><Link to="/carrinho">Ir ao carrinho</Link></Button>
        </header>

        <section className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => {
            const active = c.slug === selectedSlug;
            return (
              <Button
                key={c.slug}
                size="sm"
                variant={active ? "default" : "outline"}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  if (c.slug === "all") next.delete("categoria");
                  else next.set("categoria", c.slug);
                  setSearchParams(next, { replace: true });
                }}
              >
                {c.name}
              </Button>
            );
          })}
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto..." className="md:col-span-2" />
          <div className="text-xs text-muted-foreground md:text-right self-center">
            {selectedSlug === "all" ? "Mostrando todas as categorias" : `Categoria: ${selectedSlug}`}
          </div>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Carregando...</div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base line-clamp-2">{p.name}</CardTitle>
                  {p.category && <Badge variant="secondary" className="w-fit">{p.category}</Badge>}
                </CardHeader>
                <CardContent className="space-y-3">
                  {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">{p.unit ?? "un"}</div>
                    <div className="font-semibold">{formatCurrency(p.price)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => cart.add(p.id, 1)}>Adicionar</Button>
                    <Button asChild variant="outline"><Link to={`/produto/${p.id}`}>Ver</Link></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
