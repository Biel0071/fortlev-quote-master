import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { formatCurrency } from "@/utils/formatters";

export function CartDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const cart = useCart();
  const nav = useNavigate();
  const { activeProducts } = useStoreProducts();

  const lines = useMemo(() => {
    return cart.lines
      .map((l) => {
        const p: any = activeProducts.find((p) => p.id === l.productId);
        if (!p) return null;
        const effectivePrice = Number(p.promo_price ?? 0) > 0 ? Number(p.promo_price) : Number(p.price);
        return {
          ...l,
          product: p,
          effectivePrice,
          lineTotal: effectivePrice * l.quantity,
        };
      })
      .filter(Boolean) as Array<any>;
  }, [cart.lines, activeProducts]);

  const subtotal = useMemo(() => lines.reduce((acc, l) => acc + l.lineTotal, 0), [lines]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Carrinho</DrawerTitle>
          <DrawerDescription>Revise itens e finalize o pedido.</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-auto">
          {lines.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">Seu carrinho está vazio.</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {lines.map((l) => (
                <div key={l.productId} className="rounded-xl border border-border bg-card/60 backdrop-blur p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium leading-tight line-clamp-2">{l.product.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatCurrency(l.effectivePrice)} / {l.product.unit ?? "un"}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => cart.remove(l.productId)}>
                      Remover
                    </Button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Input
                      className="w-24"
                      type="number"
                      min={0}
                      value={l.quantity}
                      onChange={(e) => cart.setQty(l.productId, Math.max(0, Number(e.target.value) || 0))}
                      aria-label={`Quantidade de ${l.product.name}`}
                    />
                    <div className="font-semibold">{formatCurrency(l.lineTotal)}</div>
                  </div>
                </div>
              ))}

              <div className="rounded-xl border border-border bg-muted/20 p-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Subtotal</div>
                <div className="text-lg font-bold">{formatCurrency(subtotal)}</div>
              </div>
            </div>
          )}
        </div>

        <DrawerFooter>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                nav("/carrinho");
              }}
            >
              Ver carrinho
            </Button>

            <Button
              onClick={() => {
                onOpenChange(false);
                nav("/checkout");
              }}
              disabled={lines.length === 0}
            >
              Finalizar
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <DrawerClose asChild>
              <Button variant="ghost">Continuar comprando</Button>
            </DrawerClose>
            <Button variant="ghost" asChild>
              <Link to="/loja">Catálogo</Link>
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
