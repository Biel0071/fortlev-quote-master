import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { AppHeader } from "@/components/store/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { formatCurrency } from "@/utils/formatters";

type OrderRow = {
  id: string;
  status: string;
  total: number;
  shipping: number;
  subtotal: number;
  discount: number;
  created_at: string;
};

type TrackingRow = {
  id: string;
  status: string;
  detail: string | null;
  created_at: string;
};

export default function TrackingPage() {
  const { id } = useParams();
  const { user, loading: sessionLoading } = useSession();

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<Array<{ name_snapshot: string; quantity: number; line_total: number }>>([]);
  const [tracking, setTracking] = useState<TrackingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const statusLabel = useMemo(() => {
    const map: Record<string, string> = {
      aguardando: "Aguardando",
      pago: "Pago",
      separando: "Separando",
      enviado: "Enviado",
      finalizado: "Finalizado",
      pending: "Pendente",
      paid: "Pago",
      processing: "Separando",
      shipped: "Enviado",
      cancelled: "Cancelado",
    };
    return (s: string) => map[s] ?? s;
  }, []);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setErr("");

    const [{ data: orderData, error: orderErr }, { data: itemsData, error: itemsErr }, { data: trackData, error: trackErr }] =
      await Promise.all([
        cloud.from("store_orders").select("id, status, total, shipping, subtotal, discount, created_at").eq("id", id).single(),
        cloud.from("store_order_items").select("name_snapshot, quantity, line_total").eq("order_id", id).order("created_at", { ascending: true }),
        cloud.from("store_order_tracking").select("id, status, detail, created_at").eq("order_id", id).order("created_at", { ascending: false }),
      ]);

    if (orderErr) {
      setErr(orderErr.message);
      setLoading(false);
      return;
    }
    if (itemsErr) {
      setErr(itemsErr.message);
      setLoading(false);
      return;
    }
    if (trackErr) {
      setErr(trackErr.message);
      setLoading(false);
      return;
    }

    setOrder(orderData as any);
    setItems((itemsData ?? []) as any);
    setTracking((trackData ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, id]);

  if (!sessionLoading && !user) return <Navigate to="/conta" replace state={{ from: `/rastreio/${id}` }} />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader cartCount={0} />
      <StoreMobileChrome cartCount={0} />

      <main className="main-content max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10 space-y-6">
        <header className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Rastreio do pedido</h1>
            <p className="text-sm text-muted-foreground">Acompanhe atualizações da entrega.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/pedidos">Voltar</Link>
            </Button>
          </div>
        </header>

        {loading ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Carregando rastreio...</CardContent>
          </Card>
        ) : err ? (
          <Card>
            <CardContent className="py-10 text-center text-destructive">{err}</CardContent>
          </Card>
        ) : !order ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Pedido não encontrado.</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pedido</span>
                  <span className="font-semibold">#{order.id.slice(0, 8)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold">{statusLabel(order.status)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{formatCurrency(Number(order.subtotal))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Frete</span>
                  <span className="font-semibold">{formatCurrency(Number(order.shipping))}</span>
                </div>
                {Number(order.discount) > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Desconto</span>
                    <span className="font-semibold">- {formatCurrency(Number(order.discount))}</span>
                  </div>
                ) : null}
                <div className="border-t border-border pt-2 flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-lg font-bold">{formatCurrency(Number(order.total))}</span>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-3 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Atualizações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tracking.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Sem atualizações ainda.</div>
                  ) : (
                    <div className="space-y-3">
                      {tracking.map((t) => (
                        <div key={t.id} className="rounded-xl border border-border bg-card p-3">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="font-medium">{statusLabel(t.status)}</div>
                            <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                          </div>
                          {t.detail ? <div className="text-sm text-muted-foreground mt-1">{t.detail}</div> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Itens</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((i, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{i.name_snapshot}</div>
                        <div className="text-xs text-muted-foreground">Qtd: {i.quantity}</div>
                      </div>
                      <div className="font-semibold">{formatCurrency(Number(i.line_total))}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
