import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { calcShipping } from "@/utils/shipping";
import { formatCurrency } from "@/utils/formatters";
import { fetchCepData, formatAddress } from "@/utils/cepService";

const WHATSAPP_PHONE = "31973484203";
const GATEWAY_LIMIT = 1000;

function buildWhatsAppText(lines: Array<{ name: string; qty: number; unit: string; total: number }>, total: number, cep?: string, address?: string) {
  const items = lines.map((l) => `• ${l.name} — Qtd: ${l.qty} — ${formatCurrency(l.total)}`).join("\n");
  return [
    "*PEDIDO - Materiais de Construção*",
    "━━━━━━━━━━━━━━━━━━",
    cep ? `📍 CEP: ${cep}` : null,
    address ? `🏠 Endereço: ${address}` : null,
    "",
    "📦 *Itens:*",
    items,
    "",
    `💰 *Total:* ${formatCurrency(total)}`,
    "",
    "_Pedido gerado pelo site_",
  ].filter(Boolean).join("\n");
}

export default function CheckoutPage() {
  const cart = useCart();
  const { activeProducts } = useStoreProducts();

  const [cep, setCep] = useState("");
  const [address, setAddress] = useState<string>("");
  const [loadingCep, setLoadingCep] = useState(false);

  const computed = useMemo(() => {
    const lines = cart.lines
      .map((l) => {
        const p = activeProducts.find((p) => p.id === l.productId);
        if (!p) return null;
        return {
          name: p.name,
          qty: l.quantity,
          unit: p.unit ?? "un",
          total: p.price * l.quantity,
        };
      })
      .filter(Boolean) as Array<any>;

    const subtotal = lines.reduce((acc, l) => acc + l.total, 0);
    const shipping = calcShipping(subtotal);
    const total = subtotal + shipping.value;

    return { lines, subtotal, shipping, total };
  }, [cart.lines, activeProducts]);

  const mode = computed.total >= GATEWAY_LIMIT ? "whatsapp" : "gateway";

  const handleFetchCep = async () => {
    setLoadingCep(true);
    try {
      const data = await fetchCepData(cep);
      if (data) setAddress(formatAddress(data));
    } finally {
      setLoadingCep(false);
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(buildWhatsAppText(computed.lines, computed.total, cep, address));
    const url = `https://api.whatsapp.com/send?phone=55${WHATSAPP_PHONE}&text=${text}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <StoreTopbar cartCount={cart.totalItems} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
            <p className="text-sm text-muted-foreground">Confirme endereço, frete e finalize seu pedido.</p>
          </div>
          <Button asChild variant="outline"><Link to="/carrinho">Voltar ao carrinho</Link></Button>
        </div>

        {computed.lines.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Carrinho vazio.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Entrega</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="flex gap-2">
                    <Input id="cep" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
                    <Button variant="outline" onClick={handleFetchCep} disabled={loadingCep}>Buscar</Button>
                  </div>
                  {address && <div className="text-sm text-muted-foreground">{address}</div>}
                </div>

                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
                  Frete automático: <span className="font-semibold">{Math.round(computed.shipping.pct * 100)}%</span> do subtotal (mínimo <span className="font-semibold">R$ 30</span>).
                </div>

                <div className="text-sm text-muted-foreground">
                  {mode === "gateway" ? (
                    <>Pedidos abaixo de <span className="font-medium">R$ 1000</span> serão pagos via gateway (Allow Pay) — integração será adicionada em seguida.</>
                  ) : (
                    <>Pedidos a partir de <span className="font-medium">R$ 1000</span> são finalizados via WhatsApp.</>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{formatCurrency(computed.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Frete</span>
                  <span className="font-semibold">{formatCurrency(computed.shipping.value)}</span>
                </div>
                <div className="border-t border-border pt-3 flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold">{formatCurrency(computed.total)}</span>
                </div>

                {mode === "whatsapp" ? (
                  <Button className="w-full" onClick={handleWhatsApp}>Finalizar no WhatsApp</Button>
                ) : (
                  <Button className="w-full" disabled title="Integração Allow Pay será adicionada na próxima etapa">Pagar via PIX (em breve)</Button>
                )}

                <Button asChild variant="outline" className="w-full"><Link to="/loja">Continuar comprando</Link></Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
