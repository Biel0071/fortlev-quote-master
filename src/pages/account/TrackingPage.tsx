import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { AppHeader } from "@/components/store/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { formatCurrency } from "@/utils/formatters";
import { Package, Truck, CheckCircle2, MapPin, Calendar, Clock, ArrowLeft, Box } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type OrderRow = {
  id: string;
  status: string;
  total: number;
  shipping: number;
  subtotal: number;
  discount: number;
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
      // Get order and items
      const [orderRes, itemsRes] = await Promise.all([
        cloud.from("store_orders").select("id, status, total, shipping, subtotal, discount, created_at").eq("id", id).single(),
        cloud.from("store_order_items").select("name_snapshot, quantity, line_total").eq("order_id", id).order("created_at", { ascending: true })
      ]);

      if (orderRes.error) throw orderRes.error;
      setOrder(orderRes.data as any);
      setItems((itemsRes.data ?? []) as any);

      // Get tracking main record and timeline
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
    if (user) load();
  }, [user?.id, id]);

  if (!sessionLoading && !user) return <Navigate to="/conta" replace state={{ from: `/rastreio/${id}` }} />;

  const progress = tracking?.status?.progress_percentage ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader cartCount={0} />
      <StoreMobileChrome cartCount={0} />

      <main className="main-content max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10 space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
             <Button asChild variant="ghost" size="icon" className="rounded-full">
                <Link to="/pedidos"><ArrowLeft className="w-5 h-5" /></Link>
             </Button>
             <div>
               <h1 className="text-2xl font-bold tracking-tight">Rastreio do pedido</h1>
               <p className="text-sm text-muted-foreground">Acompanhe atualizações da entrega.</p>
             </div>
          </div>
          <Badge variant="outline" className="hidden sm:flex">Pedido #{id?.slice(0,8)}</Badge>
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
          <div className="space-y-6">
            {/* Progress Card */}
            <Card className="overflow-hidden border-2 border-primary/5">
              <CardContent className="p-6 md:p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      {progress === 100 ? <CheckCircle2 className="w-7 h-7" /> : <Truck className="w-7 h-7" />}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{tracking?.status?.label || statusLabel(order.status)}</h2>
                      {tracking?.tracking_code && (
                        <p className="text-sm text-muted-foreground">Código: <span className="font-mono text-foreground font-medium">{tracking.tracking_code}</span></p>
                      )}
                    </div>
                  </div>
                  {tracking?.estimated_delivery_at && (
                    <div className="bg-muted/50 p-3 rounded-xl flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Previsão de Entrega</p>
                        <p className="font-semibold">{new Date(tracking.estimated_delivery_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Progress value={progress} className="h-3" />
                  <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground px-1">
                    <span>Pedido Criado</span>
                    <span>Em Transporte</span>
                    <span>Entregue</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Timeline */}
              <div className="lg:col-span-3 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" /> Histórico
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-10">
                    {timeline.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-10 flex flex-col items-center gap-2">
                        <Box className="w-10 h-10 text-muted-foreground/20" />
                        <p>Aguardando as primeiras atualizações da transportadora.</p>
                      </div>
                    ) : (
                      <div className="relative pl-4 space-y-8 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted-foreground/10">
                        {timeline.sort((a,b) => new Date(b.event_at).getTime() - new Date(a.event_at).getTime()).map((t, idx) => (
                          <div key={t.id} className="relative pl-8">
                            <div className={`absolute left-[-5px] top-1.5 w-3 h-3 rounded-full border-2 border-background ${idx === 0 ? 'bg-primary scale-125' : 'bg-muted-foreground/30'}`} />
                            <div className="flex flex-col">
                              <div className="flex items-center justify-between gap-3">
                                <span className={`font-bold ${idx === 0 ? 'text-primary' : 'text-foreground/80'}`}>{t.title}</span>
                                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase">
                                  {new Date(t.event_at).toLocaleDateString()} {new Date(t.event_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </div>
                              {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
                              {(t.location_city || t.location_state) && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground/80 mt-1">
                                  <MapPin className="w-3 h-3" />
                                  {t.location_city}{t.location_city && t.location_state ? ', ' : ''}{t.location_state}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Carrier info */}
                {tracking?.carrier && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Transportadora</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-4">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                             <Truck className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                             <p className="font-semibold">{tracking.carrier.name}</p>
                             {tracking.carrier.website && (
                               <a href={tracking.carrier.website} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Ver site oficial</a>
                             )}
                          </div>
                       </div>
                       {tracking.carrier.tracking_url_template && (
                         <Button variant="outline" size="sm" asChild>
                            <a href={tracking.carrier.tracking_url_template.replace('{{code}}', tracking.tracking_code)} target="_blank" rel="noreferrer">
                              Rastreio Externo
                            </a>
                         </Button>
                       )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar: Details & Items */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Resumo do Pedido</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
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
                        <span className="font-semibold text-green-600">- {formatCurrency(Number(order.discount))}</span>
                      </div>
                    ) : null}
                    <div className="border-t border-border pt-2 flex items-center justify-between">
                      <span className="font-bold">Total</span>
                      <span className="text-lg font-bold text-primary">{formatCurrency(Number(order.total))}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Itens</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {items.map((i, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{i.name_snapshot}</div>
                          <div className="text-xs text-muted-foreground">Qtd: {i.quantity}</div>
                        </div>
                        <div className="font-semibold whitespace-nowrap">{formatCurrency(Number(i.line_total))}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Badge({ children, variant = "default", className = "", style = {} }: { children: React.ReactNode, variant?: string, className?: string, style?: React.CSSProperties }) {
  const variants: any = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  };
  return (
    <div style={style} className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant] || variants.default} ${className}`}>
      {children}
    </div>
  );
}
