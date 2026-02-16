import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useStoreCategories } from "@/hooks/useStoreCategories";
import { useHomeContent } from "@/hooks/useHomeContent";
import { HomeHeroCarousel } from "@/components/store/home/HomeHeroCarousel";
import { HomeBenefitsBar } from "@/components/store/home/HomeBenefitsBar";
import { HomeFeaturedCategories } from "@/components/store/home/HomeFeaturedCategories";
import { HomeCategorySection } from "@/components/store/home/HomeCategorySection";
import { HomePolicies } from "@/components/store/home/HomePolicies";
import { CartDrawer } from "@/components/store/CartDrawer";
import { StoreFooter } from "@/components/store/StoreFooter";
import { cloud } from "@/lib/cloud";

export default function StoreHome() {
  const cart = useCart();
  const { activeProducts, loading: productsLoading } = useStoreProducts();
  const { activeCategories, featuredCategories, loading: categoriesLoading } = useStoreCategories();
  const home = useHomeContent();

  const [cartOpen, setCartOpen] = useState(false);

  // Map products by category for fast rendering
  const productsByCategoryId = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const c of activeCategories) map.set(c.id, []);
    for (const p of activeProducts as any[]) {
      const cid = p.category_id as string | null | undefined;
      if (!cid) continue;
      if (!map.has(cid)) continue;
      map.set(cid, [...(map.get(cid) ?? []), p]);
    }
    return map;
  }, [activeCategories, activeProducts]);

  // Determine which category sections to show:
  // - If admin configured home_sections, follow that order.
  // - Else fallback to all active categories.
  const categorySections = useMemo(() => {
    const configured = (home.sections ?? []).filter((s) => Boolean(s.category_id));
    const base = configured.length > 0 ? configured : activeCategories.map((c, idx) => ({
      id: `fallback-${c.id}`,
      category_id: c.id,
      sort_order: idx,
      title_override: null,
      subtitle_override: null,
      active: true,
    }));

    return base
      .slice()
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((s: any) => {
        const cat = activeCategories.find((c) => c.id === s.category_id);
        if (!cat) return null;
        const products = (productsByCategoryId.get(cat.id) ?? []).slice(0, 8);
        return {
          section: s,
          category: cat,
          products,
        };
      })
      .filter(Boolean) as Array<any>;
  }, [home.sections, activeCategories, productsByCategoryId]);

  const onAdd = (productId: string, qty: number) => {
    cart.add(productId, qty);
    setCartOpen(true);
  };

  // Pull published pages for footer links (CMS already exists)
  const [pageLinks, setPageLinks] = useState<Array<{ title: string; slug: string }>>([]);
  useEffect(() => {
    cloud
      .from("store_pages")
      .select("title, slug, sort_order")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setPageLinks(((data ?? []) as any).map((x: any) => ({ title: x.title, slug: x.slug }))));
  }, []);

  const loading = productsLoading || categoriesLoading || home.loading;

  return (
    <div className="min-h-screen bg-background">
      <StoreTopbar cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <StoreMobileChrome cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-24 md:pb-10 space-y-10">
        {/* 1) HERO / BANNERS ROTATIVOS */}
        <HomeHeroCarousel banners={home.banners} loading={home.loading} />

        {/* 2) BARRA DE VANTAGENS */}
        <HomeBenefitsBar benefits={home.benefits} />

        {/* 3) CATEGORIAS EM DESTAQUE */}
        {featuredCategories.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Cadastre e marque categorias como <span className="font-medium">Destaque</span> em{" "}
              <Link className="underline" to="/admin/categorias">
                /admin/categorias
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          <HomeFeaturedCategories categories={featuredCategories as any} />
        )}

        {/* 4) PRODUTOS POR CATEGORIA */}
        <section className="space-y-4">
          <header className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold">Produtos por categoria</h2>
              <p className="text-sm text-muted-foreground">Escolha a quantidade e adicione ao carrinho sem sair da Home.</p>
            </div>
            <Button asChild variant="ghost">
              <Link to="/loja">Ver tudo</Link>
            </Button>
          </header>

          {loading ? (
            <div className="text-muted-foreground">Carregando vitrine...</div>
          ) : categorySections.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                Não encontrei produtos com categoria vinculada. Em{" "}
                <Link className="underline" to="/admin/produtos">
                  /admin/produtos
                </Link>
                , vincule a categoria do produto.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-10">
              {categorySections.map((x) => (
                <HomeCategorySection
                  key={x.category.id}
                  category={x.category}
                  products={x.products}
                  onAdd={onAdd}
                />
              ))}
            </div>
          )}
        </section>

        {/* 8) POLÍTICAS DA LOJA */}
        <HomePolicies policies={home.policies} />
      </main>

      {/* 9) RODAPÉ COMPLETO */}
      <StoreFooter footer={home.footer} pageLinks={pageLinks} />
    </div>
  );
}
