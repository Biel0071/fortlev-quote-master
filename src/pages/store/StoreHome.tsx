import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
      "38c51f55-fbf0-41c4-b223-b9993e7efb40", // LIZ CP4
      "df447713-81f6-4326-acba-fc83645bfc7c", // LIZ CP2
      "c85ead3d-ae2b-4823-b3a0-75de80041b7c", // Betoneira 400L
      "fef0b373-84d1-4ba7-b341-13f03cbcef38", // Bloco 20
      "9a4875e3-2067-4d8e-b936-56f36fe6b7e4", // Bloco 10
      "4cb67f3a-fe47-40c9-88c6-647377e8e6b1", // Bloco 14
      "f2ebaf40-e55b-42f4-9ae6-9a1b959b5e7d", // Brita 0
      "79696562-7535-4891-a52f-9529095bd9c3", // Brita 1
      "b0c6e965-941b-4091-a8cb-5e4a9f90af9f", // AC I
      "e4b69c28-a2ae-4b20-9a31-d412faec6bde", // AC II
      "9051155f-bc01-400f-ac59-f1c96dc4525a", // AC III
      "0b1202d1-d3a5-4271-ad13-eeead2a3f0b3", // Caixa 3000L
      "8b8f783f-47e3-492c-a1ba-82f7e27ace4c", // Tijolo 12 furos
      "46742601-a3b6-48fc-8060-616cebc0e8d1", // Tijolo 9 furos
      "beea05b0-ff59-4b5f-9f28-890418cbab8e", // Telha Precon
      "1b4511bd-1a4f-4aec-a667-8beaeef12169", // KMR 10000L
      "8b13a472-154d-422b-b567-fb8c726eaada", // Fortlev 5000L
      "1f6a420a-b46b-4d75-b888-8aa6c1e4ee2a", // Fortlev 2000L
      "31f0affc-e596-413e-b113-9c17ef3ecab2", // Fortlev 1000L
      "a787085e-0984-481a-9644-61c08f796870", // Fortlev 10000L
    ];

    const existingPriority = priorityIds.filter((id) => featured.includes(id));
    const rest = featured.filter((id) => !priorityIds.includes(id));
    return [...existingPriority, ...rest];
  }, [activeProducts]);

  const topClickedIds = useMemo(() => {
    const list = (activeProducts ?? []) as any[];

    // Real click-based ranking
    const clicked = list
      .filter((p) => Number(p?.clicks ?? 0) > 0)
      .sort((a, b) => Number(b.clicks ?? 0) - Number(a.clicks ?? 0))
      .slice(0, 20)
      .map((p) => p.id) as string[];

    // If we have enough real data (5+), use it
    if (clicked.length >= 5) return clicked.slice(0, 8);

    // Otherwise fallback to curated best-sellers list
    const curatedBestSellers = [
      "38c51f55-fbf0-41c4-b223-b9993e7efb40", // LIZ CP4
      "df447713-81f6-4326-acba-fc83645bfc7c", // LIZ CP2
      "c85ead3d-ae2b-4823-b3a0-75de80041b7c", // Betoneira 400L
      "fef0b373-84d1-4ba7-b341-13f03cbcef38", // Bloco 20
      "9a4875e3-2067-4d8e-b936-56f36fe6b7e4", // Bloco 10
      "f2ebaf40-e55b-42f4-9ae6-9a1b959b5e7d", // Brita 0
      "79696562-7535-4891-a52f-9529095bd9c3", // Brita 1
      "0b1202d1-d3a5-4271-ad13-eeead2a3f0b3", // Caixa 3000L
    ];

    const existingIds = new Set(list.map((p) => p.id));
    const validCurated = curatedBestSellers.filter((id) => existingIds.has(id));

    // Merge: real clicks first, then curated to fill remaining slots
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

  return (
    <div className="flex flex-col bg-background w-full overflow-x-hidden">
      <StoreTopbar cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} footerStoreName={home.footer?.store_name ?? undefined} categories={activeCategories as any} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <StoreMobileChrome cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />

      <div className="pt-2 sm:pt-6 w-full overflow-hidden">
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
