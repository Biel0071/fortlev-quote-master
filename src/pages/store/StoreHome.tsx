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
import { HomeSecondaryPromoBanner } from "@/components/store/home/HomeSecondaryPromoBanner";
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

  const secondaryBanner = useMemo(() => {
    const list = (home.banners ?? []).slice().sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return list.length > 1 ? list[1] : null;
  }, [home.banners]);

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

      {/* 1) Hero */}
      <div className="pt-4 sm:pt-6">
        <HomeHeroCarousel banners={home.banners} loading={home.loading} />
      </div>

      {/* 2) Categorias principais */}
      <HomeSection title="Categorias" subtitle="Encontre rápido o que você precisa." tone="plain">
        <HomeCategoriesCarousel categories={activeCategories as any} hideHeader />
      </HomeSection>

      {/* 3) Produtos em destaque */}
      <HomeSection
        id="destaques"
        title="Produtos em destaque"
        subtitle="Seleção rápida para você começar — e ir direto ao que importa."
        tone="plain"
        action={
          <Link to="/loja" className="text-sm font-semibold underline underline-offset-4">
            Ver catálogo
          </Link>
        }
      >
        <HomeProductsByIds loading={loading} productIds={featuredIds} products={activeProducts as any} onAdd={onAdd} limit={8} />
      </HomeSection>

      {/* 4) Produtos mais vendidos */}
      <HomeSection
        id="mais-vendidos"
        title="Mais vendidos"
        subtitle="Os 8 itens com maior volume de vendas nos últimos 30 dias."
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

      {/* 5) Banner promocional (opcional) */}
      {secondaryBanner ? (
        <HomeSection title="Promoção" subtitle="Condições especiais selecionadas." tone="alt">
          <HomeSecondaryPromoBanner banner={secondaryBanner as any} />
        </HomeSection>
      ) : null}

      {/* 6) Garantias resumidas */}
      <HomeSection title="" tone="plain">
        <HomeGuaranteesMiniBar />
      </HomeSection>

      {/* 7) Footer */}
      <StoreFooter footer={home.footer} pageLinks={pageLinks} />
    </div>
  );
}


