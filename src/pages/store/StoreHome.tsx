import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useStoreCategories } from "@/hooks/useStoreCategories";
import { useHomeContent } from "@/hooks/useHomeContent";
import { HomeHeroCarousel } from "@/components/store/home/HomeHeroCarousel";
import { HomeBenefitsBar } from "@/components/store/home/HomeBenefitsBar";
import { HomeFeaturedProducts } from "@/components/store/home/HomeFeaturedProducts";
import { HomeWeeklyOffers } from "@/components/store/home/HomeWeeklyOffers";
import { HomePolicies } from "@/components/store/home/HomePolicies";
import { CartDrawer } from "@/components/store/CartDrawer";
import { StoreFooter } from "@/components/store/StoreFooter";
import { cloud } from "@/lib/cloud";
import { pickHomeSeo, useDynamicSeo } from "@/hooks/useDynamicSeo";
import { publicImageUrl } from "@/utils/storage";
import { HomeSection } from "@/components/store/home/HomeSection";
import { HomeMainCategoriesGrid } from "@/components/store/home/HomeMainCategoriesGrid";
import { HomeSecondaryPromoBanner } from "@/components/store/home/HomeSecondaryPromoBanner";
import { HomeTrustBlock } from "@/components/store/home/HomeTrustBlock";

export default function StoreHome() {
  const cart = useCart();
  const { activeProducts, loading: productsLoading } = useStoreProducts();
  const { activeCategories, loading: categoriesLoading } = useStoreCategories();
  const home = useHomeContent();

  const [cartOpen, setCartOpen] = useState(false);

  const seo = useMemo(() => pickHomeSeo(home.seo), [home.seo]);
  const ogImageUrl = useMemo(
    () => publicImageUrl("banner-images", home.seo?.og_image_path ?? null),
    [home.seo?.og_image_path],
  );
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

  const secondaryBanner = useMemo(() => {
    const list = (home.banners ?? []).slice().sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return list.length > 1 ? list[1] : null;
  }, [home.banners]);

  return (
    <div className="min-h-screen bg-background">
      <StoreTopbar cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <StoreMobileChrome cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />

      {/* 1) Banner principal grande (full width) */}
      <div className="px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="max-w-6xl mx-auto">
          <HomeHeroCarousel banners={home.banners} loading={home.loading} />
        </div>
      </div>

      {/* 2) Benefícios */}
      <HomeSection
        title="Compre com confiança"
        subtitle="Entrega rápida, desconto no Pix, retirada na loja e pagamento seguro."
        tone="plain"
      >
        <HomeBenefitsBar benefits={home.benefits} />
      </HomeSection>

      {/* 3) Categorias principais (2x3) */}
      <HomeSection
        id="categorias"
        title="Categorias principais"
        subtitle="Encontre rápido: escolha um departamento e veja os produtos."
        tone="alt"
        action={
          <Link to="/loja" className="text-sm font-semibold underline underline-offset-4">
            Ver catálogo
          </Link>
        }
      >
        <HomeMainCategoriesGrid categories={activeCategories as any} />
      </HomeSection>

      {/* 4) Ofertas da semana */}
      <HomeSection
        id="ofertas"
        title="Ofertas da semana"
        subtitle="Preços especiais por tempo limitado — aproveite agora."
        tone="plain"
      >
        <HomeWeeklyOffers loading={loading} offers={home.offers as any} products={activeProducts as any} onAdd={onAdd} hideHeader />
      </HomeSection>

      {/* 5) Mais vendidos */}
      <HomeSection
        id="mais-vendidos"
        title="Mais vendidos"
        subtitle="Os itens com melhor giro e maior procura na loja."
        tone="alt"
        action={
          <Link to="/loja?sort=popular" className="text-sm font-semibold underline underline-offset-4">
            Ver ranking
          </Link>
        }
      >
        <HomeFeaturedProducts loading={loading} products={activeProducts as any} onAdd={onAdd} hideHeader />
      </HomeSection>

      {/* 6) Banner secundário promocional */}
      <HomeSection title="Promoção em destaque" subtitle="Condições especiais selecionadas." tone="plain">
        <HomeSecondaryPromoBanner banner={secondaryBanner as any} />
      </HomeSection>

      {/* 7) Institucional / confiança */}
      <HomeSection title="Loja organizada para você comprar rápido" subtitle="Informações claras, navegação simples e suporte quando precisar." tone="alt">
        <HomeTrustBlock />
      </HomeSection>

      {/* 8) Políticas */}
      <HomeSection title="Políticas" subtitle="Entrega, troca e atendimento — tudo bem explicado." tone="plain">
        <HomePolicies policies={home.policies} hideHeader />
      </HomeSection>

      {/* 9) Rodapé */}
      <StoreFooter footer={home.footer} pageLinks={pageLinks} />
    </div>
  );
}

