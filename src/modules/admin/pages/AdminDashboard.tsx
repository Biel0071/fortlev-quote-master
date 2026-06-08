import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { useStore } from "@/contexts/StoreContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";

type OrderRow = {
  id: string;
  status: string;
  total: number;
  created_at: string;
  customer_name: string | null;
};

export default function AdminDashboard() {
  const { activeStoreId } = useStore();
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [productsCount, setProductsCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [categoriesActiveCount, setCategoriesActiveCount] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [paidOrdersCount, setPaidOrdersCount] = useState(0);
  const [todayOrdersCount, setTodayOrdersCount] = useState(0);

  const load = async () => {
    if (!activeStoreId) return;
    setLoading(true);


    const [ordersRes, productsRes, outRes, catRes, paidRes, todayRes] = await Promise.all([
      cloud
        .from("store_orders")
        .select("id, status, total, created_at, customer_name")
        .eq("store_id", activeStoreId)
        .order("created_at", { ascending: false })
        .limit(8),
      cloud.from("store_products").select("id", { count: "exact", head: true }).eq("store_id", activeStoreId),
      cloud.from("store_products").select("id", { count: "exact", head: true }).eq("store_id", activeStoreId).lte("stock", 0),
      cloud.from("store_categories").select("id", { count: "exact", head: true }).eq("store_id", activeStoreId).eq("active", true),
      cloud
        .from("store_orders")
        .select("total", { count: "exact" })
        .eq("store_id", activeStoreId)
        .in("status", ["pago", "finalizado"])
        .limit(1000),
      cloud
        .from("store_orders")
        .select("id", { count: "exact", head: true })
        .eq("store_id", activeStoreId)
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),

    ]);

    setOrders((ordersRes.data ?? []) as any);
    setProductsCount(productsRes.count ?? 0);
    setOutOfStockCount(outRes.count ?? 0);
    setCategoriesActiveCount(catRes.count ?? 0);

    const paidTotals = (paidRes.data ?? []).map((r: any) => Number(r.total ?? 0));
    const sum = paidTotals.reduce((acc, v) => acc + v, 0);
    setTotalSales(sum);
    setPaidOrdersCount(paidRes.count ?? paidTotals.length);

    setTodayOrdersCount(todayRes.count ?? 0);

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [activeStoreId]);


  const avgTicket = useMemo(() => {
    if (paidOrdersCount <= 0) return 0;
    return totalSales / paidOrdersCount;
  }, [paidOrdersCount, totalSales]);

  const badgeVariant = (s: string) => {
    if (s === "pago") return "default";
    if (s === "finalizado") return "secondary";
    if (s === "enviado") return "outline";
    return "outline" as any;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="glass-card card-hover rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total de vendas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{loading ? "—" : formatCurrency(totalSales)}</CardContent>
        </Card>

        <Card className="glass-card card-hover rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pedidos do dia</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{loading ? "—" : todayOrdersCount}</CardContent>
        </Card>

        <Card className="glass-card card-hover rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ticket médio</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{loading ? "—" : formatCurrency(avgTicket)}</CardContent>
        </Card>

        <Card className="glass-card card-hover rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Produtos cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{loading ? "—" : productsCount}</CardContent>
        </Card>

        <Card className="glass-card card-hover rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Produtos sem estoque</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{loading ? "—" : outOfStockCount}</CardContent>
        </Card>

        <Card className="glass-card card-hover rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Categorias ativas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{loading ? "—" : categoriesActiveCount}</CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Últimos pedidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="text-muted-foreground">Carregando...</div>
          ) : orders.length === 0 ? (
            <div className="text-muted-foreground">Nenhum pedido ainda.</div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="rounded-xl border border-border bg-card/60 backdrop-blur p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">#{o.id.slice(0, 8)} • {o.customer_name ?? "Cliente"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={badgeVariant(o.status)}>{o.status}</Badge>
                  <div className="font-semibold">{formatCurrency(Number(o.total))}</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
