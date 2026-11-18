import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { useStore } from "@/contexts/StoreContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useSession } from "@/hooks/useSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/formatters";
import type { StoreOrder, StoreOrderItem } from "@/types/store";
import { OrderTrackingDialog } from "../components/OrderTrackingDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Copy,
  ExternalLink,
  MapPin,
  MessageCircle,
  Package,
  Search,
  Truck,
  User,
} from "lucide-react";

const STATUS_OPTIONS = ["aguardando", "pago", "separando", "enviado", "finalizado"] as const;

type EnrichedOrder = StoreOrder & {
  customer_cpf?: string | null;
  discount?: number | null;
  tracking?: {
    id: string;
    tracking_code: string;
    estimated_delivery_at: string | null;
    carrier?: { name?: string | null } | null;
    status?: { label?: string | null } | null;
  } | null;
};

type CheckoutCollectionRow = {
  id: string;
  session_id: string;
  nome: string | null;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  observacoes: string | null;
  payment_method: string | null;
  subtotal: number | null;
  total: number | null;
  route_type: string | null;
  cart_items: Array<{
    product_id?: string;
    name?: string;
    quantity?: number;
    unit_price?: number;
    line_subtotal?: number;
  }> | null;
  created_at: string;
  updated_at: string;
};

export default function AdminOrders() {
  const { user, loading: sessionLoading } = useSession();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const nav = useNavigate();
  const { activeStoreId, routes } = useStore();

  const isLocalPreview =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  const [tab, setTab] = useState<"orders" | "collections">("orders");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [collections, setCollections] = useState<CheckoutCollectionRow[]>([]);
  const [selected, setSelected] = useState<EnrichedOrder | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<CheckoutCollectionRow | null>(null);
  const [items, setItems] = useState<StoreOrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);

  const load = useCallback(async () => {
    if (!activeStoreId) return;
    setLoading(true);
    try {
      const [ordersRes, trackingRes, collectionsRes] = await Promise.all([
        cloud
          .from("store_orders")
          .select(
            "id, status, customer_id, customer_name, customer_cpf, customer_email, customer_phone, cep, address, notes, subtotal, shipping, discount, total, checkout_mode, payment_method, whatsapp_sent, created_at"
          )
          .eq("store_id", activeStoreId)
          .order("created_at", { ascending: false }),
        cloud
          .from("order_tracking_main")
          .select(
            "id, order_id, tracking_code, estimated_delivery_at, carrier:order_tracking_carriers(name), status:order_tracking_status!order_tracking_main_current_status_id_fkey(label)"
          )
          .eq("store_id", activeStoreId),
        cloud
          .from("checkout_sessions")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(200),
      ]);

      if (ordersRes.error) throw ordersRes.error;

      const trackByOrder = new Map<string, EnrichedOrder["tracking"]>();
      (trackingRes.data ?? []).forEach((t: Record<string, unknown>) => {
        const oid = String(t.order_id ?? "");
        if (oid) {
          trackByOrder.set(oid, {
            id: String(t.id ?? ""),
            tracking_code: String(t.tracking_code ?? ""),
            estimated_delivery_at: (t.estimated_delivery_at as string | null) ?? null,
            carrier: (t.carrier as { name?: string | null } | null) ?? null,
            status: (t.status as { label?: string | null } | null) ?? null,
          });
        }
      });

      const merged: EnrichedOrder[] = ((ordersRes.data ?? []) as EnrichedOrder[]).map((o) => ({
        ...o,
        tracking: trackByOrder.get(o.id) ?? null,
      }));

      setOrders(merged);
      setCollections((collectionsRes.data ?? []) as CheckoutCollectionRow[]);

      if (!selected && merged.length > 0) {
        const params = new URLSearchParams(window.location.search);
        const orderId = params.get("id");
        const found = orderId ? merged.find((o) => o.id === orderId) : merged[0];
        if (found) setSelected(found);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao carregar pedidos e coletas.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [activeStoreId, selected]);

  const loadItems = useCallback(async (orderId: string) => {
    setLoadingItems(true);
    const { data, error } = await cloud
      .from("store_order_items")
      .select(
        "id, order_id, product_id, name_snapshot, unit_snapshot, price_snapshot, quantity, line_total, created_at"
      )
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error) {
      setItems([]);
    } else {
      setItems((data ?? []) as StoreOrderItem[]);
    }
    setLoadingItems(false);
  }, []);

  useEffect(() => {
    if ((user && isAdmin) || isLocalPreview) {
      void load();
    }
  }, [user, isAdmin, isLocalPreview, activeStoreId, load]);

  useEffect(() => {
    if (!selected?.id) return;
    void loadItems(selected.id);
  }, [selected?.id, loadItems]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        (o.customer_name || "").toLowerCase().includes(q) ||
        (o.customer_cpf || "").toLowerCase().includes(q) ||
        (o.customer_phone || "").toLowerCase().includes(q) ||
        (o.tracking?.tracking_code || "").toLowerCase().includes(q)
    );
  }, [orders, search]);

  const filteredCollections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter(
      (c) =>
        (c.nome || "").toLowerCase().includes(q) ||
        (c.cpf || "").toLowerCase().includes(q) ||
        (c.telefone || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.cep || "").toLowerCase().includes(q)
    );
  }, [collections, search]);

  const canRender = !sessionLoading && !adminLoading;
  if (!canRender && !isLocalPreview) return <div className="p-6 text-muted-foreground">Carregando...</div>;
  if (!user && !isLocalPreview) return <Navigate to="/auth/login" replace />;
  if (!isAdmin && !isLocalPreview) return <div className="p-6 text-destructive">Acesso negado.</div>;

  const badgeVariant = (s: string): "default" | "secondary" | "outline" => {
    if (s === "pago") return "default";
    if (s === "finalizado") return "secondary";
    return "outline";
  };

  const updateStatus = async (status: string) => {
    if (!selected) return;
    const { error } = await cloud.from("store_orders").update({ status }).eq("id", selected.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Atualizado", description: `Status: ${status}` });
    await load();
    setSelected((prev) => (prev ? { ...prev, status } : prev));
  };

  const copyOrderCollectionSheet = (order: EnrichedOrder) => {
    const itemLines = items
      .map((it) => `• ${it.name_snapshot} — Qtd: ${it.quantity} ${it.unit_snapshot || "un"} (${formatCurrency(Number(it.line_total))})`)
      .join("\n");
    const sheet = [
      `PEDIDO #${order.id.slice(0, 8)}`,
      order.tracking?.tracking_code ? `Rastreio: ${order.tracking.tracking_code}` : null,
      `Cliente: ${order.customer_name || "-"}`,
      `CPF/CNPJ: ${order.customer_cpf || "-"}`,
      `Telefone: ${order.customer_phone || "-"}`,
      `E-mail: ${order.customer_email || "-"}`,
      `CEP: ${order.cep || "-"}`,
      `Endereço: ${order.address || "-"}`,
      order.notes ? `Observações: ${order.notes}` : null,
      `Pagamento: ${order.payment_method || order.checkout_mode || "-"}`,
      `Total: ${formatCurrency(Number(order.total || 0))}`,
      itemLines ? `\nItens:\n${itemLines}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(sheet);
    toast({ title: "Ficha de coleta copiada!", description: "Todos os dados do cliente e pedido foram copiados." });
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-4 min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight">
            Pedidos, Coleta de Dados & Rastreio
          </h1>
          <p className="text-xs text-muted-foreground">
            Clique em qualquer pedido ou sessão digitada para consultar todos os dados informados pelo cliente e gerenciar o rastreio.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente, CPF, pedido ou track..."
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "orders" | "collections")}>
        <TabsList>
          <TabsTrigger value="orders" className="text-xs">
            Pedidos & Track ({filteredOrders.length})
          </TabsTrigger>
          <TabsTrigger value="collections" className="text-xs">
            Dados Digitados no Checkout ({filteredCollections.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-w-0">
            <Card className="lg:col-span-2 rounded-2xl min-w-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pedidos Registrados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[620px] overflow-y-auto">
                {loading ? (
                  <div className="text-xs text-muted-foreground py-6 text-center">Carregando...</div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-6 text-center">Nenhum pedido encontrado.</div>
                ) : (
                  filteredOrders.map((o) => {
                    const active = selected?.id === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setSelected(o)}
                        className={`w-full text-left rounded-xl border p-3 transition space-y-1.5 ${
                          active
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border bg-card hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold">#{o.id.slice(0, 8)}</span>
                          <Badge variant={badgeVariant(o.status)} className="text-[10px]">
                            {o.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold truncate">{o.customer_name || "Cliente"}</span>
                          <span className="font-black tabular-nums shrink-0">
                            {formatCurrency(Number(o.total || 0))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span className="truncate">
                            {o.customer_cpf ? `CPF: ${o.customer_cpf}` : o.customer_phone || "Sem doc."}
                          </span>
                          {o.tracking?.tracking_code && (
                            <span className="font-mono text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold shrink-0">
                              {o.tracking.tracking_code}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 rounded-2xl min-w-0">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {selected ? `Ficha Completa • Pedido #${selected.id.slice(0, 8)}` : "Selecione um pedido"}
                  </CardTitle>
                  {selected && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => copyOrderCollectionSheet(selected)}
                      >
                        <Copy className="w-3.5 h-3.5" /> Copiar Coleta
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => setTrackingOpen(true)}
                      >
                        <MapPin className="w-3.5 h-3.5" /> Gerenciar Track
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {!selected ? (
                  <div className="text-xs text-muted-foreground py-8 text-center">
                    Clique em um pedido na coluna ao lado para visualizar todos os dados digitados pelo cliente.
                  </div>
                ) : (
                  <>
                    {/* Dados do Cliente + Endereço Completo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl border border-border p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 uppercase text-[11px]">
                          <User className="w-3.5 h-3.5 text-primary" /> Dados do Cliente
                        </div>
                        <div><span className="text-muted-foreground">Nome:</span> <strong>{selected.customer_name || "—"}</strong></div>
                        <div><span className="text-muted-foreground">CPF/CNPJ:</span> <strong className="font-mono">{selected.customer_cpf || "—"}</strong></div>
                        <div className="flex items-center justify-between gap-2">
                          <span><span className="text-muted-foreground">Telefone:</span> <strong>{selected.customer_phone || "—"}</strong></span>
                          {selected.customer_phone && (
                            <a
                              href={`https://wa.me/55${selected.customer_phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-600 font-bold hover:underline"
                            >
                              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                            </a>
                          )}
                        </div>
                        <div><span className="text-muted-foreground">E-mail:</span> <strong>{selected.customer_email || "—"}</strong></div>
                      </div>

                      <div className="rounded-xl border border-border p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 uppercase text-[11px]">
                          <MapPin className="w-3.5 h-3.5 text-primary" /> Endereço & Coleta
                        </div>
                        <div><span className="text-muted-foreground">CEP:</span> <strong className="font-mono">{selected.cep || "—"}</strong></div>
                        <div><span className="text-muted-foreground">Endereço:</span> <strong>{selected.address || "—"}</strong></div>
                        {selected.notes && (
                          <div><span className="text-muted-foreground">Observações:</span> <strong>{selected.notes}</strong></div>
                        )}
                      </div>
                    </div>

                    {/* Vínculo Direto com o Track */}
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-primary uppercase text-[11px]">
                          <Truck className="w-3.5 h-3.5" /> Rastreio Vinculado ao Pedido
                        </div>
                        {selected.tracking?.tracking_code ? (
                          <div className="text-slate-700 font-medium">
                            Código: <strong className="font-mono">{selected.tracking.tracking_code}</strong>
                            {" • "}Transportadora: <strong>{selected.tracking.carrier?.name || "Jadlog"}</strong>
                            {selected.tracking.status?.label ? ` • Status: ${selected.tracking.status.label}` : ""}
                          </div>
                        ) : (
                          <div className="text-muted-foreground">
                            Ainda sem código gerado — clique em <strong>Gerenciar Track</strong> ou abra a central de Rastreamento.
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {selected.tracking?.tracking_code && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] gap-1"
                            onClick={() =>
                              window.open(
                                `/rastreio?q=${encodeURIComponent(selected.tracking!.tracking_code)}`,
                                "_blank"
                              )
                            }
                          >
                            Ver Página Pública <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 text-[11px]"
                          onClick={() => nav(routes.adminPath("/tracking-dashboard"))}
                        >
                          Central de Rastreio
                        </Button>
                      </div>
                    </div>

                    {/* Resumo Financeiro */}
                    <div className="rounded-xl border border-border p-3.5 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-semibold">{formatCurrency(Number(selected.subtotal || 0))}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Frete</span>
                        <span className="font-semibold">{formatCurrency(Number(selected.shipping || 0))}</span>
                      </div>
                      {Number(selected.discount ?? 0) > 0 && (
                        <div className="flex items-center justify-between text-emerald-700">
                          <span>Desconto</span>
                          <span className="font-semibold">- {formatCurrency(Number(selected.discount))}</span>
                        </div>
                      )}
                      <div className="border-t border-border pt-1.5 flex items-center justify-between text-sm">
                        <span className="font-bold">Valor Total</span>
                        <span className="font-black text-primary">{formatCurrency(Number(selected.total || 0))}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Checkout: {selected.checkout_mode || "direto"}
                        {selected.payment_method ? ` • Pagamento: ${selected.payment_method}` : ""}
                      </div>
                    </div>

                    {/* Alterar Status */}
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_OPTIONS.map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          className="h-7 text-xs capitalize"
                          variant={selected.status === s ? "default" : "outline"}
                          onClick={() => void updateStatus(s)}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>

                    {/* Itens do Pedido */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-700">
                        <Package className="w-3.5 h-3.5 text-primary" /> Produtos do Pedido
                      </div>
                      {loadingItems ? (
                        <div className="text-xs text-muted-foreground">Carregando itens...</div>
                      ) : items.length === 0 ? (
                        <div className="text-xs text-muted-foreground">Nenhum item vinculado na tabela de itens.</div>
                      ) : (
                        <div className="space-y-1.5">
                          {items.map((it) => (
                            <div
                              key={it.id}
                              className="rounded-xl border border-border p-2.5 text-xs flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="font-semibold truncate">{it.name_snapshot}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  Qtd: {it.quantity} {it.unit_snapshot ?? "un"} • {formatCurrency(Number(it.price_snapshot || 0))}/{it.unit_snapshot ?? "un"}
                                </div>
                              </div>
                              <div className="font-black tabular-nums shrink-0">
                                {formatCurrency(Number(it.line_total || 0))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba de Dados Digitados no Checkout em Tempo Real */}
        <TabsContent value="collections" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-w-0">
            <Card className="lg:col-span-2 rounded-2xl min-w-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sessões de Coleta (Checkout)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredCollections.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-8 text-center">
                    Assim que um cliente digitar nome, CPF, telefone ou endereço no checkout da loja, os dados aparecem automaticamente aqui.
                  </div>
                ) : (
                  filteredCollections.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCollection(c)}
                      className={`w-full text-left rounded-xl border p-3 transition space-y-1 ${
                        selectedCollection?.id === c.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold truncate">{c.nome || "Visitante em preenchimento"}</span>
                        <span className="font-black tabular-nums">{formatCurrency(Number(c.total || 0))}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {c.telefone || c.email || c.cpf || "Sem contato"} • {new Date(c.updated_at).toLocaleString("pt-BR")}
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 rounded-2xl min-w-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Dados Digitados pelo Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {!selectedCollection ? (
                  <div className="text-muted-foreground py-8 text-center">
                    Selecione uma coleta na lista para ver todos os campos preenchidos pelo cliente.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-border p-3 space-y-1">
                        <div><span className="text-muted-foreground">Nome:</span> <strong>{selectedCollection.nome || "—"}</strong></div>
                        <div><span className="text-muted-foreground">CPF/CNPJ:</span> <strong>{selectedCollection.cpf || "—"}</strong></div>
                        <div><span className="text-muted-foreground">Telefone:</span> <strong>{selectedCollection.telefone || "—"}</strong></div>
                        <div><span className="text-muted-foreground">E-mail:</span> <strong>{selectedCollection.email || "—"}</strong></div>
                        <div><span className="text-muted-foreground">Pagamento:</span> <strong>{selectedCollection.payment_method || selectedCollection.route_type || "—"}</strong></div>
                      </div>
                      <div className="rounded-xl border border-border p-3 space-y-1">
                        <div><span className="text-muted-foreground">CEP:</span> <strong>{selectedCollection.cep || "—"}</strong></div>
                        <div><span className="text-muted-foreground">Rua:</span> <strong>{selectedCollection.endereco || "—"}</strong></div>
                        <div><span className="text-muted-foreground">Número / Compl.:</span> <strong>{selectedCollection.numero || "—"} {selectedCollection.complemento || ""}</strong></div>
                        <div><span className="text-muted-foreground">Obs.:</span> <strong>{selectedCollection.observacoes || "—"}</strong></div>
                      </div>
                    </div>
                    {Array.isArray(selectedCollection.cart_items) && selectedCollection.cart_items.length > 0 && (
                      <div className="rounded-xl border border-border p-3 space-y-1.5">
                        <div className="font-bold uppercase text-[11px]">Carrinho Capturado</div>
                        {selectedCollection.cart_items.map((ci, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span>{ci.name} (x{ci.quantity})</span>
                            <strong>{formatCurrency(Number(ci.line_subtotal || 0))}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {selected && (
        <Dialog open={trackingOpen} onOpenChange={setTrackingOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gerenciar Rastreamento - Pedido #{selected.id.slice(0, 8)}</DialogTitle>
            </DialogHeader>
            <OrderTrackingDialog
              order={selected}
              onClose={() => setTrackingOpen(false)}
              onUpdate={load}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
