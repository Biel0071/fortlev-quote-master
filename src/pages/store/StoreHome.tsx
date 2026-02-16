import { useEffect, useMemo, useState } from "react";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useStoreCategories } from "@/hooks/useStoreCategories";
import { useHomeContent } from "@/hooks/useHomeContent";
import { HomeHeroCarousel } from "@/components/store/home/HomeHeroCarousel";
import { HomeCategoriesCarousel } from "@/components/store/home/HomeCategoriesCarousel";
import { HomeBenefitsBar } from "@/components/store/home/HomeBenefitsBar";
import { HomeFeaturedProducts } from "@/components/store/home/HomeFeaturedProducts";
import { HomeWeeklyOffers } from "@/components/store/home/HomeWeeklyOffers";
import { HomeFeaturedCategoriesGrid } from "@/components/store/home/HomeFeaturedCategoriesGrid";
import { HomePolicies } from "@/components/store/home/HomePolicies";
import { CartDrawer } from "@/components/store/CartDrawer";
import { StoreFooter } from "@/components/store/StoreFooter";
import { cloud } from "@/lib/cloud";
import { pickHomeSeo, useDynamicSeo } from "@/hooks/useDynamicSeo";
import { publicImageUrl } from "@/utils/storage";


export default function StoreHome() {
  const cart = useCart();
  const { activeProducts, loading: productsLoading } = useStoreProducts();
  const { activeCategories, featuredCategories, loading: categoriesLoading } = useStoreCategories();
  const home = useHomeContent();

  const [cartOpen, setCartOpen] = useState(false);

  const seo = useMemo(() => pickHomeSeo(home.seo), [home.seo]);
  const ogImageUrl = useMemo(() => publicImageUrl("banner-images", home.seo?.og_image_path ?? null), [home.seo?.og_image_path]);
  useDynamicSeo({ title: seo.title, description: seo.description, ogImageUrl, canonicalPath: "/" });

  const loading = productsLoading || categoriesLoading || home.loading;

  const onAdd = (productId: string, qty: number) => {
    cart.add(productId, qty);
    setCartOpen(true);
  };

  // Pull published pages for footer links
  const [pageLinks, setPageLinks] = useState<Array<{ title: string; slug: string }>>([]);
  useEffect(() => {
    cloud
      .from("store_pages")
      .select("title, slug, sort_order")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setPageLinks(((data ?? []) as any).map((x: any) => ({ title: x.title, slug: x.slug }))));
  }, []);


  return (
    <div className="min-h-screen bg-background">
      <StoreTopbar cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <StoreMobileChrome cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-10 space-y-10">
        {/* 1) HERO */}
        <HomeHeroCarousel banners={home.banners} loading={home.loading} />

        {/* 2) CATEGORIAS (carrossel) */}
        <HomeCategoriesCarousel categories={activeCategories as any} />

        {/* 3) BENEFÍCIOS */}
        <HomeBenefitsBar benefits={home.benefits} />

        {/* 4) PRODUTOS EM DESTAQUE (híbrido: métricas + flags) */}
        <HomeFeaturedProducts loading={loading} products={activeProducts as any} onAdd={onAdd} />

        {/* 5) OFERTAS DA SEMANA (maior % off, com fallback) */}
        <HomeWeeklyOffers loading={loading} offers={home.offers as any} products={activeProducts as any} onAdd={onAdd} />

        {/* 6) CATEGORIAS EM DESTAQUE (grid) */}
        <HomeFeaturedCategoriesGrid categories={featuredCategories as any} />

        {/* 7) POLÍTICAS */}
        <HomePolicies policies={home.policies} />
      </main>

      {/* 8) RODAPÉ */}
      <StoreFooter footer={home.footer} pageLinks={pageLinks} />
    </div>
  );
}
