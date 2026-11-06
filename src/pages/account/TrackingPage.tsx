import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { AppHeader } from "@/components/store/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { Clock, ArrowLeft } from "lucide-react";
import { Badge as UIBadge } from "@/components/ui/badge";
import { TrackingCustomerCard } from "@/components/store/tracking/TrackingCustomerCard";

type OrderRow = {
  id: string;
  status: string;
  total: number;
  shipping: number;
  subtotal: number;
  discount: number;
  customer_name?: string | null;
  address?: string | null;
  created_at: string;
};

export default function TrackingPage() {
  const { id } = useParams();
  const { user, loading: sessionLoading } = useSession();

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<Array<{ name_snapshot: string; quantity: number; line_total: number }>>([]);
  const [tracking, setTracking] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const statusLabel = (s: string) => {
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
    return map[s] ?? s;
  };

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setErr("");

    try {
      const [orderRes, itemsRes] = await Promise.all([
        cloud
          .from("store_orders")
          .select("id, status, total, shipping, subtotal, discount, customer_name, address, created_at")
          .eq("id", id)
          .single(),
        cloud
          .from("store_order_items")
          .select("name_snapshot, quantity, line_total")
          .eq("order_id", id)
          .order("created_at", { ascending: true }),
      ]);

      if (orderRes.error) throw orderRes.error;
      setOrder(orderRes.data as any);
      setItems((itemsRes.data ?? []) as any);

      const { data: trackData, error: trackErr } = await cloud
        .from("order_tracking_main")
        .select(`
          *,
          status:order_tracking_status(*),
          carrier:order_tracking_carriers(*),
          timeline:order_tracking_timeline(*)
        `)
        .eq("order_id", id)
        .maybeSingle();

      if (trackErr) throw trackErr;

      if (trackData) {
        setTracking(trackData);
        setTimeline(trackData.timeline || []);
      }
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) void load();
  }, [user?.id, id]);

  if (!sessionLoading && !user) return <Navigate to="/conta" replace state={{ from: `/rastreio/${id}` }} />;

  const customPct = typeof tracking?.metadata?.custom_progress === "number" ? tracking.metadata.custom_progress : null;
  const progress = customPct ?? tracking?.status?.progress_percentage ?? 20;

  return (
    <div className="min-h-screen bg-background pt-[var(--store-header-offset)]">
      <AppHeader cartCount={0} />
      <StoreMobileChrome cartCount={0} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10 space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="rounded-full">
              <Link to="/pedidos">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Rastreio do pedido</h1>
              <p className="text-sm text-muted-foreground">Acompanhe atualizações da entrega e transportadora oficial.</p>
            </div>
          </div>
          <UIBadge variant="outline" className="hidden sm:flex font-black border-primary/20 text-primary">
            Pedido #{id?.slice(0, 8)}
          </UIBadge>
        </header>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <Clock className="w-10 h-10 animate-spin text-primary/40" />
            <p>Carregando dados do rastreio...</p>
          </div>
        ) : err ? (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="py-10 text-center text-destructive">{err}</CardContent>
          </Card>
        ) : !order ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Pedido não encontrado.</CardContent>
          </Card>
        ) : (
          <TrackingCustomerCard
            trackingCode={tracking?.tracking_code || `PED-${order.id.slice(0, 8).toUpperCase()}`}
            orderId={order.id}
            statusLabel={tracking?.status?.label || statusLabel(order.status)}
            progress={progress}
            estimatedDeliveryAt={tracking?.estimated_delivery_at}
            postedAt={tracking?.posted_at}
            deliveredAt={tracking?.delivered_at}
            carrier={tracking?.carrier}
            timeline={timeline}
            items={items}
            orderTotal={order.total || tracking?.metadata?.custom_total}
            customerName={order.customer_name}
            address={order.address}
          />
        )}
      </main>
    </div>
  );
}
