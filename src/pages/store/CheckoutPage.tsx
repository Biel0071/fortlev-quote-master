import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { toast } from "@/hooks/use-toast";
import { useStoreContact } from "@/hooks/useStoreContact";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useVisitorTracker } from "@/hooks/useVisitorTracker";
import { useCheckoutSessionTracker } from "@/hooks/useCheckoutSessionTracker";
import { useDynamicSeo } from "@/hooks/useDynamicSeo";
import { cloud } from "@/lib/cloud";
import { calcShipping } from "@/utils/shipping";
import { cleanPhone, formatCurrency, formatWhatsappMask, isValidBrazilPhone } from "@/utils/formatters";
import { fetchCepData, formatAddress } from "@/utils/cepService";
import { CheckoutIdentifyStep } from "@/components/store/checkout/CheckoutIdentifyStep";
import { CheckoutDeliveryStep } from "@/components/store/checkout/CheckoutDeliveryStep";

const WHATSAPP_ROUTE_LIMIT = (() => {
  const parsed = Number(import.meta.env.VITE_WHATSAPP_ROUTE_LIMIT ?? 1000);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
})();

const identifySchema = z.object({
  customerName: z.string().trim().min(2, "Nome obrigatório").max(120, "Nome muito longo"),
  customerPhone: z
    .string()
    .trim()
    .min(1, "WhatsApp obrigatório")
    .transform((v) => cleanPhone(v))
    .refine((v) => v.length === 10 || v.length === 11, "WhatsApp inválido"),
});

const deliverySchema = z.object({
  cep: z.string().trim().min(8, "CEP obrigatório").max(12, "CEP inválido"),
  address: z.string().trim().min(5, "Endereço obrigatório").max(255, "Endereço muito longo"),
  number: z.string().trim().min(1, "Número obrigatório").max(20, "Número inválido"),
  complement: z.string().trim().max(255, "Complemento muito longo").optional(),
  notes: z.string().trim().max(1000, "Observações muito longas").optional(),
});

type Step = "identify" | "delivery";

type OrderRpcResult = {
  orderId: string;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
};

const sanitizeNameInput = (value: string) => value.replace(/[<>]/g, "").replace(/\s{2,}/g, " ").slice(0, 120);
const sanitizePhoneInput = (value: string) => cleanPhone(value).slice(0, 11);

export default function CheckoutPage() {
  const nav = useNavigate();
  const cart = useCart();
  const tracker = useVisitorTracker();
  const leadTracker = useCheckoutSessionTracker();
  const { activeProducts } = useStoreProducts();
  const contact = useStoreContact();

  useDynamicSeo({
    title: `Finalizar sua compra | ${contact.storeName || "Materiais de Construção"}`,
    description: "Finalize sua compra com segurança em poucos passos e escolha o melhor envio para sua obra.",
    canonicalPath: "/checkout",
  });

  const [step, setStep] = useState<Step>("identify");
  const [loadingCep, setLoadingCep] = useState(false);
  const [placing, setPlacing] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [notes, setNotes] = useState("");

  const [pendingWhatsAppUrl, setPendingWhatsAppUrl] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const didCreateOrderRef = useRef(false);

  const computed = useMemo(() => {
    const lines = cart.lines
      .map((l) => {
        const p = activeProducts.find((prod) => prod.id === l.productId);
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
      .filter(Boolean) as Array<{
      productId: string;
      name: string;
      qty: number;
      unit: string;
      unitPrice: number;
      categoryId: string | null;
      lineSubtotal: number;
    }>;

    const subtotal = lines.reduce((acc, l) => acc + l.lineSubtotal, 0);
    const shipping = calcShipping(subtotal);

    return { lines, subtotal, shipping };
  }, [cart.lines, activeProducts]);

  const cartItemsForTracking = useMemo(
    () =>
      computed.lines.map((l) => ({
        product_id: l.productId,
        name: l.name,
        quantity: l.qty,
        unit_price: l.unitPrice,
        line_subtotal: l.lineSubtotal,
      })),
    [computed.lines],
  );

  const phoneError = useMemo(() => {
    if (!customerPhone) return undefined;
    return isValidBrazilPhone(customerPhone) ? undefined : "Informe um WhatsApp válido com DDD (10 ou 11 dígitos).";
  }, [customerPhone]);

  const resolveCouponDiscount = async () => {
    const code = cart.couponCode.trim();
    if (!code || computed.lines.length === 0) return 0;

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

    if (error) return 0;

    const row: any = Array.isArray(data) ? data[0] : data;
    if (!row?.ok) return 0;
    return Math.min(computed.subtotal, Math.max(0, Number(row.discount ?? 0)));
  };

  const handleFetchCep = async () => {
    setLoadingCep(true);
    try {
      const data = await fetchCepData(cep);
      if (data) setAddress(formatAddress(data));
    } finally {
      setLoadingCep(false);
    }
  };

  const placeOrder = async ({
    mode,
    identify,
    delivery,
  }: {
    mode: "whatsapp" | "gateway";
    identify: { customerName: string; customerPhone: string };
    delivery?: { cep: string; address: string; number: string; complement?: string; notes?: string };
  }): Promise<OrderRpcResult> => {
    if (computed.lines.length === 0) {
      toast({ title: "Carrinho vazio", description: "Adicione itens antes de finalizar.", variant: "destructive" });
      throw new Error("Carrinho vazio");
    }

    if (placing || didCreateOrderRef.current) throw new Error("Pedido já está sendo processado");

    setPlacing(true);

    try {
      const orderLines = computed.lines.map((l) => ({ product_id: l.productId, quantity: l.qty }));
      const fullAddress = delivery
        ? [delivery.address, `Nº ${delivery.number}`, delivery.complement].filter(Boolean).join(", ")
        : "";

      const { data, error } = await cloud.rpc("create_store_order", {
        _customer_name: identify.customerName,
        _customer_email: customerEmail.trim(),
        _customer_phone: identify.customerPhone,
        _cep: delivery?.cep ?? "",
        _address: fullAddress,
        _notes: delivery?.notes ?? "",
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
    } catch (e) {
      setPlacing(false);
      didCreateOrderRef.current = false;
      throw e;
    }
  };

  const buildWhatsAppUrl = (order: OrderRpcResult, identify: { customerName: string; customerPhone: string }, extraNotes?: string) => {
    const linesText = computed.lines
      .map((line) => `• ${line.name} | Qtd: ${line.qty} | ${formatCurrency(line.lineSubtotal)}`)
      .join("\n");

    const text = encodeURIComponent(
      [
        `*Pedido #${String(order.orderId).slice(0, 8)}*`,
        "━━━━━━━━━━━━━━━━━━",
        `👤 Nome: ${identify.customerName}`,
        `📱 Telefone: ${identify.customerPhone}`,
        "",
        "📦 *Itens do pedido*",
        linesText,
        "",
        `💰 *Total:* ${formatCurrency(order.total)}`,
        extraNotes ? `📝 Observações: ${extraNotes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );

    if (!contact.phoneDigits) throw new Error("WhatsApp da loja não configurado.");
    return `https://api.whatsapp.com/send?phone=55${contact.phoneDigits}&text=${text}`;
  };

  const openWhatsAppOrThrow = (url: string) => {
    const popup = window.open(url, "_blank");
    if (!popup) throw new Error("Popup bloqueado");
  };

  const handleContinue = async () => {
    try {
      if (pendingWhatsAppUrl && pendingOrderId) {
        openWhatsAppOrThrow(pendingWhatsAppUrl);
        tracker.track({ type: "whatsapp_click", metadata: { orderId: pendingOrderId } });
        cart.clear();
        toast({ title: "Pedido finalizado", description: "WhatsApp aberto com sucesso." });
        return;
      }

      const parsedIdentify = identifySchema.safeParse({ customerName, customerPhone });
      if (!parsedIdentify.success) {
        const msg = parsedIdentify.error.issues?.[0]?.message ?? "Dados inválidos";
        toast({ title: "Confira seus dados", description: msg, variant: "destructive" });
        return;
      }

      const identify = {
        customerName: parsedIdentify.data.customerName,
        customerPhone: parsedIdentify.data.customerPhone,
      };
      const discount = await resolveCouponDiscount();
      const estimatedTotal = Math.max(0, computed.subtotal + computed.shipping.value - discount);
      const routeType: "whatsapp" | "gateway" = estimatedTotal >= WHATSAPP_ROUTE_LIMIT ? "whatsapp" : "gateway";

      leadTracker.pushSessionInBackground({
        name: identify.customerName,
        phone: identify.customerPhone,
        email: customerEmail,
        subtotal: computed.subtotal,
        total: estimatedTotal,
        routeType,
        cartItems: cartItemsForTracking,
        lastStep: "identify",
      });

      if (routeType === "whatsapp") {
        const order = await placeOrder({ mode: "whatsapp", identify });
        const url = buildWhatsAppUrl(order, identify);

        try {
          openWhatsAppOrThrow(url);
        } catch {
          setPendingWhatsAppUrl(url);
          setPendingOrderId(order.orderId);
          toast({
            title: "Não foi possível abrir o WhatsApp",
            description: "Toque em Continuar novamente para reabrir sem gerar novo pedido.",
            variant: "destructive",
          });
          setPlacing(false);
          return;
        }

        tracker.track({ type: "whatsapp_click", metadata: { orderId: order.orderId } });
        tracker.track({ type: "request_quote", metadata: { orderId: order.orderId } });

        leadTracker.pushSessionInBackground({
          name: identify.customerName,
          phone: identify.customerPhone,
          email: customerEmail,
          subtotal: order.subtotal,
          total: order.total,
          routeType: "whatsapp",
          cartItems: cartItemsForTracking,
          lastStep: "completed",
        });

        cart.clear();
        toast({ title: "Pedido finalizado", description: "WhatsApp aberto com sucesso." });
        return;
      }

      setStep("delivery");
    } catch (e: any) {
      setPlacing(false);
      toast({ title: "Erro ao continuar", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    }
  };

  const handleFinishGateway = async () => {
    try {
      const parsedIdentify = identifySchema.safeParse({ customerName, customerPhone });
      if (!parsedIdentify.success) {
        const msg = parsedIdentify.error.issues?.[0]?.message ?? "Dados inválidos";
        toast({ title: "Confira seus dados", description: msg, variant: "destructive" });
        return;
      }

      const parsedDelivery = deliverySchema.safeParse({ cep, address, number, complement, notes });
      if (!parsedDelivery.success) {
        const msg = parsedDelivery.error.issues?.[0]?.message ?? "Dados de entrega inválidos";
        toast({ title: "Confira seus dados", description: msg, variant: "destructive" });
        return;
      }

      const identify = {
        customerName: parsedIdentify.data.customerName,
        customerPhone: parsedIdentify.data.customerPhone,
      };
      const delivery = {
        cep: parsedDelivery.data.cep,
        address: parsedDelivery.data.address,
        number: parsedDelivery.data.number,
        complement: parsedDelivery.data.complement,
        notes: parsedDelivery.data.notes,
      };
      const discount = await resolveCouponDiscount();
      const estimatedTotal = Math.max(0, computed.subtotal + computed.shipping.value - discount);

      leadTracker.pushSessionInBackground({
        name: identify.customerName,
        phone: identify.customerPhone,
        email: customerEmail,
        cep: delivery.cep,
        address: delivery.address,
        number: delivery.number,
        complement: delivery.complement,
        notes: delivery.notes,
        subtotal: computed.subtotal,
        total: estimatedTotal,
        routeType: "gateway",
        cartItems: cartItemsForTracking,
        lastStep: "delivery",
      });

      const order = await placeOrder({ mode: "gateway", identify, delivery });

      leadTracker.pushSessionInBackground({
        name: identify.customerName,
        phone: identify.customerPhone,
        email: customerEmail,
        cep: delivery.cep,
        address: delivery.address,
        number: delivery.number,
        complement: delivery.complement,
        notes: delivery.notes,
        subtotal: order.subtotal,
        total: order.total,
        routeType: "gateway",
        cartItems: cartItemsForTracking,
        lastStep: "completed",
      });

      cart.clear();
      nav("/checkout/pagamento", { state: { orderId: order.orderId } });
    } catch (e: any) {
      setPlacing(false);
      toast({ title: "Erro ao finalizar", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col bg-background w-full overflow-x-hidden">
      <StoreTopbar cartCount={cart.totalItems} />
      <StoreMobileChrome cartCount={cart.totalItems} />

      <main className="mx-auto w-full max-w-4xl px-3 sm:px-6 py-6 sm:py-8 pb-20 md:pb-8 min-w-0">
        <nav aria-label="breadcrumb" className="mb-4 text-sm text-muted-foreground">
          Carrinho <span className="mx-1">/</span> <span className="font-medium text-foreground">Finalizar sua compra</span>
        </nav>

        {computed.lines.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            Carrinho vazio.
          </div>
        ) : step === "identify" ? (
          <CheckoutIdentifyStep
            name={customerName}
            phone={formatWhatsappMask(customerPhone)}
            phoneError={phoneError}
            loading={placing}
            onNameChange={(value) => setCustomerName(sanitizeNameInput(value))}
            onPhoneChange={(value) => setCustomerPhone(sanitizePhoneInput(value))}
            onContinue={handleContinue}
          />
        ) : (
          <CheckoutDeliveryStep
            cep={cep}
            address={address}
            number={number}
            complement={complement}
            notes={notes}
            loadingCep={loadingCep}
            loadingFinish={placing}
            onCepChange={setCep}
            onAddressChange={setAddress}
            onNumberChange={setNumber}
            onComplementChange={setComplement}
            onNotesChange={setNotes}
            onFetchCep={handleFetchCep}
            onBack={() => setStep("identify")}
            onFinish={handleFinishGateway}
          />
        )}
      </main>
    </div>
  );
}
