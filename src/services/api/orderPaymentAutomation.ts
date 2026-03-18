import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatters";

const WHATSAPP_NUMBER = "5511999999999"; // default, should come from store config

export interface OrderPaymentResult {
  mode: "pix" | "whatsapp";
  transaction_id?: string;
  qr_code?: string;
  payment_url?: string;
  whatsapp_url?: string;
}

async function getRoutingThreshold(): Promise<number> {
  const { data } = await supabase
    .from("payment_methods_config")
    .select("config_json")
    .eq("method", "routing_threshold")
    .maybeSingle();

  const val = (data?.config_json as any)?.threshold;
  return typeof val === "number" && val > 0 ? val : 980;
}

/**
 * Auto-route payment: <=threshold → AllowPay PIX, >threshold → WhatsApp
 */
export async function processOrderPayment(order: {
  id: string;
  total: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items_summary?: string;
  city?: string;
}): Promise<OrderPaymentResult> {
  const THRESHOLD = await getRoutingThreshold();

  if (order.total <= THRESHOLD) {
    // Auto PIX via AllowPay
    const { data, error } = await supabase.functions.invoke("allowpay-create-payment", {
      body: {
        amount: order.total,
        currency: "BRL",
        payment_method: "pix",
        customer: {
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone,
        },
        metadata: { order_id: order.id },
      },
    });

    if (error) throw new Error(error.message || "Erro ao criar pagamento PIX");

    return {
      mode: "pix",
      transaction_id: data?.transaction_id,
      qr_code: data?.qr_code,
      payment_url: data?.payment_url,
    };
  } else {
    // WhatsApp redirect for high-value orders
    const message = [
      `Olá, recebemos seu pedido de orçamento.`,
      `Um consultor irá finalizar o atendimento.`,
      ``,
      `📋 *Dados do pedido:*`,
      `Nome: ${order.customer_name}`,
      `Telefone: ${order.customer_phone}`,
      order.items_summary ? `Produtos: ${order.items_summary}` : "",
      `Valor total: ${formatCurrency(order.total)}`,
      order.city ? `Cidade: ${order.city}` : "",
    ].filter(Boolean).join("\n");

    const phone = order.customer_phone.replace(/\D/g, "");
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;

    return {
      mode: "whatsapp",
      whatsapp_url: whatsappUrl,
    };
  }
}
