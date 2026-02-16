import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { cloud } from "@/lib/cloud";
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

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [couponInfo, setCouponInfo] = useState<{ ok: boolean; discount: number; message: string } | null>(null);
  const [placing, setPlacing] = useState(false);

  const computed = useMemo(() => {
    const lines = cart.lines
      .map((l) => {
        const p = activeProducts.find((p) => p.id === l.productId);
        if (!p) return null;
        const effectivePrice = Number((p as any).promo_price ?? 0) > 0 ? Number((p as any).promo_price) : Number(p.price);
        return {
          productId: p.id,
          name: p.name,
          qty: l.quantity,
          unit: p.unit ?? "un",
          unitPrice: effectivePrice,
          categoryId: (p as any).category_id ?? null,
          lineSubtotal: effectivePrice * l.quantity,
        };
      })
      .filter(Boolean) as Array<any>;

    const subtotal = lines.reduce((acc, l) => acc + l.lineSubtotal, 0);
    const shipping = calcShipping(subtotal);
    return { lines, subtotal, shipping };
  }, [cart.lines, activeProducts]);

  const totalBeforeDiscount = computed.subtotal + computed.shipping.value;

  const mode = totalBeforeDiscount >= GATEWAY_LIMIT ? "whatsapp" : "gateway";

  const handleFetchCep = async () => {
    setLoadingCep(true);
    try {
      const data = await fetchCepData(cep);
      if (data) setAddress(formatAddress(data));
    } finally {
      setLoadingCep(false);
    }
  };

  const validateCoupon = async () => {
    const code = cart.couponCode.trim();
    if (!code) {
      setCouponInfo(null);
      return;
    }

    const payloadLines = computed.lines.map((l) => ({
      product_id: l.productId,
      category_id: l.categoryId,
      line_subtotal: l.lineSubtotal,
    }));

    const { data, error } = await cloud.rpc("validate_coupon_cart", {
      _code: code,
      _lines: payloadLines,
      _subtotal: computed.subtotal,
    } as any);

    if (error) {
      setCouponInfo({ ok: false, discount: 0, message: error.message });
      return;
    }

    const row: any = Array.isArray(data) ? data[0] : data;
    setCouponInfo({ ok: Boolean(row?.ok), discount: Number(row?.discount ?? 0), message: String(row?.message ?? "") });
  };

  useEffect(() => {
    validateCoupon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.couponCode, computed.subtotal]);

  const discount = couponInfo?.ok ? Math.min(computed.subtotal, Math.max(0, Number(couponInfo.discount))) : 0;
  const total = Math.max(0, totalBeforeDiscount - discount);

  const placeOrder = async () => {
    if (computed.lines.length === 0) return;
    setPlacing(true);
    try {
      const orderLines = computed.lines.map((l) => ({ product_id: l.productId, quantity: l.qty }));
      const { data, error } = await cloud.rpc("create_store_order", {
        _customer_name: customerName,
        _customer_email: customerEmail,
        _customer_phone: customerPhone,
        _cep: cep,
        _address: address,
        _notes: notes,
        _checkout_mode: mode,
        _lines: orderLines,
        _coupon_code: cart.couponCode.trim() || null,
      } as any);

      if (error) throw error;

      const row: any = Array.isArray(data) ? data[0] : data;
      return row?.order_id as string;
    } finally {
      setPlacing(false);
    }
  };

  const handleWhatsApp = async () => {
    const orderId = await placeOrder();
    const lines = computed.lines.map((l) => ({ name: l.name, qty: l.qty, unit: l.unit, total: l.lineSubtotal }));
    const text = encodeURIComponent(
      [
        orderId ? `*Pedido #${String(orderId).slice(0, 8)}*` : "*PEDIDO - Materiais de Construção*",
        "━━━━━━━━━━━━━━━━━━",
        cep ? `📍 CEP: ${cep}` : null,
        address ? `🏠 Endereço: ${address}` : null,
        customerName ? `👤 Nome: ${customerName}` : null,
        customerPhone ? `📱 WhatsApp: ${customerPhone}` : null,
        cart.couponCode ? `🏷️ Cupom: ${cart.couponCode}` : null,
        discount > 0 ? `💸 Desconto: -${formatCurrency(discount)}` : null,
        "",
        "📦 *Itens:*",
        lines.map((x) => `• ${x.name} — Qtd: ${x.qty} — ${formatCurrency(x.total)}`).join("\n"),
        "",
        `🚚 Frete: ${formatCurrency(computed.shipping.value)}`,
        `💰 *Total:* ${formatCurrency(total)}`,
        "",
        "_Pedido gerado pelo site_",
      ]
        .filter(Boolean)
        .join("\n"),
    );

    const url = `https://api.whatsapp.com/send?phone=55${WHATSAPP_PHONE}&text=${text}`;
    window.open(url, "_blank");
    cart.clear();
  };

  return (
    <div className="min-h-screen bg-background">
      <StoreTopbar cartCount={cart.totalItems} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
            <p className="text-sm text-muted-foreground">Confirme dados, cupom e finalize.</p>
          </div>
          <Button asChild variant="outline"><Link to="/carrinho">Voltar ao carrinho</Link></Button>
        </div>

        {computed.lines.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Carrinho vazio.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Dados e entrega</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(DDD) 9xxxx-xxxx" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="opcional" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="flex gap-2">
                    <Input id="cep" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
                    <Button variant="outline" onClick={handleFetchCep} disabled={loadingCep}>Buscar</Button>
                  </div>
                  {address && <div className="text-sm text-muted-foreground">{address}</div>}
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: entregar no portão" />
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
                {cart.couponCode ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cupom</span>
                    <span className={couponInfo?.ok ? "font-semibold" : "text-destructive"}>
                      {couponInfo?.ok ? `- ${formatCurrency(discount)}` : (couponInfo?.message ?? "inválido")}
                    </span>
                  </div>
                ) : null}
                <div className="border-t border-border pt-3 flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold">{formatCurrency(total)}</span>
                </div>

                {mode === "whatsapp" ? (
                  <Button className="w-full" onClick={handleWhatsApp} disabled={placing}>
                    {placing ? "Gerando pedido..." : "Finalizar no WhatsApp"}
                  </Button>
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
