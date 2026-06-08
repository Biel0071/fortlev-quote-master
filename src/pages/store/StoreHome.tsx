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
    featured: true,
    additional: true,
    secondary: true,
  });


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

  const { isLoading: tenantLoading } = useTenant();
  const loading = tenantLoading || (productsLoading && !activeProducts.length) || (categoriesLoading && !activeCategories.length);

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

  const featuredIds = useMemo(() => {
    const list = (activeProducts ?? []) as any[];
    
    // Manual curated list from products that are known to exist in the database
    const priorityIds = [
      "03819be8-a77b-4d60-96d2-b6c8cc9e7def", // Rejunte Porcelanato Quartzolit Cinza
      "032c1f20-b0d2-4e67-b0df-e9131a721b1b", // Copan Cinza Esmaltado Retificado Polido
      "02ab63db-9e50-47a1-841d-9a1a91578ece", // Quantum Carrara Monoporosa Retificado
      "01d93094-4e12-42ce-8c7d-89a806d1a952", // Tanque Simples 0,60x0,60
      "01812cf2-293a-449e-9d33-e52e0f23a97b", // Porcelanato Esmaltado Retificado Polido Merapi
      "01591e6e-ef8a-4099-a573-c0911afa44d4", // Porcelanato Retificado Acetinado Red Wood
      "0121fee5-4597-4587-8db7-1c995433a6f2", // Lavatório 57,5x44,5
      "010e5819-8c4e-4805-a717-bd3a7c78caa3", // Lâmpada Bulbo 20w
      "00f3d990-e252-4b41-ae25-1a265a5c63dc", // Porcelanato Retificado Acetinado Cannes
      "00947366-bb2b-42f4-b2bb-9b7f6c7c0269", // Composite Cinza Retificado
    ];

    const availablePriority = priorityIds.filter(id => list.some(p => p.id === id));
    const featured = list.filter((p) => p?.featured || p?.best_seller).map((p) => p.id) as string[];
    
    const combined = Array.from(new Set([...availablePriority, ...featured]));
    if (combined.length === 0) return list.slice(0, 12).map((p) => p.id);
    return combined;
  }, [activeProducts]);

  const topClickedIds = useMemo(() => {
    const list = (activeProducts ?? []) as any[];
    
    // Sort by sales first, then clicks
    const bestSellers = list
      .filter((p) => p.active)
      .sort((a, b) => {
        const salesDiff = Number(b.sales ?? 0) - Number(a.sales ?? 0);
        if (salesDiff !== 0) return salesDiff;
        return Number(b.clicks ?? 0) - Number(a.clicks ?? 0);
      })
      .slice(0, 20)
      .map((p) => p.id) as string[];

    if (bestSellers.length >= 8) return bestSellers.slice(0, 10);

    // Fallback logic if we don't have enough best sellers
    const curatedBestSellers = [
      "02de1596-a108-46a4-b573-d2ad45f34f03", // TUBO PVC SOLDAVEL
      "02f62535-85fc-468c-902d-59102be9ec2e", // Ducha Higiênica MK Metais
      "03683b00-e191-45c6-8ce5-083411155f5d", // Moulin Plus Retificado
      "009a5f35-914e-4d59-a049-8e4768f3bb42", // Revestimento Brilhante Branco Neve
      "00519ccf-7977-4fb0-9b31-d53ded4319ec", // Chuveiro Redondo Touch Clean
      "0021e9ab-44b0-4d4c-b4aa-ead382213c4f", // Porcelanato Retificado Detroit Sand
      "001fb53a-ea75-4803-88b6-449cc269133b", // Valvula N2 Pia Amanco
    ];
    const existingIds = new Set(list.map((p) => p.id));
    const validCurated = curatedBestSellers.filter((id) => existingIds.has(id));
    
    const combined = Array.from(new Set([...bestSellers, ...validCurated]));
    return combined.slice(0, 12);
  }, [activeProducts]);

  // Offer products from the new hook (always populated)
  const homeOffers = useMemo(() => offerList.slice(0, 8), [offerList]);

  const isEmptyStore = !loading && !tenantLoading && activeProducts.length === 0 && (activeCategories?.length === 0 || !activeCategories) && (home.banners?.length === 0 || !home.banners);

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
