import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
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
  subtotal: number;
  shipping: number;
  discount: number;
  created_at: string;
};

export default function OrdersPage() {
  const nav = useNavigate();
  const { user, loading: sessionLoading } = useSession();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const load = async () => {
    setLoading(true);
    setErr("");
    const { data, error } = await cloud
      .from("store_orders")
      .select("id, status, total, subtotal, shipping, discount, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setOrders([]);
      setLoading(false);
      return;
    }

    setOrders((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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

  if (!sessionLoading && !user) return <Navigate to="/conta" replace state={{ from: "/pedidos" }} />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader cartCount={0} />
      <StoreMobileChrome cartCount={0} />

      <main className="main-content max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10 space-y-6">
        <header className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Meus pedidos</h1>
            <p className="text-sm text-muted-foreground">Acompanhe status e rastreio.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/conta">Minha conta</Link>
            </Button>
            <Button variant="ghost" onClick={() => nav("/loja")}>
              Ver catálogo
            </Button>
          </div>
        </header>

        {loading ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Carregando pedidos...</CardContent>
          </Card>
        ) : err ? (
          <Card>
            <CardContent className="py-10 text-center text-destructive">{err}</CardContent>
          </Card>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Você ainda não tem pedidos. <Link to="/loja" className="underline">Ir para o catálogo</Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Card key={o.id} className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between gap-3 flex-wrap">
                    <span>Pedido #{o.id.slice(0, 8)}</span>
                    <span className="text-sm text-muted-foreground">{statusLabel(o.status)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                  <div className="font-bold">{formatCurrency(Number(o.total))}</div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/rastreio/${o.id}`}>Rastrear</Link>
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => nav("/checkout")}>Repetir pedido</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
