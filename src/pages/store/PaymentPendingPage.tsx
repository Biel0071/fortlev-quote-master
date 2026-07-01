import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "@/components/store/AppHeader";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { useCart } from "@/hooks/useCart";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type PixData = {
  qr_code?: string | null;
  qr_code_base64?: string | null;
  payment_url?: string | null;
  transaction_id?: string | null;
};

export default function PaymentPendingPage() {
  const cart = useCart();
  const { isAdmin } = useIsAdmin();
  const location = useLocation();
  const state = (location.state ?? {}) as {
    orderId?: string;
    total?: number;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerCpf?: string;
  };

  const [pixData, setPixData] = useState<PixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!state.orderId || !state.total) {
      setLoading(false);
      setError("Dados do pedido não encontrados.");
      return;
    }

    const createPayment = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("allowpay-create-payment", {
          body: {
            amount: state.total,
            currency: "BRL",
            payment_method: "pix",
            customer: {
              name: state.customerName || "Cliente",
              email: state.customerEmail || "cliente@email.com",
              phone: state.customerPhone || "",
              ...(state.customerCpf
                ? { document: { type: "CPF", number: state.customerCpf } }
                : {}),
            },
            metadata: { order_id: state.orderId },
          },
        });

        if (fnError) throw new Error(fnError.message);

        setPixData({
          qr_code: data?.qr_code,
          qr_code_base64: data?.qr_code_base64,
          payment_url: data?.payment_url,
          transaction_id: data?.transaction_id,
        });
        // só limpa o carrinho após PIX gerado com sucesso
        cart.clear();
      } catch (e: any) {
        console.error("Erro ao gerar PIX:", e);
        const details = e?.context?.body || e?.details;
        const msg = details?.error || e?.message || "Erro ao gerar pagamento PIX";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    createPayment();
  }, [state.orderId]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="flex flex-col bg-background">
      <AppHeader cartCount={cart.totalItems} />
      <StoreMobileChrome cartCount={cart.totalItems} />

      <main className="main-content max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-24 md:pb-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : error ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
              Pagamento via PIX
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Gerando cobrança PIX...</p>
              </div>
            )}

            {error && (
              <div className="space-y-3">
                <p className="text-sm text-destructive">{error}</p>
                <p className="text-xs text-muted-foreground">
                  Seu pedido foi registrado. Entre em contato para finalizar o pagamento.
                </p>
              </div>
            )}

            {!loading && !error && pixData && (
              <>
                {state.total && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                    <p className="text-sm text-muted-foreground">Valor a pagar</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(state.total)}</p>
                  </div>
                )}

                {(pixData.qr_code_base64 || pixData.payment_url || pixData.qr_code) && (
                  <div className="flex justify-center">
                    <img
                      src={
                        pixData.qr_code_base64
                          ? `data:image/png;base64,${pixData.qr_code_base64}`
                          : pixData.payment_url
                          ? pixData.payment_url
                          : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixData.qr_code || "")}`
                      }
                      alt="QR Code PIX"
                      className="w-52 h-52 rounded-lg border border-border bg-white p-2"
                    />
                  </div>
                )}

                {pixData.qr_code && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground text-center">Código PIX (copie e cole no seu banco)</p>
                    <div className="relative">
                      <div className="rounded-lg border border-border bg-muted/30 p-3 pr-12 text-xs break-all font-mono max-h-24 overflow-y-auto">
                        {pixData.qr_code}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => handleCopy(pixData.qr_code!)}
                      >
                        {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <Button className="w-full" onClick={() => handleCopy(pixData.qr_code!)}>
                      {copied ? "Copiado!" : "Copiar código PIX"}
                    </Button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Após o pagamento, seu pedido será confirmado automaticamente.
                </p>
              </>
            )}

            {state.orderId && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
                Referência do pedido: <span className="font-semibold">#{String(state.orderId).slice(0, 8)}</span>
              </div>
            )}

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
