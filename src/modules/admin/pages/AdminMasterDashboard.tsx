import { useEffect, useState } from "react";
import { cloud } from "@/lib/cloud";
import { useNavigate } from "react-router-dom";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Store,
  ShoppingCart,
  Package,
  TrendingUp,
  Crown,
  ArrowRight,
  DollarSign,
  AlertTriangle,
  Pause,
  Globe,
} from "lucide-react";

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  suspended: boolean;
  segment: string | null;
  domain: string | null;
  plan_id: string | null;
};

type PlanRow = { id: string; name: string; slug: string };

type StoreMetric = {
  store: StoreRow;
  planName: string;
  orderCount: number;
  productCount: number;
  revenue: number;
};

export default function AdminMasterDashboard() {
  const nav = useNavigate();
  const { isMaster } = useAdminPermissions();
  const [metrics, setMetrics] = useState<StoreMetric[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isMaster) return;
    loadData();
  }, [isMaster]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: storesData }, { data: plansData }, { data: ordersData }, { data: productsData }] =
      await Promise.all([
        cloud.from("stores").select("id, name, slug, active, suspended, segment, domain, plan_id").order("name"),
        cloud.from("store_plans").select("id, name, slug").order("sort_order"),
        cloud.from("store_orders").select("id, store_id, total"),
        cloud.from("store_products").select("id, store_id, active").eq("active", true),
      ]);

    const stores = (storesData ?? []) as StoreRow[];
    const allPlans = (plansData ?? []) as PlanRow[];
    setPlans(allPlans);

    const orders = (ordersData ?? []) as { id: string; store_id: string | null; total: number }[];
    const products = (productsData ?? []) as { id: string; store_id: string | null; active: boolean }[];

    const result: StoreMetric[] = stores.map((s) => {
      const storeOrders = orders.filter((o) => o.store_id === s.id);
      const storeProducts = products.filter((p) => p.store_id === s.id);
      const plan = allPlans.find((p) => p.id === s.plan_id);
      return {
        store: s,
        planName: plan?.name ?? "Sem plano",
        orderCount: storeOrders.length,
        productCount: storeProducts.length,
        revenue: storeOrders.reduce((sum, o) => sum + (o.total ?? 0), 0),
      };
    });

    // Sort by revenue desc
    result.sort((a, b) => b.revenue - a.revenue);
    setMetrics(result);
    setLoading(false);
  };

  const toggleSuspend = async (storeId: string, suspended: boolean) => {
    await cloud.from("stores").update({ suspended: !suspended }).eq("id", storeId);
    loadData();
  };

  const toggleActive = async (storeId: string, active: boolean) => {
    await cloud.from("stores").update({ active: !active }).eq("id", storeId);
    loadData();
  };

  if (!isMaster) return <div className="p-8 text-muted-foreground">Acesso restrito ao Admin Master.</div>;

  const totalStores = metrics.length;
  const activeStores = metrics.filter((m) => m.store.active && !m.store.suspended).length;
  const suspendedStores = metrics.filter((m) => m.store.suspended).length;
  const totalRevenue = metrics.reduce((s, m) => s + m.revenue, 0);
  const totalOrders = metrics.reduce((s, m) => s + m.orderCount, 0);
  const totalProducts = metrics.reduce((s, m) => s + m.productCount, 0);

  if (loading) return <div className="p-8 text-muted-foreground animate-pulse">Carregando dashboard global...</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="destructive"><Crown className="w-3 h-3 mr-1" /> MASTER</Badge>
          </div>
          <h1 className="text-2xl font-bold">Dashboard Global</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada de todas as lojas</p>
        </div>
        <Button variant="outline" onClick={() => nav("/admin")}>
          <Store className="w-4 h-4 mr-2" /> Gerenciar Lojas
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: Store, value: totalStores, label: "Total Lojas", color: "text-primary" },
          { icon: TrendingUp, value: activeStores, label: "Ativas", color: "text-green-500" },
          { icon: Pause, value: suspendedStores, label: "Suspensas", color: "text-orange-500" },
          { icon: DollarSign, value: `R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, label: "Receita Total", color: "text-emerald-500" },
          { icon: ShoppingCart, value: totalOrders, label: "Pedidos Total", color: "text-blue-500" },
          { icon: Package, value: totalProducts, label: "Produtos Ativos", color: "text-purple-500" },
        ].map(({ icon: Icon, value, label, color }) => (
          <Card key={label} className="rounded-xl">
            <CardContent className="p-4 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
              <div className="text-xl font-bold">{value}</div>
              <div className="text-[10px] text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ranking */}
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Ranking de Lojas por Receita
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.map((m, i) => (
              <div
                key={m.store.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-bold text-muted-foreground w-6 text-center">
                    {i + 1}º
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{m.store.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Globe className="w-3 h-3" />
                      <span>{m.store.domain ?? m.store.slug}</span>
                      <Badge variant="outline" className="text-[9px] h-4">{m.planName}</Badge>
                      {m.store.suspended && <Badge variant="destructive" className="text-[9px] h-4">Suspensa</Badge>}
                      {!m.store.active && !m.store.suspended && <Badge variant="secondary" className="text-[9px] h-4">Inativa</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm shrink-0">
                  <div className="text-right">
                    <div className="font-bold">R$ {m.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                    <div className="text-[10px] text-muted-foreground">{m.orderCount} pedidos · {m.productCount} produtos</div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      title={m.store.suspended ? "Reativar" : "Suspender"}
                      onClick={() => toggleSuspend(m.store.id, m.store.suspended)}
                    >
                      {m.store.suspended ? <TrendingUp className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => {
                        nav("/admin");
                      }}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {metrics.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma loja cadastrada.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plans overview */}
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Distribuição por Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {plans.map((plan) => {
              const count = metrics.filter((m) => m.store.plan_id === plan.id).length;
              return (
                <div key={plan.id} className="p-4 rounded-lg bg-muted/30 text-center">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm font-medium">{plan.name}</div>
                  <div className="text-xs text-muted-foreground">lojas</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
