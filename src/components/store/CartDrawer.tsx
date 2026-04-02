import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useVisitorTracker } from "@/hooks/useVisitorTracker";
import { useCartDetails } from "@/hooks/useCartDetails";
import { CartQuantityStepper } from "@/components/store/cart/CartQuantityStepper";
import { trackClickEvent } from "@/utils/clickTracking";
import { formatCurrency } from "@/utils/formatters";
import { publicImageUrl } from "@/utils/storage";

export function CartDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { cart, lines, subtotal } = useCartDetails();
  const tracker = useVisitorTracker();
  const nav = useNavigate();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] flex flex-col rounded-t-3xl">
        <DrawerHeader className="border-b border-border/70 pb-4">
          <DrawerTitle className="flex items-center gap-2 text-xl tracking-tight">
            <ShoppingCart className="h-5 w-5" />
            Seu carrinho
          </DrawerTitle>
          <DrawerDescription>Revise itens e finalize o pedido.</DrawerDescription>
        </DrawerHeader>

        {/* Scrollable items area with proper bottom padding for sticky footer */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 scroll-smooth">
          {lines.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="py-12 text-center space-y-4">
                <p className="text-muted-foreground">Seu carrinho está vazio</p>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={() => {
                    onOpenChange(false);
                    nav("/loja");
                  }}
                >
                  Ver produtos
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {lines.map((line) => {
                const imageUrl = publicImageUrl("product-images", line.imagePath ?? null);

                return (
                  <div
                    key={line.productId}
                    className="rounded-2xl border border-border/80 bg-card p-3 shadow-sm transition-all duration-200 animate-in fade-in-50 slide-in-from-bottom-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40">
                        {imageUrl ? (
                          <img src={imageUrl} alt={line.name} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="h-full w-full bg-muted" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="line-clamp-2 text-sm sm:text-base font-semibold leading-tight">{line.name}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {line.hasPrice ? `${formatCurrency(line.effectivePrice)} / ${line.unit}` : "Preço em atualização"}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <CartQuantityStepper
                            quantity={line.quantity}
                            compact
                            onDecrease={() => cart.setQty(line.productId, Math.max(1, line.quantity - 1))}
                            onIncrease={() => cart.setQty(line.productId, line.quantity + 1)}
                            onRemove={() => cart.remove(line.productId)}
                          />
                          <div className="text-base sm:text-lg font-bold tabular-nums">{formatCurrency(line.lineTotal)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky footer — uses sticky instead of absolute to avoid overlap */}
        {lines.length > 0 && (
          <div className="sticky bottom-0 border-t border-border/70 bg-background p-4 space-y-3 shadow-[0_-4px_16px_-4px_hsl(var(--foreground)/0.06)]">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-3 space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Frete estimado</span>
                <span>R$ —</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Desconto</span>
                <span>R$ —</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-xl font-extrabold tracking-tight tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
            </div>

            {/* CTA buttons */}
            <Button
              className="h-12 rounded-xl w-full text-base font-semibold"
              onClick={() => {
                trackClickEvent({ sessionToken: tracker.sessionToken, type: "start_checkout" });
                onOpenChange(false);
                nav("/checkout");
              }}
            >
              Finalizar compra
            </Button>

            <div className="flex items-center justify-between">
              <Button variant="ghost" className="h-9 rounded-lg text-xs text-muted-foreground" onClick={cart.clear}>
                Limpar carrinho
              </Button>
              <Button variant="outline" className="h-9 rounded-lg text-xs" onClick={() => { onOpenChange(false); nav("/loja"); }}>
                Continuar comprando
              </Button>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
