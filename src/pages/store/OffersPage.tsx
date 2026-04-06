import { useState } from "react";
import { AppHeader } from "@/components/store/AppHeader";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useStoreCategories } from "@/hooks/useStoreCategories";
import { useHomeContent } from "@/hooks/useHomeContent";
import { CartDrawer } from "@/components/store/CartDrawer";
import { StoreFooter } from "@/components/store/StoreFooter";
import { useDynamicSeo } from "@/hooks/useDynamicSeo";
import { OfferHeroCard } from "@/components/store/offers/OfferHeroCard";
import { OfferProductCard } from "@/components/store/offers/OfferProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, ChevronLeft, ChevronRight } from "lucide-react";
import { useOfferProducts } from "@/hooks/useOfferProducts";
import { Button } from "@/components/ui/button";

const ITEMS_PER_PAGE = 20;

export default function OffersPage() {
  const cart = useCart();
  const { activeProducts, loading } = useStoreProducts();
  const { activeCategories } = useStoreCategories();
  const home = useHomeContent({ enabled: true });
  const [cartOpen, setCartOpen] = useState(false);
  const { offerProducts } = useOfferProducts(activeProducts);
  const [page, setPage] = useState(1);

  useDynamicSeo({
    title: "Ofertas e Promoções | Materiais de Construção",
    description: "Confira as melhores ofertas em materiais de construção. Descontos imperdíveis!",
    canonicalPath: "/ofertas",
  });

  const totalPages = Math.max(1, Math.ceil(offerProducts.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(page, totalPages);

  const heroProducts = offerProducts.slice(0, 5);
  const restProducts = offerProducts.slice(5);

  const paginatedRest = restProducts.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE,
  );

  const getOfferPrices = (product: any) => ({
    originalPrice: product.price,
    promoPrice: product.promo_price,
    discountPct: product.discountPct,
  });

  const onAdd = (productId: string, qty: number) => {
    const product = offerProducts.find((p) => p.id === productId) ??
      (activeProducts as any[]).find((p: any) => p.id === productId);
    if (!product) return;
    const effectivePrice = product.promo_price > 0 && product.promo_price < product.price
      ? product.promo_price
      : product.price;
    cart.add(productId, qty, {
      name: product.name ?? "Produto",
      unitPrice: effectivePrice,
      unit: product.unit ?? "un",
      imagePath: product.images?.[0]?.path ?? null,
    });
    setCartOpen(true);
  };

  return (
    <div className="flex flex-col bg-background w-full overflow-x-hidden min-h-screen">
      <AppHeader
        cartCount={cart.totalItems}
        onCartClick={() => setCartOpen(true)}
        footerStoreName={home.footer?.store_name ?? undefined}
        categories={activeCategories as any}
      />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <StoreMobileChrome cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />

      <main className="main-content flex-1 px-4 pb-24 sm:px-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-6">
          <Flame className="h-6 w-6 text-destructive" />
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Ofertas</h1>
          <span className="ml-auto text-xs text-muted-foreground">
            {offerProducts.length} {offerProducts.length === 1 ? "oferta" : "ofertas"}
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-2xl" />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {safeCurrentPage === 1 && heroProducts.length > 0 && (
              <OfferHeroCard
                products={heroProducts}
                getOfferPrices={getOfferPrices}
                onAdd={onAdd}
              />
            )}

            {paginatedRest.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {paginatedRest.map((product) => (
                  <OfferProductCard
                    key={product.id}
                    product={product}
                    prices={getOfferPrices(product)}
                    onAdd={onAdd}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4 pb-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium tabular-nums">
                  {safeCurrentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      <StoreFooter footer={home.footer} pageLinks={[]} />
    </div>
  );
}
