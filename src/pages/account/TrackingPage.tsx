import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { AppHeader } from "@/components/store/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { StoreFooter } from "@/components/store/StoreFooter";
import { Clock, ArrowLeft } from "lucide-react";
import { Badge as UIBadge } from "@/components/ui/badge";
import {
  TrackingCustomerCard,
  type TrackingCustomerCardProps,
  type TrackingOrderItem,
} from "@/components/store/tracking/TrackingCustomerCard";
import { useTenant } from "@/providers/TenantProvider";
import {
  resolveTrackingItemsAndTotal,
  type RawTrackingItemInput,
} from "@/utils/trackingItems";

type OrderRow = {
  id: string;
  store_id?: string | null;
  status: string;
  total: number;
  shipping: number;
  subtotal: number;
  discount: number;
  customer_name?: string | null;
  customer_cpf?: string | null;
  address?: string | null;
  cep?: string | null;
  created_at: string;
};

type TrackingData = {
  store_id?: string | null;
  tracking_code?: string | null;
  estimated_delivery_at?: string | null;
  posted_at?: string | null;
  delivered_at?: string | null;
  metadata?: {
    custom_items?: RawTrackingItemInput[];
    custom_progress?: number;
    custom_total?: number;
  } | null;
  store?: { id: string; name: string; slug: string } | null;
  status?: { label?: string | null; progress_percentage?: number | null } | null;
  carrier?: TrackingCustomerCardProps["carrier"];
  timeline?: TrackingCustomerCardProps["timeline"];
};

export default function TrackingPage() {
  const { id } = useParams();
  const { user, loading: sessionLoading } = useSession();
  const { store: tenantStore } = useTenant();

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<TrackingOrderItem[]>([]);
  const [resolvedTotal, setResolvedTotal] = useState<number>(0);
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [timeline, setTimeline] = useState<NonNullable<TrackingCustomerCardProps["timeline"]>>([]);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [storeAddress, setStoreAddress] = useState<string | null>(null);
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

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr("");

    try {
      const [orderRes, itemsRes] = await Promise.all([
        cloud
          .from("store_orders")
          .select("id, store_id, status, total, shipping, subtotal, discount, customer_name, customer_cpf, address, cep, created_at")
          .eq("id", id)
          .single(),
        cloud
          .from("store_order_items")
          .select("name_snapshot, unit_snapshot, price_snapshot, quantity, line_total")
          .eq("order_id", id)
          .order("created_at", { ascending: true }),
      ]);

      if (orderRes.error) throw orderRes.error;
      const loadedOrder = orderRes.data as OrderRow;
      setOrder(loadedOrder);

      const { data: trackData, error: trackErr } = await cloud
        .from("order_tracking_main")
        .select(`
          *,
          store:stores(id, name, slug),
          status:order_tracking_status(*),
          carrier:order_tracking_carriers(*),
          timeline:order_tracking_timeline(*)
        `)
        .eq("order_id", id)
        .maybeSingle();

      if (trackErr) throw trackErr;

      const typedTrackData = (trackData as unknown as TrackingData | null) ?? null;
      if (typedTrackData) {
        setTracking(typedTrackData);
        setTimeline(typedTrackData.timeline || []);
      }

      const resolved = await resolveTrackingItemsAndTotal({
        orderItems: (itemsRes.data ?? []) as RawTrackingItemInput[],
        customItems: typedTrackData?.metadata?.custom_items,
        orderTotal: loadedOrder.total,
        customTotal: typedTrackData?.metadata?.custom_total,
        customerCpf: loadedOrder.customer_cpf,
      });
      setItems(resolved.items);
      setResolvedTotal(resolved.total);

      const effectiveStoreId = typedTrackData?.store_id || loadedOrder?.store_id || null;
      let footerStoreName: string | null = null;
      let footerStoreAddress: string | null = null;
      if (effectiveStoreId) {
        try {
          const { data: footerData } = await cloud
            .from("home_footer")
            .select("store_name, address")
            .eq("store_id", effectiveStoreId)
            .eq("active", true)
            .eq("key", "main")
            .maybeSingle();
          footerStoreName = footerData?.store_name || null;
          footerStoreAddress = footerData?.address || null;
        } catch {
          // Fallback to store join
        }
      }

      setStoreName(footerStoreName || typedTrackData?.store?.name || tenantStore?.name || null);
      setStoreAddress(footerStoreAddress);
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : "Erro ao carregar rastreio.");
    } finally {
      setLoading(false);
    }
  }, [id, tenantStore?.name]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (!sessionLoading && !user) return <Navigate to="/conta" replace state={{ from: `/rastreio/${id}` }} />;

  const customPct = typeof tracking?.metadata?.custom_progress === "number" ? tracking.metadata.custom_progress : null;
  const progress = customPct ?? tracking?.status?.progress_percentage ?? 20;

  return (
    <div className="min-h-screen flex flex-col bg-background pt-[var(--store-header-offset)]">
      <AppHeader cartCount={0} />
      <StoreMobileChrome cartCount={0} />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-10 space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="rounded-full">
              <Link to="/pedidos">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Rastreio do pedido</h1>
              <p className="text-sm text-muted-foreground">Acompanhe atualizações da entrega e logística do pedido.</p>
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
            storeName={storeName}
            storeAddress={storeAddress}
            timeline={timeline}
            items={items}
            orderTotal={resolvedTotal || order.total || tracking?.metadata?.custom_total}
            customerName={order.customer_name}
            address={order.address}
            cep={order.cep}
          />
        )}
      </main>
      <StoreFooter />
    </div>
  );
}
