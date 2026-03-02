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
import { publicImageUrl } from "@/utils/storage";
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

  useEffect(() => {
    const candidates = (home.banners ?? []).slice(0, 2).flatMap((b) => [b.image_desktop_path, b.image_mobile_path, b.image_path]);
    candidates.forEach((path) => {
      const url = publicImageUrl("banner-images", path ?? null);
      if (!url || url.startsWith("blob:")) return;
      const img = new Image();
      img.src = url;
    });
  }, [home.banners]);

  const seo = useMemo(() => pickHomeSeo(home.seo), [home.seo]);
  const ogImageUrl = useMemo(
    () => publicImageUrl("banner-images", home.seo?.og_image_path ?? null),
    [home.seo?.og_image_path],
  );
  useDynamicSeo({ title: seo.title, description: seo.description, ogImageUrl, canonicalPath: "/" });

  const loading = productsLoading || categoriesLoading || home.loading || merch.loading;

  const onAdd = (productId: string, qty: number) => {
    cart.add(productId, qty);
    setCartOpen(true);
  };

  const featuredIds = useMemo(() => {
    const list = (activeProducts ?? []) as any[];
    const featured = list.filter((p) => p?.featured).slice(0, 8).map((p) => p.id) as string[];
    return featured.length > 0 ? featured : list.slice(0, 8).map((p) => p.id);
  }, [activeProducts]);

  return (
    <div className="min-h-screen bg-background">
      <StoreTopbar cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <StoreMobileChrome cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />

      <div className="pt-4 sm:pt-6">
        <HomeHeroCarousel banners={home.banners} loading={home.loading} />
      </div>

      <HomeSection title="Categorias" tone="plain">
        {!phase.categories || categoriesLoading ? (
          <SectionSkeleton rows={1} />
        ) : (
          <HomeCategoriesCarousel categories={activeCategories as any} />
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
          <HomeProductsByIds loading={loading} productIds={featuredIds} products={activeProducts as any} onAdd={onAdd} limit={8} />
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
            productIds={merch.monthlyTopSales}
            products={activeProducts as any}
            onAdd={onAdd}
            limit={8}
            emptyText="Sem vendas registradas neste período."
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
