import { supabase } from "@/integrations/supabase/client";

export interface CreatePaymentParams {
  amount: number; // in BRL (e.g. 10.50)
  payment_method?: "pix" | "card" | "boleto";
  customer: {
    name: string;
    email: string;
    phone?: string;
    document?: { type: "CPF" | "CNPJ"; number: string };
  };
  metadata?: {
    order_id?: string;
    [key: string]: unknown;
  };
}

export interface CreatePaymentResult {
  success: boolean;
  transaction_id: string;
  payment_id: string;
  qr_code: string | null;
  qr_code_base64: string | null;
  payment_url: string | null;
  boleto_url: string | null;
  status: string;
  expiration_date: string | null;
}

export interface PaymentStatusResult {
  payment_id: string;
  status: string;
  mapped_status: string;
  details: Record<string, unknown>;
}

export async function createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
  const { data, error } = await supabase.functions.invoke("allowpay-create-payment", {
    body: params,
  });

  if (error) throw new Error(error.message || "Erro ao criar pagamento");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
  const { data, error } = await supabase.functions.invoke("allowpay-payment-status", {
    body: { payment_id: paymentId },
  });

  if (error) throw new Error(error.message || "Erro ao consultar status");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function getPaymentStatusByTransaction(transactionId: string): Promise<PaymentStatusResult> {
  const { data, error } = await supabase.functions.invoke("allowpay-payment-status", {
    body: { transaction_id: transactionId },
  });

  if (error) throw new Error(error.message || "Erro ao consultar status");
  if (data?.error) throw new Error(data.error);
  return data;
}
