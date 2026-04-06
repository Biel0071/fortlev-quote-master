import { useState } from "react";
import { Link } from "react-router-dom";
import { StoreTopbar } from "@/components/store/StoreTopbar";
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
import { Flame } from "lucide-react";
import { AppDownloadBanner } from "@/components/store/AppDownloadBanner";
import { useOfferProducts } from "@/hooks/useOfferProducts";

export default function OffersPage() {
  const cart = useCart();
  const { activeProducts, loading } = useStoreProducts();
  const { activeCategories } = useStoreCategories();
  const home = useHomeContent({ enabled: true });
  const [cartOpen, setCartOpen] = useState(false);
  const { offerProducts } = useOfferProducts(activeProducts);

  useDynamicSeo({
    title: "Ofertas e Promoções | Materiais de Construção",
    description: "Confira as melhores ofertas em materiais de construção. Descontos imperdíveis!",
    canonicalPath: "/ofertas",
  });

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

  const heroProducts = offerProducts.slice(0, 5);
  const restProducts = offerProducts.slice(5);

  return (
    <div className="flex flex-col bg-background w-full overflow-x-hidden min-h-screen">
      <div className="sticky top-0 z-50 bg-background">
        <AppDownloadBanner />
        <StoreTopbar
          cartCount={cart.totalItems}
          onCartClick={() => setCartOpen(true)}
          footerStoreName={home.footer?.store_name ?? undefined}
          categories={activeCategories as any}
        />
      </div>
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <StoreMobileChrome cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />

      <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pt-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-6">
          <Flame className="h-6 w-6 text-orange-500" />
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
            {heroProducts.length > 0 && (
              <OfferHeroCard
                products={heroProducts}
                getOfferPrices={getOfferPrices}
                onAdd={onAdd}
              />
            )}

            {restProducts.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {restProducts.map((product) => (
                  <OfferProductCard
                    key={product.id}
                    product={product}
                    prices={getOfferPrices(product)}
                    onAdd={onAdd}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <StoreFooter footer={home.footer} pageLinks={[]} />
    </div>
  );
}
