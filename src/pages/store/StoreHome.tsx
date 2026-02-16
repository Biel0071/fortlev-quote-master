import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useStoreCategories } from "@/hooks/useStoreCategories";
import { formatCurrency } from "@/utils/formatters";

export default function StoreHome() {
  const cart = useCart();
  const { activeProducts, loading } = useStoreProducts();
  const { activeCategories, featuredCategories } = useStoreCategories();

  const featuredProducts = useMemo(() => activeProducts.filter((p: any) => p.featured).slice(0, 8), [activeProducts]);

  const sections = useMemo(() => {
    const byId = new Map<string, typeof activeProducts>();
    for (const c of activeCategories) {
      byId.set(c.id, []);
    }

    for (const p of activeProducts as any[]) {
      const cid = p.category_id as string | null | undefined;
      if (!cid) continue;
      if (!byId.has(cid)) continue;
      byId.set(cid, [...(byId.get(cid) ?? []), p]);
    }

    return activeCategories
      .map((c) => ({
        category: c,
        products: (byId.get(c.id) ?? []).slice(0, 8),
      }))
      .filter((s) => s.products.length > 0);
  }, [activeCategories, activeProducts]);

  return (
    <div className="min-h-screen bg-background">
      <StoreTopbar cartCount={cart.totalItems} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Hero / Banner (industrial / glass) */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 opacity-25 fortlev-gradient" />
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-muted/40 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-muted/30 blur-3xl" />
          </div>

          <div className="relative p-6 sm:p-10">
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7 space-y-4">
                <Badge variant="secondary" className="w-fit">
                  Entrega rápida • Retire ou receba
                </Badge>

                <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.05]">
                  Materiais de construção, organizados por categoria
                </h1>

                <p className="text-muted-foreground max-w-2xl">
                  Navegue por categorias e finalize seu pedido. Pagamento via gateway (em breve) para pedidos menores; acima
                  disso você finaliza pelo WhatsApp.
                </p>

                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link to="/loja">Ver catálogo</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/carrinho">Ver carrinho</Link>
                  </Button>
                </div>
              </div>

              {/* Bento highlights */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-3">
                <Card className="col-span-2 rounded-2xl bg-muted/20 backdrop-blur supports-[backdrop-filter]:bg-muted/10">
                  <CardContent className="p-5">
                    <div className="text-sm text-muted-foreground">Compra simples</div>
                    <div className="mt-1 font-semibold">Adicione ao carrinho e finalize em minutos</div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl bg-muted/20 backdrop-blur supports-[backdrop-filter]:bg-muted/10">
                  <CardContent className="p-5">
                    <div className="text-sm text-muted-foreground">Categorias</div>
                    <div className="mt-1 font-semibold">Acesso rápido por departamento</div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl bg-muted/20 backdrop-blur supports-[backdrop-filter]:bg-muted/10">
                  <CardContent className="p-5">
                    <div className="text-sm text-muted-foreground">Retire ou receba</div>
                    <div className="mt-1 font-semibold">Flexibilidade na entrega</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Categorias (atalhos) */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Categorias</h2>
            <p className="text-sm text-muted-foreground">Acesse rápido os principais departamentos.</p>
          </div>

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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {featuredCategories.slice(0, 12).map((c) => (
                <Link
                  key={c.id}
                  to={`/loja?categoria=${encodeURIComponent(c.slug)}`}
                  className="group rounded-2xl border border-border bg-card p-4 hover:bg-muted/30 transition"
                >
                  <div className="font-medium line-clamp-2">{c.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground group-hover:text-foreground/70 transition">
                    Ver produtos
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Materiais de Construção (por categoria/divisão) */}
        <section className="space-y-4">
          <header className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold">Materiais de Construção</h2>
              <p className="text-sm text-muted-foreground">Produtos organizados por categorias e divisões.</p>
            </div>
            <Button asChild variant="ghost">
              <Link to="/loja">Ver tudo</Link>
            </Button>
          </header>

          {loading ? (
            <div className="text-muted-foreground">Carregando...</div>
          ) : sections.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                Não encontrei produtos com categoria vinculada. Em <Link className="underline" to="/admin/produtos">/admin/produtos</Link>,
                preencha a categoria do produto (ex.: o <span className="font-medium">slug</span> da categoria).
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {sections.map((s) => (
                <section key={s.category.id} className="space-y-3">
                  <div className="flex items-end justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="text-lg font-semibold">{s.category.name}</h3>
                      {s.category.description ? (
                        <p className="text-sm text-muted-foreground">{s.category.description}</p>
                      ) : null}
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/loja?categoria=${encodeURIComponent(s.category.slug)}`}>Ver mais</Link>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {s.products.map((p: any) => {
                      const effectivePrice = Number(p.promo_price ?? 0) > 0 ? Number(p.promo_price) : Number(p.price);
                      return (
                        <Card key={p.id} className="overflow-hidden rounded-2xl">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base line-clamp-2">{p.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-muted-foreground">{p.unit ?? "un"}</div>
                              <div className="text-right">
                                {Number(p.promo_price ?? 0) > 0 ? (
                                  <div className="text-xs text-muted-foreground line-through">{formatCurrency(Number(p.price))}</div>
                                ) : null}
                                <div className="font-semibold">{formatCurrency(effectivePrice)}</div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button className="flex-1" onClick={() => cart.add(p.id, 1)}>
                                Adicionar
                              </Button>
                              <Button asChild variant="outline">
                                <Link to={`/produto/${p.id}`}>Ver</Link>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        {/* Destaques (fallback caso não queira usar por categorias) */}
        {featuredProducts.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold">Mais procurados</h2>
                <p className="text-sm text-muted-foreground">Alguns itens populares para começar.</p>
              </div>
              <Button asChild variant="ghost">
                <Link to="/loja">Ver tudo</Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredProducts.map((p) => (
                <Card key={p.id} className="overflow-hidden rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base line-clamp-2">{p.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">{p.unit ?? "un"}</div>
                      <div className="font-semibold">{formatCurrency(p.price)}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => cart.add(p.id, 1)}>
                        Adicionar
                      </Button>
                      <Button asChild variant="outline">
                        <Link to={`/produto/${p.id}`}>Ver</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        {/* Institucional (atalhos) */}
        <section className="rounded-3xl border border-border bg-card p-6 sm:p-8">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold">Institucional</h2>
              <p className="text-sm text-muted-foreground">Políticas e informações importantes.</p>
            </div>
            <Button asChild variant="outline">
              <Link to="/p/politica-de-privacidade">Ver páginas</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Materiais de Construção • {new Date().getFullYear()}
      </footer>
    </div>
  );
}
