import { useEffect, useMemo, useState } from "react";
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

export default function OffersPage() {
  const cart = useCart();
  const { activeProducts, loading } = useStoreProducts();
  const { activeCategories } = useStoreCategories();
  const home = useHomeContent({ enabled: true });
  const [cartOpen, setCartOpen] = useState(false);

  useDynamicSeo({
    title: "Ofertas e Promoções | Materiais de Construção",
    description: "Confira as melhores ofertas em materiais de construção. Descontos imperdíveis!",
    canonicalPath: "/ofertas",
  });

  // Unified offer criteria: promo_price > 0 && promo_price < price
  const promoProducts = useMemo(() => {
    return (activeProducts as any[])
      .filter((p) => {
        const price = Number(p?.price ?? 0);
        const promo = Number(p?.promo_price ?? 0);
        return promo > 0 && price > 0 && promo < price;
      })
      .map((p) => {
        const price = Number(p.price);
        const promo = Number(p.promo_price);
        const discountPct = Math.round(((price - promo) / price) * 100);
        return { ...p, _discountPct: discountPct };
      })
      .sort((a, b) => b._discountPct - a._discountPct);
  }, [activeProducts]);

  const getOfferPrices = (product: any) => ({
    originalPrice: Number(product.price),
    promoPrice: Number(product.promo_price),
    discountPct: product._discountPct ?? Math.round(((Number(product.price) - Number(product.promo_price)) / Number(product.price)) * 100),
  });

  const onAdd = (productId: string, qty: number) => {
    const product: any = activeProducts.find((item: any) => item.id === productId);
    const price = Number(product?.price ?? 0);
    const promo = Number(product?.promo_price ?? 0);
    const effectivePrice = promo > 0 && promo < price ? promo : price;
    cart.add(productId, qty, {
      name: product?.name ?? "Produto",
      unitPrice: effectivePrice,
      unit: product?.unit ?? "un",
      imagePath: product?.images?.[0]?.path ?? null,
    });
    setCartOpen(true);
  };

  const heroProduct = promoProducts[0] ?? null;
  const restProducts = promoProducts.slice(1);

  return (
    <div className="flex flex-col bg-background w-full overflow-x-hidden min-h-screen">
      <AppDownloadBanner />
      <StoreTopbar
        cartCount={cart.totalItems}
        onCartClick={() => setCartOpen(true)}
        footerStoreName={home.footer?.store_name ?? undefined}
        categories={activeCategories as any}
      />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <StoreMobileChrome cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />

      <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pt-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-6">
          <Flame className="h-6 w-6 text-orange-500" />
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Ofertas</h1>
          <span className="ml-auto text-xs text-muted-foreground">
            {promoProducts.length} {promoProducts.length === 1 ? "oferta" : "ofertas"}
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
        ) : promoProducts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
            <p className="text-lg font-semibold">Nenhuma oferta disponível no momento</p>
            <p className="text-muted-foreground text-sm">Volte em breve para conferir novas promoções!</p>
            <Link to="/loja" className="inline-block mt-2 text-sm font-semibold text-primary underline underline-offset-4">
              Ver catálogo completo
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {heroProduct && (
              <OfferHeroCard
                product={heroProduct}
                prices={getOfferPrices(heroProduct)}
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
