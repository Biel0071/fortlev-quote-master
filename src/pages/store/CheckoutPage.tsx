import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { toast } from "@/hooks/use-toast";
import { useStoreContact } from "@/hooks/useStoreContact";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useVisitorTracker } from "@/hooks/useVisitorTracker";
import { cloud } from "@/lib/cloud";
import { calcShipping } from "@/utils/shipping";
import { cleanPhone, formatCurrency } from "@/utils/formatters";
import { fetchCepData, formatAddress } from "@/utils/cepService";

const GATEWAY_LIMIT = 1000;

const checkoutSchema = z.object({
  customerName: z.string().trim().min(1, "Nome obrigatório").max(100, "Nome muito longo"),
  customerPhone: z
    .string()
    .trim()
    .min(1, "WhatsApp obrigatório")
    .transform((v) => cleanPhone(v))
    .refine((v) => v.length === 10 || v.length === 11, "WhatsApp inválido"),
  customerEmail: z.string().trim().optional(),
  cep: z.string().trim().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().max(1000, "Observações muito longas").optional(),
});

type OrderRpcResult = {
  orderId: string;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
};

export default function CheckoutPage() {
  const nav = useNavigate();
  const cart = useCart();
  const tracker = useVisitorTracker();
  const { activeProducts } = useStoreProducts();
  const contact = useStoreContact();

  const [cep, setCep] = useState("");
  const [address, setAddress] = useState<string>("");
  const [loadingCep, setLoadingCep] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [couponInfo, setCouponInfo] = useState<{ ok: boolean; discount: number; message: string } | null>(null);
  const [placing, setPlacing] = useState(false);

  // If WhatsApp popup is blocked, we store the last URL so user can retry without recreating the order.
  const [pendingWhatsAppUrl, setPendingWhatsAppUrl] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const didCreateOrderRef = useRef(false);

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

  const validateInputsOrToast = () => {
    const parsed = checkoutSchema.safeParse({
      customerName,
      customerPhone,
      customerEmail,
      cep,
      address,
      notes,
    });

    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message ?? "Dados inválidos";
      toast({ title: "Confira os dados", description: msg, variant: "destructive" });
      return null;
    }

    return {
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      customerEmail: (customerEmail ?? "").trim(),
      cep: (cep ?? "").trim(),
      address: (address ?? "").trim(),
      notes: (notes ?? "").trim(),
    };
  };

  const placeOrder = async (): Promise<OrderRpcResult> => {
    if (computed.lines.length === 0) {
      toast({ title: "Carrinho vazio", description: "Adicione itens antes de finalizar.", variant: "destructive" });
      throw new Error("Carrinho vazio");
    }

    const ok = validateInputsOrToast();
    if (!ok) throw new Error("Dados inválidos");

    // hard block double submit
    if (placing || didCreateOrderRef.current) throw new Error("Pedido já está sendo processado");

    setPlacing(true);
    try {
      const orderLines = computed.lines.map((l) => ({ product_id: l.productId, quantity: l.qty }));
      const { data, error } = await cloud.rpc("create_store_order", {
        _customer_name: ok.customerName,
        _customer_email: ok.customerEmail,
        _customer_phone: ok.customerPhone,
        _cep: ok.cep,
        _address: ok.address,
        _notes: ok.notes,
        _checkout_mode: mode,
        _lines: orderLines,
        _coupon_code: cart.couponCode.trim() || null,
      } as any);

      if (error) throw error;

      const row: any = Array.isArray(data) ? data[0] : data;
      const orderId = String(row?.order_id ?? "");
      if (!orderId) throw new Error("Pedido não retornou order_id");

      didCreateOrderRef.current = true;

      return {
        orderId,
        subtotal: Number(row?.subtotal ?? 0),
        shipping: Number(row?.shipping ?? 0),
        discount: Number(row?.discount ?? 0),
        total: Number(row?.total ?? 0),
      };
    } catch (e: any) {
      setPlacing(false);
      didCreateOrderRef.current = false;
      throw e;
    }
  };

  const openWhatsAppOrThrow = (url: string) => {
    const w = window.open(url, "_blank");
    if (!w) {
      throw new Error("Popup bloqueado");
    }
  };

  const buildWhatsAppUrl = (orderId: string, totals: OrderRpcResult) => {
    const lines = computed.lines.map((l) => ({ name: l.name, qty: l.qty, unit: l.unit, total: l.lineSubtotal }));
    const text = encodeURIComponent(
      [
        `*Pedido #${String(orderId).slice(0, 8)}*`,
        "━━━━━━━━━━━━━━━━━━",
        cep ? `📍 CEP: ${cep}` : null,
        address ? `🏠 Endereço: ${address}` : null,
        customerName ? `👤 Nome: ${customerName}` : null,
        customerPhone ? `📱 WhatsApp: ${customerPhone}` : null,
        cart.couponCode ? `🏷️ Cupom: ${cart.couponCode}` : null,
        totals.discount > 0 ? `💸 Desconto: -${formatCurrency(totals.discount)}` : null,
        "",
        "📦 *Itens:*",
        lines.map((x) => `• ${x.name} — Qtd: ${x.qty} — ${formatCurrency(x.total)}`).join("\n"),
        "",
        `🚚 Frete: ${formatCurrency(totals.shipping)}`,
        `💰 *Total:* ${formatCurrency(totals.total)}`,
        "",
        "_Pedido gerado pelo site_",
      ]
        .filter(Boolean)
        .join("\n"),
    );

    const phoneDigits = contact.phoneDigits;
    if (!phoneDigits) throw new Error("WhatsApp da loja não configurado.");

    return `https://api.whatsapp.com/send?phone=55${phoneDigits}&text=${text}`;
  };

  const handleWhatsApp = async () => {
    try {
      // If we already created an order but popup got blocked, retry without creating a new order.
      if (pendingWhatsAppUrl && pendingOrderId) {
        openWhatsAppOrThrow(pendingWhatsAppUrl);
        cart.clear();
        toast({ title: "Ok", description: "WhatsApp aberto. Pedido finalizado." });
        return;
      }

      const totals = await placeOrder();
      const url = buildWhatsAppUrl(totals.orderId, totals);

       try {
         openWhatsAppOrThrow(url);
       } catch (e) {
         // Allow retry without recreating order
         setPendingWhatsAppUrl(url);
         setPendingOrderId(totals.orderId);
         toast({
           title: "Não foi possível abrir o WhatsApp",
           description: "Seu navegador bloqueou o popup. Toque em 'Finalizar no WhatsApp' novamente para tentar abrir.",
           variant: "destructive",
         });
         return;
       }

       tracker.track({ type: "whatsapp_click", metadata: { orderId: totals.orderId } });
       tracker.track({ type: "request_quote", metadata: { orderId: totals.orderId } });

       cart.clear();
       toast({ title: "Ok", description: "WhatsApp aberto. Pedido finalizado." });
       // keep placing=true (no re-enable on success)
    } catch (e: any) {
      toast({ title: "Erro ao finalizar", description: e?.message ?? "Tente novamente.", variant: "destructive" });
      // do not clear cart on error
    }
  };

  const handleGateway = async () => {
    try {
      const totals = await placeOrder();
      cart.clear();
      nav("/checkout/pagamento", { state: { orderId: totals.orderId } });
      // keep placing=true (no re-enable on success)
    } catch (e: any) {
      toast({ title: "Erro ao registrar pedido", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <StoreTopbar cartCount={cart.totalItems} />
      <StoreMobileChrome cartCount={cart.totalItems} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10 space-y-6">
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
                  <Button className="w-full" onClick={handleWhatsApp} disabled={placing || !contact.phoneDigits}>
                    {placing ? "Processando..." : (pendingWhatsAppUrl ? "Abrir WhatsApp novamente" : "Finalizar no WhatsApp")}
                  </Button>
                ) : (
                  <Button className="w-full" onClick={handleGateway} disabled={placing}>
                    {placing ? "Processando..." : "Registrar pedido e pagar via PIX"}
                  </Button>
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