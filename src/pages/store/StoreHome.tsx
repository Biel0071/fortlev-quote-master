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
  const { featuredCategories } = useStoreCategories();

  const featuredProducts = useMemo(() => activeProducts.slice(0, 8), [activeProducts]);

  return (
    <div className="min-h-screen bg-background">
      <StoreTopbar cartCount={cart.totalItems} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Hero / Banner */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-sm overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none opacity-30 fortlev-gradient" />
          <div className="relative flex flex-col gap-4">
            <Badge variant="secondary" className="w-fit">Entrega rápida • Retire ou receba</Badge>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Sua loja de materiais, organizada por categoria</h1>
            <p className="text-muted-foreground max-w-2xl">
              Navegue por categorias, escolha produtos e finalize o pedido. Pagamento via gateway (em breve) para pedidos menores; acima disso você finaliza pelo WhatsApp.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/loja">Ver catálogo</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/carrinho">Ver carrinho</Link></Button>
            </div>
          </div>
        </section>

        {/* Categorias */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Categorias</h2>
            <p className="text-sm text-muted-foreground">Acesse rápido os principais departamentos.</p>
          </div>

          {featuredCategories.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                Cadastre e marque categorias como <span className="font-medium">Destaque</span> em <Link className="underline" to="/admin/categorias">/admin/categorias</Link>.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {featuredCategories.slice(0, 12).map((c) => (
                <Link
                  key={c.id}
                  to={`/loja?categoria=${encodeURIComponent(c.slug)}`}
                  className="rounded-xl border border-border bg-card p-4 hover:bg-muted/30 transition"
                >
                  <div className="font-medium line-clamp-2">{c.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Ver produtos</div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Destaques */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Destaques</h2>
              <p className="text-sm text-muted-foreground">Alguns itens populares para começar.</p>
            </div>
            <Button asChild variant="ghost"><Link to="/loja">Ver tudo</Link></Button>
          </div>

          {loading ? (
            <div className="text-muted-foreground">Carregando...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredProducts.map((p) => (
                <Card key={p.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base line-clamp-2">{p.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">{p.unit ?? "un"}</div>
                      <div className="font-semibold">{formatCurrency(p.price)}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => cart.add(p.id, 1)}>Adicionar</Button>
                      <Button asChild variant="outline"><Link to={`/produto/${p.id}`}>Ver</Link></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Institucional (atalhos) */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold">Institucional</h2>
              <p className="text-sm text-muted-foreground">Políticas e informações importantes.</p>
            </div>
            <Button asChild variant="outline"><Link to="/p/politica-de-privacidade">Ver páginas</Link></Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Materiais de Construção • {new Date().getFullYear()}
      </footer>
    </div>
  );
}
