import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, Truck, Tag, ArrowRight, Shield, Check } from "lucide-react";
import { AppHeader } from "@/components/store/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { CartQuantityStepper } from "@/components/store/cart/CartQuantityStepper";
import { useVisitorTracker } from "@/hooks/useVisitorTracker";
import { useCartDetails } from "@/hooks/useCartDetails";
import { trackClickEvent } from "@/utils/clickTracking";
import { formatCurrency } from "@/utils/formatters";
import { publicImageUrl } from "@/utils/storage";

function calcShipping(subtotal: number) {
  if (subtotal <= 0) return 0;
  return Math.max(30, subtotal * 0.07);
}

export default function CartPage() {
  const { cart, lines, subtotal } = useCartDetails();
  const tracker = useVisitorTracker();
  const nav = useNavigate();

  const [cep, setCep] = useState("");
  const cepValid = cep.replace(/\D/g, "").length === 8;
  const shipping = useMemo(() => (cepValid ? calcShipping(subtotal) : 0), [cepValid, subtotal]);
  const total = Math.max(0, subtotal + shipping);

  const savings = useMemo(
    () =>
      lines.reduce((acc, l) => {
        const base = Number((l.product as any)?.price ?? 0);
        if (base > l.effectivePrice) acc += (base - l.effectivePrice) * l.quantity;
        return acc;
      }, 0),
    [lines],
  );

  return (
    <div className="flex flex-col bg-background w-full overflow-x-hidden">
      <AppHeader cartCount={cart.totalItems} />
      <StoreMobileChrome cartCount={cart.totalItems} />

      <main className="main-content max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8 pb-28 md:pb-8 space-y-4 sm:space-y-6 min-w-0">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" /> Carrinho
              {lines.length > 0 && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
                  {lines.length} {lines.length === 1 ? "item" : "itens"}
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Revise itens, calcule o frete e finalize.</p>
          </div>
          <Button asChild variant="outline" className="h-11 rounded-xl">
            <Link to="/loja">Continuar comprando</Link>
          </Button>
        </div>

        {lines.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-16 text-center space-y-4">
              <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">Seu carrinho está vazio</p>
              <Button asChild className="h-11 rounded-xl">
                <Link to="/loja">Ver produtos</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr,380px] items-start">
            <section className="space-y-3">
              {lines.map((line) => {
                const imageUrl = publicImageUrl("product-images", line.imagePath ?? null);
                const base = Number((line.product as any)?.price ?? 0);
                const hasPromo = base > line.effectivePrice && line.effectivePrice > 0;

                return (
                  <Card key={line.productId} className="rounded-2xl border-border/80 overflow-hidden">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40">
                          {imageUrl ? (
                            <img src={imageUrl} alt={line.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="h-full w-full bg-muted" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h2 className="text-base sm:text-lg font-semibold leading-tight line-clamp-2">{line.name}</h2>
                            <button
                              type="button"
                              aria-label="Remover item"
                              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                              onClick={() => cart.remove(line.productId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="text-sm">
                            {line.hasPrice ? (
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="font-bold text-foreground">{formatCurrency(line.effectivePrice)}</span>
                                <span className="text-xs text-muted-foreground">/ {line.unit}</span>
                                {hasPromo && (
                                  <span className="text-xs line-through text-muted-foreground">{formatCurrency(base)}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Preço em atualização</span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                            <CartQuantityStepper
                              quantity={line.quantity}
                              onDecrease={() => cart.setQty(line.productId, Math.max(1, line.quantity - 1))}
                              onIncrease={() => cart.setQty(line.productId, line.quantity + 1)}
                              onRemove={() => cart.remove(line.productId)}
                            />
                            <div className="text-lg sm:text-xl font-bold tracking-tight tabular-nums">
                              {formatCurrency(line.lineTotal)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </section>

            <aside className="lg:sticky space-y-3" style={{ top: "calc(var(--store-header-offset, 120px) + 1rem)" }}>
              {/* Frete */}
              <Card className="rounded-2xl border-border/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Calcular frete
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Input
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="Seu CEP (8 dígitos)"
                    value={cep}
                    onChange={(e) => setCep(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    className="h-11 rounded-xl"
                  />
                  {cepValid && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      Frete estimado: <span className="font-semibold text-foreground">{formatCurrency(shipping)}</span>
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Cupom */}
              <Card className="rounded-2xl border-border/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Tag className="h-4 w-4" /> Cupom de desconto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="EX: OBRA10"
                      value={cart.couponCode}
                      onChange={(e) => cart.setCouponCode(e.target.value.toUpperCase())}
                      className="h-11 rounded-xl uppercase"
                    />
                    {cart.couponCode && (
                      <Button
                        variant="outline"
                        className="h-11 rounded-xl px-3"
                        onClick={() => cart.setCouponCode("")}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                  {cart.couponCode && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      ✓ Cupom será validado no checkout
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Resumo */}
              <Card className="rounded-2xl border-border/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Resumo do pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="text-foreground font-medium tabular-nums">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Frete</span>
                      <span className="tabular-nums">{cepValid ? formatCurrency(shipping) : "—"}</span>
                    </div>
                    {savings > 0 && (
                      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Economia</span>
                        <span className="tabular-nums">- {formatCurrency(savings)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border/70 pt-3 flex items-center justify-between">
                    <span className="text-base font-semibold">Total</span>
                    <span className="text-2xl font-extrabold tracking-tight tabular-nums">{formatCurrency(total)}</span>
                  </div>

                  <Button
                    className="h-14 rounded-xl w-full text-base font-bold gap-2"
                    onClick={() => {
                      trackClickEvent({ sessionToken: tracker.sessionToken, type: "start_checkout" });
                      nav("/checkout");
                    }}
                  >
                    Finalizar sua compra <ArrowRight className="h-5 w-5" />
                  </Button>

                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" /> Pagamento 100% seguro
                  </p>

                  <div className="flex justify-between">
                    <Button variant="ghost" className="h-9 rounded-lg text-xs" onClick={cart.clear}>
                      Limpar carrinho
                    </Button>
                    <Button asChild variant="ghost" className="h-9 rounded-lg text-xs">
                      <Link to="/loja">Ver catálogo</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
