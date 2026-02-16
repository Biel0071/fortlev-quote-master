import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
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

  useEffect(() => {
    const urlQ = (searchParams.get("q") ?? "").toString();
    if (urlQ && urlQ !== q) setQ(urlQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedSlug = searchParams.get("categoria") ?? "all";

  const categories = useMemo(() => {
    return [{ slug: "all", name: "Todas" }, ...activeCategories.map((c) => ({ slug: c.slug, name: c.name }))];
  }, [activeCategories]);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();

    const selectedCategoryId =
      selectedSlug === "all"
        ? null
        : (activeCategories.find((c) => c.slug === selectedSlug)?.id ?? null);

    return activeProducts.filter((p: any) => {
      if (selectedCategoryId) {
        if ((p.category_id ?? null) !== selectedCategoryId) return false;
      }
      if (!search) return true;
      return p.name.toLowerCase().includes(search) || (p.description ?? "").toLowerCase().includes(search);
    });
  }, [activeProducts, q, selectedSlug, activeCategories]);

  return (
    <div className="min-h-screen bg-background">
      <StoreTopbar cartCount={cart.totalItems} />
      <StoreMobileChrome cartCount={cart.totalItems} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10 space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 opacity-20 fortlev-gradient" />
            <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-muted/40 blur-3xl" />
          </div>

          <header className="relative p-6 sm:p-8 flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Catálogo</h1>
              <p className="text-sm text-muted-foreground">Navegue por categorias e encontre seus produtos.</p>
            </div>
            <Button asChild variant="outline">
              <Link to="/carrinho">Ir ao carrinho</Link>
            </Button>
          </header>
        </section>

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
            {filtered.map((p: any) => {
              const effectivePrice = Number(p.promo_price ?? 0) > 0 ? Number(p.promo_price) : Number(p.price);
              const catName = p.category_id
                ? activeCategories.find((c) => c.id === p.category_id)?.name
                : null;

              return (
                <Card key={p.id} className="rounded-2xl overflow-hidden">
                  <CardContent className="p-5 space-y-3">
                    <div className="space-y-2">
                      <div className="font-semibold leading-tight line-clamp-2">{p.name}</div>
                      {catName && (
                        <Badge variant="secondary" className="w-fit">
                          {catName}
                        </Badge>
                      )}
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">{p.unit ?? "un"}</div>
                      <div className="text-right">
                        {Number(p.promo_price ?? 0) > 0 ? (
                          <div className="text-xs text-muted-foreground line-through">{formatCurrency(Number(p.price))}</div>
                        ) : null}
                        <div className="font-semibold">{formatCurrency(effectivePrice)}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => cart.add(p.id, 1)}>
                        Adicionar
                      </Button>
                      <Button asChild variant="outline">
                        <Link to={`/produto/${p.id}`}>Ver</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
