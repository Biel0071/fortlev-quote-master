import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { useCart } from "@/hooks/useCart";

export default function PaymentPendingPage() {
  const cart = useCart();
  const location = useLocation();
  const state = (location.state ?? {}) as { orderId?: string };

  return (
    <div className="flex flex-col bg-background">
      <StoreTopbar cartCount={cart.totalItems} />
      <StoreMobileChrome cartCount={cart.totalItems} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-24 md:pb-10">
        <Card>
          <CardHeader>
            <CardTitle>Pagamento via PIX (em breve)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Seu pedido foi registrado e já aparece no painel administrativo. A integração de pagamento será liberada na próxima etapa.
            </p>

            {state.orderId ? (
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
                Referência do pedido: <span className="font-semibold">#{String(state.orderId).slice(0, 8)}</span>
              </div>
            ) : null}

            <div className="flex gap-2 flex-wrap">
              <Button asChild>
                <Link to="/">Voltar para a loja</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/admin/pedidos">Ver pedidos no admin</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
