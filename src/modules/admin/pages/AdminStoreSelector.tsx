import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { useSession } from "@/hooks/useSession";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Store,
  ShoppingCart,
  Package,
  TrendingUp,
  Users,
  ArrowRight,
  Crown,
  Building2,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import type { AppStore } from "@/contexts/StoreContext";

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

type StoreSummary = {
  store: StoreRow;
  orderCount: number;
  productCount: number;
  revenue: number;
};

export default function AdminStoreSelector() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { isMaster, storeAccess, loading: permLoading } = useAdminPermissions();
  const { setStore } = useStore();
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [summaries, setSummaries] = useState<StoreSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (permLoading) return;
    loadStores();
  }, [permLoading, isMaster, storeAccess]);

  const loadStores = async () => {
    setLoading(true);
    const { data } = await cloud
      .from("stores")
      .select("id, name, slug, active")
      .eq("active", true)
      .order("name");

    let available = (data as StoreRow[]) ?? [];

    // Non-master users only see their assigned stores
    if (!isMaster && storeAccess.length > 0) {
      const allowedIds = new Set(storeAccess.map((s) => s.store_id));
      available = available.filter((s) => allowedIds.has(s.id));
    }

    setStores(available);

    // If non-master with only 1 store, auto-enter
    if (!isMaster && available.length === 1) {
      enterStore(available[0]);
      return;
    }

    // Load summaries for master dashboard
    if (isMaster) {
      const sums: StoreSummary[] = [];
      for (const store of available) {
        sums.push({
          store,
          orderCount: 0,
          productCount: 0,
          revenue: 0,
        });
      }

      // Fetch counts
      const [{ count: orderCount }, { count: productCount }] = await Promise.all([
        cloud.from("store_orders").select("*", { count: "exact", head: true }),
        cloud.from("store_products").select("*", { count: "exact", head: true }).eq("active", true),
      ]);

      // For now distribute globally since products/orders aren't store-scoped yet
      if (sums.length > 0) {
        sums[0].orderCount = orderCount ?? 0;
        sums[0].productCount = productCount ?? 0;
      }

      setSummaries(sums);
    }

    setLoading(false);
  };

  const enterStore = (store: StoreRow) => {
    const slugMap: Record<string, AppStore> = {
      materiais: "materiais",
      fortlev: "fortlev",
      construcao: "construcao",
    };
    const appStore = slugMap[store.slug] ?? "materiais";
    setStore(appStore);
    navigate("/admin/dashboard");
  };

  const storeIcon = (slug: string) => {
    if (slug === "materiais") return <Building2 className="w-6 h-6" />;
    if (slug === "fortlev") return <Package className="w-6 h-6" />;
    return <Store className="w-6 h-6" />;
  };

  if (loading || permLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-sm text-muted-foreground animate-pulse">Carregando lojas...</div>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="rounded-2xl max-w-md">
          <CardContent className="p-8 text-center space-y-3">
            <Store className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <h2 className="text-lg font-semibold">Sem acesso a lojas</h2>
            <p className="text-sm text-muted-foreground">
              Você não possui acesso a nenhuma loja. Entre em contato com o administrador master.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        {isMaster && (
          <Badge variant="destructive" className="mb-2">
            <Crown className="w-3 h-3 mr-1" /> MASTER
          </Badge>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {isMaster ? "Painel Global" : "Selecionar Loja"}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {isMaster
            ? "Visão geral de todas as lojas do sistema. Selecione uma para gerenciar."
            : "Escolha a loja que deseja acessar."}
        </p>
      </div>

      {/* Global stats for master */}
      {isMaster && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="rounded-xl">
            <CardContent className="p-4 text-center">
              <Store className="w-5 h-5 mx-auto mb-1 text-primary" />
              <div className="text-2xl font-bold">{stores.length}</div>
              <div className="text-xs text-muted-foreground">Lojas ativas</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-4 text-center">
              <ShoppingCart className="w-5 h-5 mx-auto mb-1 text-primary" />
              <div className="text-2xl font-bold">{summaries.reduce((s, x) => s + x.orderCount, 0)}</div>
              <div className="text-xs text-muted-foreground">Pedidos total</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-4 text-center">
              <Package className="w-5 h-5 mx-auto mb-1 text-primary" />
              <div className="text-2xl font-bold">{summaries.reduce((s, x) => s + x.productCount, 0)}</div>
              <div className="text-xs text-muted-foreground">Produtos ativos</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-4 text-center">
              <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
              <div className="text-2xl font-bold">{storeAccess.length || "∞"}</div>
              <div className="text-xs text-muted-foreground">Acessos</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Store cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((store) => {
          const summary = summaries.find((s) => s.store.id === store.id);
          return (
            <Card
              key={store.id}
              className="rounded-2xl hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/40 group"
              onClick={() => enterStore(store)}
            >
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-primary/10 p-2.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {storeIcon(store.slug)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">{store.name}</h3>
                      <p className="text-xs text-muted-foreground">/{store.slug}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                </div>

                {isMaster && summary && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                    <div className="text-center">
                      <div className="text-sm font-bold">{summary.orderCount}</div>
                      <div className="text-[10px] text-muted-foreground">Pedidos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold">{summary.productCount}</div>
                      <div className="text-[10px] text-muted-foreground">Produtos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold">
                        <Badge variant="outline" className="text-[10px]">Ativa</Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground">Status</div>
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  className="w-full h-9 text-xs sm:text-sm group-hover:bg-primary group-hover:text-primary-foreground"
                  variant="outline"
                >
                  Acessar loja <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}