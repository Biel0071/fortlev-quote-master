import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useSession } from "@/hooks/useSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/formatters";
import type { StoreOrder, StoreOrderItem } from "@/types/store";

const STATUS_OPTIONS = ["pending", "paid", "processing", "shipped", "cancelled"] as const;

export default function AdminOrders() {
  const { user, loading: sessionLoading } = useSession();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [selected, setSelected] = useState<StoreOrder | null>(null);
  const [items, setItems] = useState<StoreOrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await cloud
      .from("store_orders")
      .select("id, status, customer_name, customer_email, customer_phone, cep, address, notes, subtotal, shipping, total, checkout_mode, payment_method, whatsapp_sent, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setOrders([]);
    } else {
      setOrders((data ?? []) as any);
    }
    setLoading(false);
  };

  const loadItems = async (orderId: string) => {
    setLoadingItems(true);
    const { data, error } = await cloud
      .from("store_order_items")
      .select("id, order_id, product_id, name_snapshot, unit_snapshot, price_snapshot, quantity, line_total, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setItems([]);
    } else {
      setItems((data ?? []) as any);
    }
    setLoadingItems(false);
  };

  useEffect(() => {
    if (user && isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  useEffect(() => {
    if (!selected) return;
    loadItems(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const selectedTitle = useMemo(() => {
    if (!selected) return "Selecione um pedido";
    const shortId = selected.id.slice(0, 8);
    return `Pedido #${shortId}`;
  }, [selected]);

  const canRender = !sessionLoading && !adminLoading;
  if (!canRender) return <div className="p-6 text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (!isAdmin) return <div className="p-6 text-destructive">Acesso negado.</div>;

  const badgeVariant = (s: string) => {
    if (s === "paid") return "default";
    if (s === "shipped") return "secondary";
    if (s === "cancelled") return "destructive";
    return "outline" as any;
  };

  const updateStatus = async (status: string) => {
    if (!selected) return;
    const { error } = await cloud.from("store_orders").update({ status }).eq("id", selected.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Atualizado", description: `Status: ${status}` });
    await load();
    setSelected((prev) => (prev ? { ...prev, status } : prev));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="font-semibold">Admin • Pedidos</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => nav("/admin")}>Produtos</Button>
            <Button variant="outline" onClick={() => nav("/admin/categorias")}>Categorias</Button>
            <Button variant="outline" onClick={() => nav("/admin/paginas")}>Páginas</Button>
            <Button variant="outline" onClick={() => nav("/")}>Ver loja</Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await cloud.auth.signOut();
                nav("/");
              }}
            >
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lista</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="text-muted-foreground">Carregando...</div>
            ) : orders.length === 0 ? (
              <div className="text-muted-foreground">Nenhum pedido ainda.</div>
            ) : (
              orders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className="w-full text-left rounded-xl border border-border bg-card p-3 hover:bg-muted/30 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">#{o.id.slice(0, 8)}</div>
                    <Badge variant={badgeVariant(o.status)}>{o.status}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground flex items-center justify-between">
                    <span>{o.customer_name ?? "Cliente"}</span>
                    <span className="font-semibold text-foreground">{formatCurrency(Number(o.total))}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{selectedTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <div className="text-muted-foreground">Clique em um pedido para ver detalhes.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-border p-4">
                    <div className="text-muted-foreground">Cliente</div>
                    <div className="font-medium">{selected.customer_name ?? "-"}</div>
                    <div className="text-muted-foreground mt-2">Contato</div>
                    <div>{selected.customer_phone ?? "-"}</div>
                    <div>{selected.customer_email ?? "-"}</div>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <div className="text-muted-foreground">Entrega</div>
                    <div>{selected.cep ?? "-"}</div>
                    <div className="mt-1">{selected.address ?? "-"}</div>
                    {selected.notes && (
                      <>
                        <div className="text-muted-foreground mt-2">Obs.</div>
                        <div>{selected.notes}</div>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(Number(selected.subtotal))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Frete</span>
                    <span className="font-semibold">{formatCurrency(Number(selected.shipping))}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex items-center justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-lg font-bold">{formatCurrency(Number(selected.total))}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Modo: {selected.checkout_mode}{selected.payment_method ? ` • Pagamento: ${selected.payment_method}` : ""}
                    {selected.whatsapp_sent ? " • WhatsApp enviado" : ""}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={selected.status === s ? "default" : "outline"}
                      onClick={() => updateStatus(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="font-medium">Itens</div>
                  {loadingItems ? (
                    <div className="text-muted-foreground">Carregando itens...</div>
                  ) : items.length === 0 ? (
                    <div className="text-muted-foreground">Sem itens.</div>
                  ) : (
                    <div className="space-y-2">
                      {items.map((it) => (
                        <div key={it.id} className="rounded-xl border border-border p-3 text-sm flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium">{it.name_snapshot}</div>
                            <div className="text-xs text-muted-foreground">Qtd: {it.quantity} • {formatCurrency(Number(it.price_snapshot))} / {it.unit_snapshot ?? "un"}</div>
                          </div>
                          <div className="font-semibold">{formatCurrency(Number(it.line_total))}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
