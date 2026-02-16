import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { formatCurrency } from "@/utils/formatters";

export default function ProductPage() {
  const { id } = useParams();
  const cart = useCart();
  const { activeProducts, loading } = useStoreProducts();

  const product = useMemo(() => activeProducts.find((p) => p.id === id), [activeProducts, id]);

  return (
    <div className="min-h-screen bg-background">
      <StoreTopbar cartCount={cart.totalItems} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Button asChild variant="ghost" className="mb-4"><Link to="/loja">← Voltar</Link></Button>

        {loading ? (
          <div className="text-muted-foreground">Carregando...</div>
        ) : !product ? (
          <div className="text-muted-foreground">Produto não encontrado.</div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{product.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.description && <p className="text-muted-foreground">{product.description}</p>}

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Unidade: {product.unit ?? "un"}</div>
                <div className="text-xl font-bold">{formatCurrency(product.price)}</div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => cart.add(product.id, 1)}>Adicionar ao carrinho</Button>
                <Button asChild variant="outline"><Link to="/carrinho">Ir ao carrinho</Link></Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
