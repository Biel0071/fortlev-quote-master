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
    <div className="flex flex-col bg-background w-full overflow-x-hidden">
      <StoreTopbar cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <StoreMobileChrome cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-28 md:pb-10 space-y-3 sm:space-y-5 min-w-0 overflow-x-hidden">
        {/* Header */}
        <header className="flex items-end justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-semibold tracking-tight">Catálogo</h1>
            <p className="text-xs text-muted-foreground">Navegue por categorias e encontre seus produtos.</p>
          </div>
        </header>

        {/* Category chips - compact scrollable */}
        <section className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 sm:-mx-0 sm:px-0 scrollbar-none" style={{ scrollbarWidth: "none" }}>
          {categories.map((c) => {
            const active = c.slug === selectedSlug;
            return (
              <button
                key={c.slug}
                className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
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
              </button>
            );
          })}
        </section>

        {/* Search + count */}
        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar produto..."
            className="flex-1 h-10 rounded-xl text-sm"
          />
          <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
            {filtered.length} {filtered.length === 1 ? "produto" : "produtos"}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-[380px] w-full rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-sm text-muted-foreground">Nenhum produto encontrado.</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
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

