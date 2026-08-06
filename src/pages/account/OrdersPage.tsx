import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { AppHeader } from "@/components/store/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { formatCurrency } from "@/utils/formatters";
import { Package, Truck, CheckCircle2, Search, ArrowRight, RefreshCcw } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type OrderRow = {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  shipping: number;
  discount: number;
  created_at: string;
  tracking?: {
    tracking_code: string;
    estimated_delivery_at: string;
    status: {
      label: string;
      color: string;
      progress_percentage: number;
    }
  }
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
    try {
      const { data, error } = await cloud
        .from("store_orders")
        .select(`
          id, status, total, subtotal, shipping, discount, created_at,
          tracking:order_tracking_main(
            tracking_code,
            estimated_delivery_at,
            status:order_tracking_status(label, color, progress_percentage)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders((data ?? []) as any);
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
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

      <main className="main-content max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10 space-y-8">
        <header className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase">Meus pedidos</h1>
            <p className="text-sm text-muted-foreground">Gerencie suas compras e acompanhe as entregas.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/conta">Minha conta</Link>
            </Button>
            <Button variant="default" className="rounded-xl font-bold px-6" onClick={() => nav("/loja")}>
              Comprar mais
            </Button>
          </div>
        </header>

        {loading ? (
          <div className="space-y-4">
             {[1,2,3].map(i => <div key={i} className="h-32 bg-muted/50 rounded-2xl animate-pulse" />)}
          </div>
        ) : err ? (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="py-10 text-center text-destructive">{err}</CardContent>
          </Card>
        ) : orders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                <Package className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold">Você ainda não tem pedidos.</p>
                <p className="text-sm text-muted-foreground">Seu histórico de compras aparecerá aqui.</p>
              </div>
              <Button asChild className="rounded-xl font-bold px-8">
                <Link to="/loja">Ir para o catálogo</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const tracking = (o as any).tracking?.[0];
              const progress = tracking?.status?.progress_percentage || (o.status === 'finalizado' ? 100 : 0);
              const displayStatus = tracking?.status?.label || statusLabel(o.status);

              return (
                <Card key={o.id} className="overflow-hidden border-2 border-primary/5 hover:border-primary/20 transition-all duration-300">
                  <div className="p-4 md:p-6 space-y-6">
                    {/* Header: Order info and status */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <h3 className="font-bold text-lg">Pedido #{o.id.slice(0, 8)}</h3>
                             <Badge style={tracking?.status?.color ? { backgroundColor: tracking.status.color, color: 'white' } : {}} variant="outline">
                               {displayStatus}
                             </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Realizado em {new Date(o.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total</p>
                         <p className="text-xl font-black text-primary">{formatCurrency(Number(o.total))}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                       <div className="flex justify-between items-center text-xs font-bold uppercase text-muted-foreground mb-1">
                          <span className="flex items-center gap-1"><RefreshCcw className="w-3 h-3" /> Status do Rastreio</span>
                          <span>{progress}% Concluído</span>
                       </div>
                       <Progress value={progress} className="h-2.5 bg-muted" />
                       <div className="flex justify-between text-[10px] text-muted-foreground font-medium mt-1">
                          <span>Confirmado</span>
                          <span>Em transporte</span>
                          <span>Entregue</span>
                       </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-dashed">
                       {tracking?.estimated_delivery_at ? (
                         <div className="flex items-center gap-2 text-xs font-medium">
                            <Truck className="w-4 h-4 text-primary" />
                            <span>Previsão: <span className="font-bold">{new Date(tracking.estimated_delivery_at).toLocaleDateString()}</span></span>
                         </div>
                       ) : <div />}

                       <div className="flex items-center gap-2 w-full sm:w-auto">
                         <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none rounded-xl font-bold h-10 px-6">
                            <Link to={`/rastreio/${o.id}`}>Rastrear</Link>
                         </Button>
                         <Button variant="secondary" size="sm" className="flex-1 sm:flex-none rounded-xl font-bold h-10 px-6" onClick={() => nav("/checkout")}>
                            Repetir Pedido
                         </Button>
                       </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Badge({ children, variant = "default", className = "", style = {} }: { children: React.ReactNode, variant?: string, className?: string, style?: React.CSSProperties }) {
  const variants: any = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    outline: "border border-border bg-background text-foreground",
  };
  return (
    <div style={style} className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant] || variants.default} ${className}`}>
      {children}
    </div>
  );
}
