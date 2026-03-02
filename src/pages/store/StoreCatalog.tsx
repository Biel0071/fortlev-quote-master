import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { CartDrawer } from "@/components/store/CartDrawer";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useStoreCategories } from "@/hooks/useStoreCategories";
import { useVisitorTracker } from "@/hooks/useVisitorTracker";
import { StoreProductCard } from "@/components/store/home/StoreProductCard";

export default function StoreCatalog() {
  const cart = useCart();
  const tracker = useVisitorTracker();
  const { activeProducts, loading, error } = useStoreProducts();
  const { activeCategories } = useStoreCategories();

  const [q, setQ] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
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
      selectedSlug === "all" ? null : (activeCategories.find((c) => c.slug === selectedSlug)?.id ?? null);

    return activeProducts
      .filter((p: any) => {
        if (selectedCategoryId) {
          if ((p.category_id ?? null) !== selectedCategoryId) return false;
        }

        const promoOnly = searchParams.get("promo") === "1";
        if (promoOnly) {
          const price = Number(p?.price ?? 0);
          const promo = Number(p?.promo_price ?? 0);
          if (!(promo > 0 && promo < price)) return false;
        }

        if (!search) return true;
        return p.name.toLowerCase().includes(search) || (p.description ?? "").toLowerCase().includes(search);
      })
      .slice()
      .sort((a: any, b: any) => {
        const sort = (searchParams.get("sort") ?? "").toLowerCase();
        if (sort === "popular") {
          const av = Number(a.views ?? 0);
          const bv = Number(b.views ?? 0);
          if (bv !== av) return bv - av;
          const ac = Number(a.clicks ?? 0);
          const bc = Number(b.clicks ?? 0);
          if (bc !== ac) return bc - ac;
          const as = Number(a.sales ?? 0);
          const bs = Number(b.sales ?? 0);
          if (bs !== as) return bs - as;
        }
        return String(a.name ?? "").localeCompare(String(b.name ?? ""));
      });
  }, [activeProducts, q, selectedSlug, activeCategories, searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <StoreTopbar cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <StoreMobileChrome cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10 space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 opacity-20 fortlev-gradient" />
            <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-muted/40 blur-3xl" />
          </div>

          <header className="relative p-6 sm:p-8 flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight">Catálogo</h1>
              <p className="text-sm text-muted-foreground">Navegue por categorias e encontre seus produtos.</p>
            </div>
            <Button asChild variant="outline" className="h-12 rounded-2xl">
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
                className="h-11 rounded-2xl"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  if (c.slug === "all") next.delete("categoria");
                  else next.set("categoria", c.slug);
                  setSearchParams(next, { replace: true });

                  const catId = c.slug === "all" ? null : (activeCategories.find((x) => x.slug === c.slug)?.id ?? null);
                  tracker.track({
                    type: "category_click",
                    categoryId: catId,
                    metadata: { slug: c.slug },
                    path: window.location.pathname + window.location.search,
                  });
                }}
              >
                {c.name}
              </Button>
            );
          })}
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar produto..."
            className="md:col-span-2 h-12 rounded-2xl"
          />
          <div className="text-xs text-muted-foreground md:text-right self-center">
            {selectedSlug === "all" ? "Mostrando todas as categorias" : `Categoria: ${selectedSlug}`}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[360px] w-full rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-sm text-muted-foreground">Nenhum produto encontrado.</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
            {filtered.map((p: any) => (
              <StoreProductCard
                key={p.id}
                product={p}
                onAdd={(productId, qty) => {
                  const price = Number(p?.price ?? 0);
                  const promo = Number(p?.promo_price ?? 0);
                  const effectivePrice = promo > 0 && promo < price ? promo : price;

                  cart.add(productId, qty, {
                    name: p?.name ?? "Produto",
                    unitPrice: effectivePrice,
                    unit: p?.unit ?? "un",
                    imagePath: p?.images?.[0]?.path ?? null,
                  });
                  setCartOpen(true);
                  tracker.track({ type: "add_cart", productId, categoryId: p.category_id ?? null });
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

