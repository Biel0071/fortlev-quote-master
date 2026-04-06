import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useStoreCategories } from "@/hooks/useStoreCategories";
import { useHomeContent } from "@/hooks/useHomeContent";
import { HomeHeroCarousel } from "@/components/store/home/HomeHeroCarousel";
import { CartDrawer } from "@/components/store/CartDrawer";
import { StoreFooter } from "@/components/store/StoreFooter";
import { cloud } from "@/lib/cloud";
import { pickHomeSeo, useDynamicSeo } from "@/hooks/useDynamicSeo";
import { getBannerImageUrls } from "@/utils/bannerStorage";
import { HomeSection } from "@/components/store/home/HomeSection";
import { HomeCategoriesCarousel } from "@/components/store/home/HomeCategoriesCarousel";
import { HomeProductsByIds } from "@/components/store/home/HomeProductsByIds";
import { useHomeMerchandising } from "@/hooks/useHomeMerchandising";
import { HomeGuaranteesMiniBar } from "@/components/store/home/HomeGuaranteesMiniBar";
import { createMicroLoader } from "@/utils/microLoader";
import { AppDownloadBanner } from "@/components/store/AppDownloadBanner";

function SectionSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="h-24 rounded-xl bg-muted/60 animate-pulse" />
      ))}
    </div>
  );
}

export default function StoreHome() {
  const cart = useCart();

  const [phase, setPhase] = useState({
    categories: false,
    featured: false,
    additional: false,
    secondary: false,
  });

  useEffect(() => {
    const loader = createMicroLoader({ chunkSize: 1, idleTimeoutMs: 120 });

    loader.addTask({ priority: "high", run: () => setPhase((p) => ({ ...p, categories: true })) });
    loader.addTask({ priority: "normal", run: () => setPhase((p) => ({ ...p, featured: true })) });
    loader.addTask({ priority: "low", run: () => setPhase((p) => ({ ...p, additional: true })) });
    loader.addTask({ priority: "low", run: () => setPhase((p) => ({ ...p, secondary: true })) });

    return () => loader.clear();
  }, []);

  const home = useHomeContent({ enabled: true });
  const { activeCategories, loading: categoriesLoading } = useStoreCategories({ enabled: phase.categories });
  const { activeProducts, loading: productsLoading } = useStoreProducts({ enabled: phase.featured || phase.additional });
  const merch = useHomeMerchandising({ enabled: phase.additional });

  const [cartOpen, setCartOpen] = useState(false);
  const [pageLinks, setPageLinks] = useState<Array<{ title: string; slug: string }>>([]);

  useEffect(() => {
    if (!phase.secondary) return;

    let alive = true;
    cloud
      .from("store_pages")
      .select("title, slug, sort_order")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (!alive) return;
        setPageLinks(((data ?? []) as any[]).map((x: any) => ({ title: x.title, slug: x.slug })));
      });

    return () => {
      alive = false;
    };
  }, [phase.secondary]);


  const seo = useMemo(() => pickHomeSeo(home.seo), [home.seo]);
  const ogImageUrl = useMemo(() => {
    const urls = getBannerImageUrls(home.seo?.og_image_path ?? null);
    return urls.primary || urls.legacy;
  }, [home.seo?.og_image_path]);
  useDynamicSeo({ title: seo.title, description: seo.description, ogImageUrl, canonicalPath: "/" });

  const loading = productsLoading || categoriesLoading || home.loading || merch.loading;

  const onAdd = (productId: string, qty: number) => {
    const product: any = activeProducts.find((item: any) => item.id === productId);
    const basePrice = Number(product?.price ?? 0);
    const promoPrice = Number(product?.promo_price ?? 0);
    const effectivePrice = promoPrice > 0 && promoPrice < basePrice ? promoPrice : basePrice;

    cart.add(productId, qty, {
      name: product?.name ?? "Produto",
      unitPrice: effectivePrice,
      unit: product?.unit ?? "un",
      imagePath: product?.images?.[0]?.path ?? null,
    });
    setCartOpen(true);
  };

  const featuredIds = useMemo(() => {
    const list = (activeProducts ?? []) as any[];
    const featured = list.filter((p) => p?.featured || p?.best_seller).map((p) => p.id) as string[];
    if (featured.length === 0) return list.slice(0, 8).map((p) => p.id);

    // Priority products to appear first (from curated list)
    const priorityIds = [
      "31f0affc-e596-413e-b113-9c17ef3ecab2", // Caixa 1000L FORTLEV
      "1f6a420a-b46b-4d75-b888-8aa6c1e4ee2a", // Caixa 2000L FORTLEV
      "0b1202d1-d3a5-4271-ad13-eeead2a3f0b3", // Caixa 3000L FORTLEV
      "8b13a472-154d-422b-b567-fb8c726eaada", // Caixa 5000L FORTLEV
      "a787085e-0984-481a-9644-61c08f796870", // Caixa 10000L FORTLEV
      "978068df-f401-4997-803b-81354d216453", // Caixa 500L FORTLEV
      "494af806-59f1-4f5d-bd1a-4cd7b14e3c16", // Caixa 750L FORTLEV
      "cb426409-f5fd-4d4f-9f44-0f94ec5937c0", // Caixa 1500L FORTLEV
      "e5c8e09d-ecba-4da6-b401-aa8fac3cc961", // Caixa 7500L FORTLEV
      "dff3c30d-69d7-47bc-870e-87137e201b4c", // Caixa 15000L FORTLEV
      "daeadbc0-b89e-477f-b8da-28f1eda6688d", // Caixa 20000L FORTLEV
      "9b4e6839-85d2-4310-a249-b8468ece0c83", // Fossa Séptica FORTLEV
      "ea44340a-1b19-42e0-98d7-b19c1e9059d4", // Tanque 5000L FORTLEV
      "710399a9-a49a-46ba-a6d6-8c695ee750d0", // Tanque 10000L FORTLEV
      "c7dd4267-f322-4147-a2cd-6969800c5453", // Caixa 310L FORTLEV
      "38c51f55-fbf0-41c4-b223-b9993e7efb40", // LIZ CP4
      "df447713-81f6-4326-acba-fc83645bfc7c", // LIZ CP2
      "c85ead3d-ae2b-4823-b3a0-75de80041b7c", // Betoneira 400L
      "fef0b373-84d1-4ba7-b341-13f03cbcef38", // Bloco 20
      "9a4875e3-2067-4d8e-b936-56f36fe6b7e4", // Bloco 10
    ];

    const existingPriority = priorityIds.filter((id) => featured.includes(id));
    const rest = featured.filter((id) => !priorityIds.includes(id));
    return [...existingPriority, ...rest];
  }, [activeProducts]);

  const topClickedIds = useMemo(() => {
    const list = (activeProducts ?? []) as any[];
    const clicked = list
      .filter((p) => Number(p?.clicks ?? 0) > 0)
      .sort((a, b) => Number(b.clicks ?? 0) - Number(a.clicks ?? 0))
      .slice(0, 20)
      .map((p) => p.id) as string[];
    if (clicked.length >= 5) return clicked.slice(0, 8);
    const curatedBestSellers = [
      "31f0affc-e596-413e-b113-9c17ef3ecab2",
      "1f6a420a-b46b-4d75-b888-8aa6c1e4ee2a",
      "0b1202d1-d3a5-4271-ad13-eeead2a3f0b3",
      "8b13a472-154d-422b-b567-fb8c726eaada",
      "a787085e-0984-481a-9644-61c08f796870",
      "978068df-f401-4997-803b-81354d216453",
      "38c51f55-fbf0-41c4-b223-b9993e7efb40",
      "fef0b373-84d1-4ba7-b341-13f03cbcef38",
    ];
    const existingIds = new Set(list.map((p) => p.id));
    const validCurated = curatedBestSellers.filter((id) => existingIds.has(id));
    const seen = new Set(clicked);
    const merged = [...clicked];
    for (const id of validCurated) {
      if (!seen.has(id) && merged.length < 8) {
        seen.add(id);
        merged.push(id);
      }
    }
    return merged;
  }, [activeProducts]);

  // Offers: products with active promo_price, sorted by discount %
  const offerIds = useMemo(() => {
    const list = (activeProducts ?? []) as any[];
    return list
      .filter((p) => {
        const price = Number(p?.price ?? 0);
        const promo = Number(p?.promo_price ?? 0);
        return promo > 0 && price > 0 && promo < price;
      })
      .sort((a, b) => {
        const aOff = (Number(a.price) - Number(a.promo_price)) / Number(a.price);
        const bOff = (Number(b.price) - Number(b.promo_price)) / Number(b.price);
        return bOff - aOff;
      })
      .slice(0, 8)
      .map((p) => p.id) as string[];
  }, [activeProducts]);

  return (
    <div className="flex flex-col bg-background w-full overflow-x-hidden">
      <AppDownloadBanner />
      <StoreTopbar cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} footerStoreName={home.footer?.store_name ?? undefined} categories={activeCategories as any} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <StoreMobileChrome cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />

      <div className="w-full overflow-hidden">
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
        {!phase.categories || categoriesLoading ? (
          <SectionSkeleton rows={1} />
        ) : (
          <HomeCategoriesCarousel categories={activeCategories as any} hideHeader />
        )}
      </HomeSection>

      {/* 🔥 Ofertas section */}
      {phase.featured && offerIds.length > 0 ? (
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
          <HomeProductsByIds loading={loading} productIds={offerIds} products={activeProducts as any} onAdd={onAdd} limit={8} />
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
        {!phase.featured ? (
          <SectionSkeleton rows={2} />
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
            loading={loading}
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

      <StoreFooter footer={home.footer} pageLinks={pageLinks} />
    </div>
  );
}
