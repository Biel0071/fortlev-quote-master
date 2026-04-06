import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { CartDrawer } from "@/components/store/CartDrawer";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useStoreCategories } from "@/hooks/useStoreCategories";
import { useVisitorTracker } from "@/hooks/useVisitorTracker";
import { StoreProductCard } from "@/components/store/home/StoreProductCard";
import { useSearchParams } from "react-router-dom";
import { expandSearchTerms, smartMatch } from "@/utils/smartSearch";

export default function StoreCatalog() {
  const cart = useCart();
  const tracker = useVisitorTracker();
  const { activeProducts, loading, error, reload } = useStoreProducts();
  const { activeCategories } = useStoreCategories();
  const [cartOpen, setCartOpen] = useState(false);
  const [searchParams] = useSearchParams();

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

    // Fallback: if search returned nothing, show all products (user never sees empty)
    if (results.length === 0 && search) {
      return activeProducts.slice(0, 20);
    }
    return results;
  }, [activeProducts, q, selectedSlug, activeCategories, searchParams]);

  return (
    <div className="flex flex-col w-full overflow-x-hidden bg-background">
      <StoreTopbar
        cartCount={cart.totalItems}
        onCartClick={() => setCartOpen(true)}
        categories={activeCategories as any}
      />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <StoreMobileChrome cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />

      <main className="mx-auto w-full max-w-6xl min-w-0 overflow-x-hidden px-4 sm:px-6 py-4 sm:py-6 pb-28 md:pb-10 space-y-4 sm:space-y-5">
        <header className="flex items-end justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-semibold tracking-tight">Catálogo</h1>
            <p className="text-xs text-muted-foreground">Navegue por categorias e encontre seus produtos.</p>
          </div>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
            {filtered.length} {filtered.length === 1 ? "produto" : "produtos"}
          </span>
        </header>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-[380px] w-full rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <Card className="rounded-2xl">
            <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-destructive">Erro ao carregar produtos. Verifique sua conexão.</p>
              <Button variant="outline" size="sm" onClick={() => reload()} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Tentar novamente
              </Button>
            </CardContent>
          </Card>
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
