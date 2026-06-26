import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, Truck, Tag, ArrowRight } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useVisitorTracker } from "@/hooks/useVisitorTracker";
import { useCartDetails } from "@/hooks/useCartDetails";
import { CartQuantityStepper } from "@/components/store/cart/CartQuantityStepper";
import { trackClickEvent } from "@/utils/clickTracking";
import { formatCurrency } from "@/utils/formatters";
import { publicImageUrl } from "@/utils/storage";

function calcShipping(subtotal: number) {
  if (subtotal <= 0) return 0;
  return Math.max(30, subtotal * 0.07);
}

export function CartDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { cart, lines, subtotal } = useCartDetails();
  const tracker = useVisitorTracker();
  const nav = useNavigate();

  const [cep, setCep] = useState("");
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number } | null>(null);

  const shipping = useMemo(() => (cep.replace(/\D/g, "").length === 8 ? calcShipping(subtotal) : 0), [cep, subtotal]);
  const discount = couponApplied?.discount ?? 0;
  const total = Math.max(0, subtotal + shipping - discount);
  const savings = lines.reduce((acc, l) => {
    const base = Number((l.product as any)?.price ?? 0);
    if (base > l.effectivePrice) acc += (base - l.effectivePrice) * l.quantity;
    return acc;
  }, 0) + discount;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] flex flex-col rounded-t-3xl">
        <DrawerHeader className="border-b border-border/70 pb-4">
          <DrawerTitle className="flex items-center gap-2 text-xl tracking-tight">
            <ShoppingCart className="h-5 w-5" />
            Seu carrinho
            {lines.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {lines.length} {lines.length === 1 ? "item" : "itens"}
              </span>
            )}
          </DrawerTitle>
          <DrawerDescription>Revise os itens, calcule o frete e finalize.</DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 scroll-smooth">
          {lines.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="py-12 text-center space-y-4">
                <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground/40" />
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
                      <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40">
                        {imageUrl ? (
                          <img src={imageUrl} alt={line.name} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="h-full w-full bg-muted" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="line-clamp-2 text-sm sm:text-base font-semibold leading-tight">{line.name}</div>
                          <button
                            type="button"
                            aria-label="Remover item"
                            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            onClick={() => cart.remove(line.productId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {line.hasPrice ? (
                            <>
                              <span className="font-semibold text-foreground">{formatCurrency(line.effectivePrice)}</span>
                              <span> / {line.unit}</span>
                            </>
                          ) : (
                            "Preço em atualização"
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
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

              {/* CEP + Cupom */}
              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" /> Calcular frete
                </label>
                <Input
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="Seu CEP (somente números)"
                  value={cep}
                  onChange={(e) => setCep(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  className="h-11 rounded-xl"
                />
                {cep.length === 8 && (
                  <p className="text-xs text-muted-foreground">Frete estimado: <span className="font-semibold text-foreground">{formatCurrency(shipping)}</span></p>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" /> Cupom de desconto
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite o código"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                    className="h-11 rounded-xl uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl px-4"
                    onClick={() => {
                      // validação completa acontece no checkout; aqui só marca o código
                      if (coupon.trim()) setCouponApplied({ code: coupon.trim(), discount: 0 });
                    }}
                  >
                    Aplicar
                  </Button>
                </div>
                {couponApplied && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    ✓ Cupom <span className="font-semibold">{couponApplied.code}</span> será validado no checkout.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {lines.length > 0 && (
          <div className="sticky bottom-0 border-t border-border/70 bg-background p-4 space-y-3 shadow-[0_-4px_16px_-4px_hsl(var(--foreground)/0.06)]">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-3 space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Frete {cep.length < 8 && <em className="not-italic text-xs">(informe o CEP)</em>}</span>
                <span className="tabular-nums">{cep.length === 8 ? formatCurrency(shipping) : "—"}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Desconto</span>
                  <span className="tabular-nums">- {formatCurrency(discount)}</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-xl font-extrabold tracking-tight tabular-nums">{formatCurrency(total)}</span>
              </div>
              {savings > 0 && (
                <p className="pt-1 text-xs text-emerald-600 dark:text-emerald-400">
                  🎉 Você economiza {formatCurrency(savings)} neste pedido
                </p>
              )}
            </div>

            <Button
              className="h-14 rounded-xl w-full text-base font-bold gap-2"
              onClick={() => {
                trackClickEvent({ sessionToken: tracker.sessionToken, type: "start_checkout" });
                onOpenChange(false);
                nav("/checkout");
              }}
            >
              Finalizar sua compra <ArrowRight className="h-5 w-5" />
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
