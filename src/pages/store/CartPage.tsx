import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { CartQuantityStepper } from "@/components/store/cart/CartQuantityStepper";
import { useVisitorTracker } from "@/hooks/useVisitorTracker";
import { useCartDetails } from "@/hooks/useCartDetails";
import { trackClickEvent } from "@/utils/clickTracking";
import { formatCurrency } from "@/utils/formatters";
import { publicImageUrl } from "@/utils/storage";

export default function CartPage() {
  const { cart, lines, subtotal } = useCartDetails();
  const tracker = useVisitorTracker();
  const nav = useNavigate();

  const total = subtotal;

  return (
    <div className="min-h-screen bg-background w-full max-w-[100vw] overflow-x-hidden">
      <StoreTopbar cartCount={cart.totalItems} />
      <StoreMobileChrome cartCount={cart.totalItems} />

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8 pb-28 md:pb-10 space-y-4 sm:space-y-6 min-w-0">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">Carrinho</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Revise itens e finalize seu pedido.</p>
          </div>
          <Button asChild variant="outline" className="h-11 rounded-xl">
            <Link to="/loja">Continuar comprando</Link>
          </Button>
        </div>

        {lines.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-14 text-center space-y-4">
              <p className="text-muted-foreground">Seu carrinho está vazio 🛒</p>
              <Button asChild variant="outline" className="h-11 rounded-xl">
                <Link to="/loja">Ver produtos</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr,360px] items-start">
            <section className="space-y-4">
              <Card className="rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Cupom</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Digite seu cupom (ex.: OBRA10)"
                    value={cart.couponCode}
                    onChange={(e) => cart.setCouponCode(e.target.value.toUpperCase())}
                    className="h-11 rounded-xl"
                  />
                  <div className="flex justify-end">
                    <Button variant="ghost" className="h-9 rounded-lg text-xs" onClick={() => cart.setCouponCode("")}>
                      Remover cupom
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {lines.map((line) => {
                const imageUrl = publicImageUrl("product-images", line.imagePath ?? null);

                return (
                  <Card key={line.productId} className="rounded-2xl border-border/80">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40">
                          {imageUrl ? (
                            <img src={imageUrl} alt={line.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="h-full w-full bg-muted" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h2 className="text-base sm:text-lg font-semibold leading-tight line-clamp-2">{line.name}</h2>
                              <p className="text-sm text-muted-foreground mt-1">
                                {line.hasPrice ? `${formatCurrency(line.effectivePrice)} / ${line.unit}` : "Preço em atualização"}
                              </p>
                            </div>
                            <Button variant="ghost" className="h-8 rounded-lg text-xs" onClick={() => cart.remove(line.productId)}>
                              Remover
                            </Button>
                          </div>

                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <CartQuantityStepper
                              quantity={line.quantity}
                              onDecrease={() => cart.setQty(line.productId, Math.max(1, line.quantity - 1))}
                              onIncrease={() => cart.setQty(line.productId, line.quantity + 1)}
                              onRemove={() => cart.remove(line.productId)}
                            />
                            <div className="text-lg sm:text-xl font-semibold tracking-tight">{formatCurrency(line.lineTotal)}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </section>

            <aside className="lg:sticky lg:top-28">
              <Card className="rounded-2xl border-border/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Resumo do pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="text-foreground font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Frete estimado</span>
                      <span>R$ —</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Desconto</span>
                      <span>R$ —</span>
                    </div>
                  </div>

                  <div className="border-t border-border/70 pt-3 flex items-center justify-between">
                    <span className="text-base font-semibold">Total</span>
                    <span className="text-xl sm:text-2xl font-semibold tracking-tight">{formatCurrency(total)}</span>
                  </div>

                  <Button
                    className="h-11 rounded-xl w-full"
                    onClick={() => {
                      trackClickEvent({ sessionToken: tracker.sessionToken, type: "start_checkout" });
                      nav("/checkout");
                    }}
                  >
                    Finalizar sua compra
                  </Button>

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
