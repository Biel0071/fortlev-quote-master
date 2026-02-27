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

export default function StoreHome() {
  const cart = useCart();
  const { activeProducts, loading: productsLoading } = useStoreProducts();
  const { activeCategories, loading: categoriesLoading } = useStoreCategories();
  const home = useHomeContent();
  const merch = useHomeMerchandising();

  const [cartOpen, setCartOpen] = useState(false);

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
        <HomeCategoriesCarousel categories={activeCategories as any} hideHeader />
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
        <HomeProductsByIds loading={loading} productIds={featuredIds} products={activeProducts as any} onAdd={onAdd} limit={8} />
      </HomeSection>

      {merch.loading || (merch.monthlyTopSales?.length ?? 0) > 0 ? (
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
            emptyText=""
          />
        </HomeSection>
      ) : null}

      <HomeSection title="" tone="plain">
        <HomeGuaranteesMiniBar />
      </HomeSection>

      <StoreFooter footer={home.footer} pageLinks={pageLinks} />
    </div>
  );
}


