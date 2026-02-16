import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { formatCurrency } from "@/utils/formatters";

export default function CartPage() {
  const cart = useCart();
  const nav = useNavigate();
  const { activeProducts } = useStoreProducts();

  const lines = useMemo(() => {
    return cart.lines
      .map((l) => {
        const p = activeProducts.find((p) => p.id === l.productId);
        if (!p) return null;
        return {
          ...l,
          product: p,
          lineTotal: p.price * l.quantity,
        };
      })
      .filter(Boolean) as Array<any>;
  }, [cart.lines, activeProducts]);

  const subtotal = useMemo(() => lines.reduce((acc, l) => acc + l.lineTotal, 0), [lines]);

  return (
    <div className="min-h-screen bg-background">
      <StoreTopbar cartCount={cart.totalItems} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Carrinho</h1>
            <p className="text-sm text-muted-foreground">Revise itens e quantidades.</p>
          </div>
          <Button asChild variant="outline"><Link to="/loja">Continuar comprando</Link></Button>
        </div>

        {lines.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Seu carrinho está vazio.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {lines.map((l) => (
              <Card key={l.productId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{l.product.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm text-muted-foreground">{formatCurrency(l.product.price)} / {l.product.unit ?? "un"}</div>
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-24"
                      type="number"
                      min={0}
                      value={l.quantity}
                      onChange={(e) => cart.setQty(l.productId, Math.max(0, Number(e.target.value) || 0))}
                    />
                    <div className="font-semibold w-28 text-right">{formatCurrency(l.lineTotal)}</div>
                    <Button variant="ghost" onClick={() => cart.remove(l.productId)}>Remover</Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardContent className="py-6 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Subtotal</div>
                <div className="text-xl font-bold">{formatCurrency(subtotal)}</div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cart.clear}>Limpar</Button>
              <Button onClick={() => nav("/checkout")}>Finalizar</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
