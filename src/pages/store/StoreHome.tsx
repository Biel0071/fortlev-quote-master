import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, Store, Package, LayoutGrid, Info } from "lucide-react";
import { useOfferProducts } from "@/hooks/useOfferProducts";
import { AppHeader } from "@/components/store/AppHeader";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useStoreCategories } from "@/hooks/useStoreCategories";
import { useHomeContent } from "@/hooks/useHomeContent";
import { useTenant } from "@/providers/TenantProvider";
import { HomeHeroCarousel } from "@/components/store/home/HomeHeroCarousel";
import { CartDrawer } from "@/components/store/CartDrawer";
import { StoreFooter } from "@/components/store/StoreFooter";
import { cloud } from "@/lib/cloud";
import { pickHomeSeo, useDynamicSeo } from "@/hooks/useDynamicSeo";
import { getBannerImageUrls } from "@/utils/bannerStorage";
import { HomeSection } from "@/components/store/home/HomeSection";
import { HomeCategoriesCarousel } from "@/components/store/home/HomeCategoriesCarousel";
import { HomeProductsByIds } from "@/components/store/home/HomeProductsByIds";
import { HomeGuaranteesMiniBar } from "@/components/store/home/HomeGuaranteesMiniBar";
import { Button } from "@/components/ui/button";


function CategorySkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden pb-4 px-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 shrink-0">
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-muted/30 animate-pulse" />
          <div className="h-3 w-14 rounded bg-muted/20 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="aspect-square rounded-2xl bg-muted/20 animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-muted/10 animate-pulse" />
          <div className="h-8 w-full rounded-xl bg-muted/10 animate-pulse" />
        </div>
      ))}
    </div>
  );
}


export default function StoreHome() {
  const cart = useCart();
  const { store: tenantStore } = useTenant();

  const [phase, setPhase] = useState({
    categories: true,
    featured: false,
    additional: false,
    secondary: false,
  });

  useEffect(() => {
    const featuredTimer = window.setTimeout(() => {
      setPhase((current) => ({ ...current, featured: true }));
    }, 250);
    const additionalTimer = window.setTimeout(() => {
      setPhase((current) => ({ ...current, additional: true }));
    }, 900);
    const secondaryTimer = window.setTimeout(() => {
      setPhase((current) => ({ ...current, secondary: true }));
    }, 1400);

    return () => {
      window.clearTimeout(featuredTimer);
      window.clearTimeout(additionalTimer);
      window.clearTimeout(secondaryTimer);
    };
  }, []);


  const home = useHomeContent({ enabled: true });
  const { activeCategories, loading: categoriesLoading } = useStoreCategories({ enabled: phase.categories });
  const { activeProducts, loading: productsLoading } = useStoreProducts({ enabled: phase.featured || phase.additional });
  const { offerProducts: offerList } = useOfferProducts(activeProducts);

  const [cartOpen, setCartOpen] = useState(false);
  const [pageLinks, setPageLinks] = useState<Array<{ title: string; slug: string }>>([]);

  useEffect(() => {
    if (!phase.secondary || !tenantStore?.id) return;

    let alive = true;
    cloud
      .from("store_pages")
      .select("title, slug, sort_order")
      .eq("store_id", tenantStore.id)
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (!alive) return;
        setPageLinks(((data ?? []) as any[]).map((x: any) => ({ title: x.title, slug: x.slug })));
      });

    return () => {
      alive = false;
    };
  }, [phase.secondary, tenantStore?.id]);


  const seo = useMemo(() => pickHomeSeo(home.seo), [home.seo]);
  const ogImageUrl = useMemo(() => {
    const urls = getBannerImageUrls(home.seo?.og_image_path ?? null);
    return urls.primary || urls.legacy;
  }, [home.seo?.og_image_path]);
  useDynamicSeo({ title: seo.title, description: seo.description, ogImageUrl, canonicalPath: "/" });

  const { isLoading: tenantLoading, store: tenantStoreData } = useTenant();
  const loading = tenantLoading || (productsLoading && activeProducts.length === 0) || (categoriesLoading && activeCategories.length === 0);

  const featuredIds = useMemo(() => {
    const list = (activeProducts ?? []) as any[];
    const featured = list.filter((p) => p?.featured && p?.active).map((p) => p.id) as string[];
    if (featured.length === 0) {
      return list.filter(p => p.active).slice(0, 12).map((p) => p.id);
    }
    return featured;
  }, [activeProducts]);

  const topClickedIds = useMemo(() => {
    const list = ((activeProducts ?? []) as any[]).filter(p => p.active);
    const taggedBestSellers = list.filter(p => p.best_seller);
    if (taggedBestSellers.length > 0) {
      return taggedBestSellers.slice(0, 10).map(p => p.id);
    }
    const bestSellers = [...list]
      .sort((a, b) => {
        const salesDiff = Number(b.sales ?? 0) - Number(a.sales ?? 0);
        if (salesDiff !== 0) return salesDiff;
        return Number(b.clicks ?? 0) - Number(a.clicks ?? 0);
      })
      .slice(0, 20)
      .map((p) => p.id) as string[];
    if (bestSellers.length >= 8) return bestSellers.slice(0, 10);
    return list.slice(0, 12).map((p) => p.id);
  }, [activeProducts]);

  const homeOffers = useMemo(() => offerList.slice(0, 8), [offerList]);

  
  if (tenantLoading) {
    return (
      <div className="flex flex-col w-full min-h-screen bg-background p-4 space-y-4">
        <div className="h-16 w-full rounded-2xl bg-muted/20 animate-pulse" />
        <div className="h-48 w-full rounded-2xl bg-muted/30 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-muted/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Se o tenant carregou mas não há loja ativa, mostrar fallback amigável em vez de travar
  if (!tenantStoreData && !tenantLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center space-y-6">
        <div className="relative">
          <div className="absolute -inset-4 bg-primary/5 rounded-full blur-2xl animate-pulse" />
          <Store size={80} className="text-primary/20 relative" />
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-2xl font-bold tracking-tight">Sistema em Manutenção</h2>
          <p className="text-muted-foreground">
            O catálogo está sendo preparado. Por favor, tente recarregar a página.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button onClick={() => window.location.reload()} className="gap-2 rounded-full px-8">
            Recarregar Página
          </Button>
          <Button variant="outline" onClick={() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
          }} className="gap-2 rounded-full px-8">
            Limpar Cache e Recarregar
          </Button>
        </div>
      </div>
    );
  }

  const onAdd = (productId: string, qty: number) => {
    const product: any = offerList.find((item: any) => item.id === productId)
      ?? activeProducts.find((item: any) => item.id === productId);
    
    if (!product) return;

    const basePrice = Number(product.price ?? 0);
    const promoPrice = Number(product.promo_price ?? 0);
    const effectivePrice = promoPrice > 0 && promoPrice < basePrice ? promoPrice : basePrice;

    cart.add(productId, qty, {
      name: product.name ?? "Produto",
      unitPrice: effectivePrice,
      unit: product.unit ?? "un",
      imagePath: product.images?.[0]?.path ?? null,
    });
    setCartOpen(true);
  };


  // Improved empty store detection
  const isEmptyStore = !loading && !tenantLoading && activeProducts.length === 0 && !home.loading;

  return (
    <div className="flex flex-col bg-background w-full overflow-x-hidden min-h-screen pt-[var(--store-header-offset,80px)]">
      <AppHeader
        cartCount={cart.totalItems}
        onCartClick={() => setCartOpen(true)}
        footerStoreName={home.footer?.store_name ?? undefined}
        categories={activeCategories as any}
      />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <StoreMobileChrome cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />

      {isEmptyStore ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 px-6 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
           <div className="relative">
              <div className="absolute -inset-4 bg-primary/5 rounded-full blur-2xl animate-pulse" />
              <Store size={80} className="text-primary/20 relative" />
           </div>
           <div className="space-y-2 max-w-md mx-auto">
             <h2 className="text-2xl font-bold tracking-tight">Loja em Construção</h2>
             <p className="text-muted-foreground">
               Seja bem-vindo à <strong>{tenantStore?.name || "nossa nova loja"}</strong>. 
               Estamos preparando o catálogo e as melhores ofertas para você.
             </p>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl pt-8">
              {[
                { icon: Package, title: "Produtos", desc: "Em breve um catálogo completo." },
                { icon: LayoutGrid, title: "Categorias", desc: "Tudo organizado por departamento." },
                { icon: Info, title: "Institucional", desc: "Saiba mais sobre nossa história." },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-2xl border bg-card/50 space-y-2">
                  <item.icon size={20} className="text-primary/60 mx-auto" />
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
              ))}
           </div>
        </div>
      ) : (
        <>
          <div className="main-content w-full overflow-hidden">
            <HomeHeroCarousel banners={home.banners} loading={home.loading} />
          </div>


          <HomeSection
            title="Categorias"
            tone="plain"
            className="pt-3 pb-8 sm:py-12"
            action={
              <Link to="/loja" className="text-sm font-semibold underline underline-offset-4">
                Ver catálogo
              </Link>
            }
          >
            {!phase.categories || (categoriesLoading && !activeCategories.length) ? (
              <CategorySkeleton />
            ) : (
              <HomeCategoriesCarousel categories={activeCategories as any} hideHeader />
            )}

          </HomeSection>

          {/* 🔥 Ofertas section — always shows thanks to fallback */}
          {phase.featured && homeOffers.length > 0 ? (
            <HomeSection
              id="ofertas"
              title=""
              tone="plain"
              className="pt-2 pb-2 sm:pt-4 sm:pb-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground animate-pulse">
                  <Flame className="h-3.5 w-3.5" />
                  Ofertas do dia
                </span>
                <Link to="/ofertas" className="text-xs font-semibold text-muted-foreground underline underline-offset-4 ml-auto">
                  Ver todas
                </Link>
              </div>
              <HomeProductsByIds
                loading={loading && !homeOffers.length}
                productIds={homeOffers.map((o) => o.id)}
                products={homeOffers as any}
                onAdd={onAdd}
                limit={8}
              />

            </HomeSection>
          ) : null}

          <HomeSection
            id="destaques"
            title="Produtos em destaque"
            tone="plain"
            action={
              <Link to="/loja" className="text-sm font-semibold underline underline-offset-4">
                Ver catálogo
              </Link>
            }
          >
            {!phase.featured || (productsLoading && !activeProducts.length) ? (
              <ProductGridSkeleton count={10} />
            ) : (
              <HomeProductsByIds loading={loading} productIds={featuredIds} products={activeProducts as any} onAdd={onAdd} limit={12} />
            )}

          </HomeSection>

          {phase.additional ? (
            <HomeSection
              id="mais-vendidos"
              title="Mais vendidos"
              tone="plain"
              action={
                <Link to="/loja?sort=popular" className="text-sm font-semibold underline underline-offset-4">
                  Ver ranking
                </Link>
              }
            >
              <HomeProductsByIds
                loading={loading && !activeProducts.length}
                productIds={topClickedIds}
                products={activeProducts as any}
                onAdd={onAdd}
                limit={8}
              />

            </HomeSection>
          ) : null}

          {phase.secondary ? (
            <HomeSection title="" tone="plain">
              <HomeGuaranteesMiniBar />
            </HomeSection>
          ) : null}
        </>
      )}

      <StoreFooter footer={home.footer} pageLinks={pageLinks} />
    </div>
  );
}
