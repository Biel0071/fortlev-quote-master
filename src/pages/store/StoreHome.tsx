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
import { HomeWeeklyOffers } from "@/components/store/home/HomeWeeklyOffers";
import { HomePolicies } from "@/components/store/home/HomePolicies";
import { CartDrawer } from "@/components/store/CartDrawer";
import { StoreFooter } from "@/components/store/StoreFooter";
import { cloud } from "@/lib/cloud";
import { pickHomeSeo, useDynamicSeo } from "@/hooks/useDynamicSeo";
import { publicImageUrl } from "@/utils/storage";
import { HomeSection } from "@/components/store/home/HomeSection";
import { HomeSecondaryPromoBanner } from "@/components/store/home/HomeSecondaryPromoBanner";
import { HomeTrustBlock } from "@/components/store/home/HomeTrustBlock";
import { HomeCategoriesCarousel } from "@/components/store/home/HomeCategoriesCarousel";
import { HomeProductsByIds } from "@/components/store/home/HomeProductsByIds";
import { useHomeMerchandising } from "@/hooks/useHomeMerchandising";

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

  const showcaseIds = useMemo(() => {
    // Start listing store items after categories carousel.
    return (activeProducts ?? []).slice(0, 8).map((p: any) => p.id) as string[];
  }, [activeProducts]);

  return (
    <div className="min-h-screen bg-background">
      <StoreTopbar cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <StoreMobileChrome cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />

      {/* 1) Banner principal (carrossel) - full width */}
      <div className="pt-4 sm:pt-6">
        <HomeHeroCarousel banners={home.banners} loading={home.loading} />
      </div>

      {/* 2) Carrossel de categorias */}
      <HomeSection title="Categorias" subtitle="Navegue por departamentos e encontre rápido." tone="plain">
        <HomeCategoriesCarousel categories={activeCategories as any} />
      </HomeSection>

      {/* 3) Início dos itens da loja */}
      <HomeSection
        id="itens"
        title="Itens da loja"
        subtitle="Sugestões para começar — veja o catálogo completo quando quiser."
        tone="alt"
        action={
          <Link to="/loja" className="text-sm font-semibold underline underline-offset-4">
            Ver catálogo
          </Link>
        }
      >
        <HomeProductsByIds loading={loading} productIds={showcaseIds} products={activeProducts as any} onAdd={onAdd} limit={8} />
      </HomeSection>

      {/* Benefícios */}
      <HomeSection
        title="Compre com confiança"
        subtitle="Entrega rápida, desconto no Pix, retirada na loja e pagamento seguro."
        tone="plain"
      >
        <HomeBenefitsBar benefits={home.benefits} />
      </HomeSection>

      {/* Ofertas da semana (misto: mais vistos + gerou pedidos + mais vendidos) */}
      <HomeSection
        id="ofertas"
        title="Ofertas da semana"
        subtitle="Os produtos que mais chamaram atenção e mais giraram recentemente."
        tone="alt"
      >
        <HomeWeeklyOffers
          loading={loading}
          offers={home.offers as any}
          products={activeProducts as any}
          onAdd={onAdd}
          hideHeader
          productIds={merch.weeklyPicks}
          badgesByProductId={merch.weeklyBadges}
        />
      </HomeSection>

      {/* 8 itens com maior volume de vendas no mês */}
      <HomeSection
        id="mais-vendidos"
        title="Top vendas do mês"
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

      {/* Banner secundário promocional */}
      <HomeSection title="Promoção em destaque" subtitle="Condições especiais selecionadas." tone="alt">
        <HomeSecondaryPromoBanner banner={secondaryBanner as any} />
      </HomeSection>

      {/* Institucional / confiança */}
      <HomeSection title="Loja organizada para você comprar rápido" subtitle="Informações claras, navegação simples e suporte quando precisar." tone="plain">
        <HomeTrustBlock />
      </HomeSection>

      {/* Políticas */}
      <HomeSection title="Políticas" subtitle="Entrega, troca e atendimento — tudo bem explicado." tone="alt">
        <HomePolicies policies={home.policies} hideHeader />
      </HomeSection>

      {/* Rodapé */}
      <StoreFooter footer={home.footer} pageLinks={pageLinks} />
    </div>
  );
}


