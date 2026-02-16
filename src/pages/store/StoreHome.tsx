import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { formatCurrency } from "@/utils/formatters";

export default function StoreHome() {
  const cart = useCart();
  const { activeProducts, loading } = useStoreProducts();

  const featured = useMemo(() => activeProducts.slice(0, 8), [activeProducts]);

  return (
    <div className="min-h-screen bg-background">
      <StoreTopbar cartCount={cart.totalItems} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-sm">
          <div className="flex flex-col gap-4">
            <Badge variant="secondary" className="w-fit">Entrega rápida • Retire ou receba</Badge>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Tudo para sua obra, do básico ao acabamento</h1>
            <p className="text-muted-foreground max-w-2xl">
              Explore o catálogo completo, monte seu carrinho e finalize: pedidos abaixo de R$ 1000 terão pagamento via gateway (em breve);
              acima disso você finaliza pelo WhatsApp.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/loja">Ver catálogo</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/dashboard">Acessar sistemas</Link></Button>
            </div>
          </div>
        </section>

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
              {featured.map((p) => (
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
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Materiais de Construção • {new Date().getFullYear()}
      </footer>
    </div>
  );
}
