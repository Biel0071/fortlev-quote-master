import { useMemo, useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { AppHeader } from "@/components/store/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { CartDrawer } from "@/components/store/CartDrawer";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useStoreCategories } from "@/hooks/useStoreCategories";
import { useVisitorTracker } from "@/hooks/useVisitorTracker";
import { StoreProductCard } from "@/components/store/home/StoreProductCard";
import { useSearchParams } from "react-router-dom";
import { expandSearchTerms, smartMatch, smartScore } from "@/utils/smartSearch";
import { Virtualizer } from "virtua";

export default function StoreCatalog() {
  const cart = useCart();
  const tracker = useVisitorTracker();
  const { activeProducts, loading, error, reload } = useStoreProducts();
  const { activeCategories } = useStoreCategories();
  const [cartOpen, setCartOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const q = (searchParams.get("q") ?? "").toString();
  const selectedSlug = searchParams.get("categoria") ?? "all";

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    const selectedCategoryId =
      selectedSlug === "all" ? null : activeCategories.find((c) => c.slug === selectedSlug)?.id ?? null;
    const promoOnly = searchParams.get("promo") === "1";
    const searchTerms = search ? expandSearchTerms(search) : [];

    const results = activeProducts
      .filter((p: any) => {
        if (selectedCategoryId && (p.category_id ?? null) !== selectedCategoryId) return false;

        if (promoOnly) {
          const price = Number(p?.price ?? 0);
          const promo = Number(p?.promo_price ?? 0);
          if (!(promo > 0 && promo < price)) return false;
        }

        if (searchTerms.length === 0) return true;
        return smartMatch(p, searchTerms);
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

    if (search && results.length > 0) {
      results.sort((a: any, b: any) => {
        const sa = smartScore(a, searchTerms);
        const sb = smartScore(b, searchTerms);
        if (sb !== sa) return sb - sa;
        return String(a.name ?? "").localeCompare(String(b.name ?? ""));
      });
    }

    if (results.length === 0 && search) {
      const scored = activeProducts
        .map((p: any) => ({ p, score: smartScore(p, searchTerms) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map((x) => x.p);
      if (scored.length > 0) return scored;
      return activeProducts.filter((p: any) => p.featured || p.best_seller).slice(0, 12);
    }
    return results;
  }, [activeProducts, q, selectedSlug, activeCategories, searchParams]);

  const onAdd = (product: any, qty: number) => {
    const price = Number(product?.price ?? 0);
    const promo = Number(product?.promo_price ?? 0);
    const effectivePrice = promo > 0 && promo < price ? promo : price;

    cart.add(product.id, qty, {
      name: product?.name ?? "Produto",
      unitPrice: effectivePrice,
      unit: product?.unit ?? "un",
      imagePath: product?.images?.[0]?.path ?? null,
    });
    setCartOpen(true);
    tracker.track({ type: "add_cart", productId: product.id, categoryId: product.category_id ?? null });
  };

  return (
    <div className="flex flex-col w-full overflow-x-hidden bg-background min-h-screen">
      <AppHeader
        cartCount={cart.totalItems}
        onCartClick={() => setCartOpen(true)}
        categories={activeCategories as any}
      />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <StoreMobileChrome cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />

      <main className="main-content mx-auto w-full max-w-7xl px-4 sm:px-6 py-4 sm:py-6 pb-28 md:pb-10 space-y-4 sm:space-y-6">
        <header className="flex items-end justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Catálogo</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Navegue por categorias e encontre seus produtos.</p>
          </div>
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap bg-muted/50 px-2 py-1 rounded-full shrink-0">
            {filtered.length} {filtered.length === 1 ? "produto" : "produtos"}
          </span>
        </header>

        {loading || !mounted ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="aspect-square w-full rounded-2xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-destructive/10 p-3">
                <RefreshCw className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="font-semibold">Erro ao carregar produtos</p>
                <p className="text-sm text-muted-foreground">Verifique sua conexão e tente novamente.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => reload()} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="p-12 text-center">
              <p className="text-sm text-muted-foreground">Nenhum produto encontrado para sua busca.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
            {filtered.map((p: any) => (
              <StoreProductCard
                key={p.id}
                product={p}
                onAdd={(productId, qty) => onAdd(p, qty)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

