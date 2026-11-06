import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/contexts/StoreContext";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit2, Package, Truck, CheckCircle2, AlertCircle, Clock, MapPin, Globe, ExternalLink, Trash2, Eye, Smartphone, Monitor } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OrderTrackingDialog } from "../components/OrderTrackingDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import PublicTrackingSearch from "@/pages/store/PublicTrackingSearch";
import { ChevronLeft, ChevronRight, Gauge, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CarrierBrandLogo, OFFICIAL_CARRIERS, resolveOfficialCarrier } from "@/components/store/tracking/CarrierBrandLogo";
import { TrackingCustomerCard } from "@/components/store/tracking/TrackingCustomerCard";

interface Carrier {
  id: string;
  name: string;
  slug: string;
  website: string;
  tracking_url_template: string;
  logo_url?: string;
  active: boolean;
}

interface TrackingRecord {
  id: string;
  tracking_code: string;
  order_id: string;
  created_at: string;
  estimated_delivery_at: string;
  status: {
    label: string;
    color: string;
  };
  carrier: {
    name: string;
  };
  order: {
    customer_name: string;
    customer_phone: string;
  };
}

export default function AdminDashboardTracking() {
  const location = useLocation();
  const nav = useNavigate();
  const { activeStoreId } = useStore();
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState<TrackingRecord[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Carrier Dialog
  const [carrierDialogOpen, setCarrierDialogOpen] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewStep, setPreviewStep] = useState(0);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewCarrierSlug, setPreviewCarrierSlug] = useState<string>("jadlog");
  const [previewProgress, setPreviewProgress] = useState<number>(50);
  const [previewStatusLabel, setPreviewStatusLabel] = useState<string>("COLETADO");
  const [previewTrackingCode, setPreviewTrackingCode] = useState<string>("RT74307932BR");
  const [previewOrderId, setPreviewOrderId] = useState<string>("83b0dd1b");
  const [previewTotal, setPreviewTotal] = useState<string>("849.00");
  const [previewCustomer, setPreviewCustomer] = useState<string>("Gabriel Silva");
  const [previewAddress, setPreviewAddress] = useState<string>("Belo Horizonte / MG");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [matchingClients, setMatchingClients] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<"all" | "with_cpf" | "without_cpf">("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [generateForm, setGenerateForm] = useState({
    carrier_id: "",
    customer_name: "",
    customer_cpf: "",
    estimated_days: "7",
    tracking_code: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
  });
  const [carrierForm, setCarrierForm] = useState({
    name: "",
    website: "",
    tracking_url_template: "",
    logo_url: "",
  });

  const [stats, setStats] = useState({
    active: 0,
    delivered: 0,
    shipping: 0,
    waiting: 0,
    delayed: 0
  });

  const loadData = async () => {
    if (!activeStoreId) return;
    setLoading(true);
    try {
      // Seed default status if empty (done via RPC ideally, but checking count here)
      const { count } = await cloud.from("order_tracking_status").select("*", { count: 'exact', head: true }).eq("store_id", activeStoreId);
      if (count === 0) {
         await cloud.rpc('seed_order_tracking_status', { target_store_id: activeStoreId });
      }

      const [trackingRes, carriersRes] = await Promise.all([
        cloud
          .from("order_tracking_main")
          .select(`
            *,
            status:order_tracking_status!order_tracking_main_current_status_id_fkey(label, color),
            carrier:order_tracking_carriers(name),
            order:store_orders(id, customer_name, customer_phone, customer_cpf, store_id)
          `)
          .eq("store_id", activeStoreId)
          .order("created_at", { ascending: false }),
        cloud.from("order_tracking_carriers").select("*").eq("store_id", activeStoreId).order("name")
      ]);

      if (trackingRes.error) throw trackingRes.error;
      if (carriersRes.error) throw carriersRes.error;

      setTrackingData(trackingRes.data || []);
      setCarriers(carriersRes.data || []);

      // Calculate stats based on status
      const newStats = (trackingRes.data || []).reduce((acc: any, curr: any) => {
        const s = curr.status?.label?.toLowerCase() || "";
        if (s.includes("entregue")) acc.delivered++;
        else if (s.includes("transporte") || s.includes("entrega")) acc.shipping++;
        else if (s.includes("aguardando") || s.includes("separando")) acc.waiting++;
        else acc.active++;
        return acc;
      }, { active: 0, delivered: 0, shipping: 0, waiting: 0, delayed: 0 });
      
      setStats(newStats);
    } catch (error: any) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCarrier = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta transportadora?")) return;
    try {
      await cloud.from("order_tracking_carriers").delete().eq("id", id);
      toast({ title: "Sucesso", description: "Transportadora excluída." });
      loadData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleDuplicateCarrier = async (carrier: Carrier) => {
    try {
      const { id, ...rest } = carrier;
      const slug = `${carrier.slug}-copy-${Math.floor(Math.random() * 1000)}`;
      await cloud.from("order_tracking_carriers").insert({
        ...rest,
        name: `${carrier.name} (Cópia)`,
        slug
      });
      toast({ title: "Sucesso", description: "Transportadora duplicada." });
      loadData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleSaveCarrier = async () => {
    if (!activeStoreId) return;
    try {
      const slug = carrierForm.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
      const payload = {
        ...carrierForm,
        slug,
        store_id: activeStoreId,
        active: true
      };

      if (editingCarrier) {
        await cloud.from("order_tracking_carriers").update(payload).eq("id", editingCarrier.id);
      } else {
        await cloud.from("order_tracking_carriers").insert(payload);
      }

      toast({ title: "Sucesso", description: "Transportadora salva." });
      setCarrierDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const searchClients = async (query: string, currentFilter?: string) => {
    setClientSearch(query);
    const activeFilter = currentFilter || filterType;
    try {
      let queryBuilder = cloud.from("store_customer_contacts").select("*");

      if (query) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query}%,document.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`);
      }

      if (activeFilter === "with_cpf") {
        queryBuilder = queryBuilder.not("document", "is", null).neq("document", "");
      } else if (activeFilter === "without_cpf") {
        queryBuilder = queryBuilder.or("document.is.null,document.eq.");
      }

      const { data, error } = await queryBuilder
        .order("name", { ascending: true })
        .limit(50);

      if (error) {
        console.error("Erro na consulta de contatos:", error);
        toast({ title: "Erro na busca", description: error.message, variant: "destructive" });
        return;
      }

      setMatchingClients(data || []);
    } catch (err) {
      console.error("Erro ao buscar leads/clientes:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeStoreId]);

  useEffect(() => {
    // Verificar se veio do painel de orçamentos (location.state)
    if (location.state && location.state.customer_name) {
      console.log("Recebido estado de navegação:", location.state);
      setGenerateDialogOpen(true);
      const name = location.state.customer_name;
      const cpf = location.state.customer_cpf || "";
      
      setGenerateForm(prev => ({
        ...prev,
        customer_name: name,
        customer_cpf: cpf
      }));
      setVinculoPedido(location.state.vinculo || "independente");
      setClientSearch(name);

      // Se viemos de um orçamento, vamos tentar carregar os orçamentos do cliente imediatamente
      if (location.state.source === 'quotation') {
        const cpfNumbers = cpf.replace(/\D/g, "");
        Promise.all([
          cloud.from("store_orders").select("*").eq("customer_cpf", cpfNumbers).eq("store_id", activeStoreId),
          cloud.from("fortlev_quotations").select("*").filter("customer_json->>document", "eq", cpfNumbers),
          cloud.from("construction_quotations").select("*").filter("customer_json->>document", "eq", cpfNumbers)
        ]).then(([orders, fortlev, construction]) => {
          setSelectedClientOrders(orders.data || []);
          setSelectedClientQuotations([...(fortlev.data || []), ...(construction.data || [])]);
        }).catch(e => console.error("Erro ao carregar detalhes do cliente vindo de orçamento", e));
      }
      
      // Limpar o estado para não reabrir ao atualizar
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const [vinculoPedido, setVinculoPedido] = useState<"existente" | "independente">("existente");
  const [selectedClientOrders, setSelectedClientOrders] = useState<any[]>([]);
  const [selectedClientQuotations, setSelectedClientQuotations] = useState<any[]>([]);

  const handleGenerateTracking = async () => {
    if (!activeStoreId) return;
    setLoading(true);
    try {
      const code = generateForm.tracking_code || `RT${Math.floor(Math.random() * 90000000 + 10000000)}BR`;
      
      let orderId = selectedOrderId;

      // Se não tiver selecionado um pedido existente, criar um ou buscar o ID
      if (!orderId) {
        const { data: existingOrder } = await cloud.from("store_orders")
          .select("id")
          .eq("customer_cpf", generateForm.customer_cpf.replace(/\D/g, ""))
          .eq("store_id", activeStoreId)
          .limit(1)
          .maybeSingle();

        orderId = existingOrder?.id;

        if (!orderId) {
          const { data: newOrder, error: orderError } = await cloud.from("store_orders").insert({
            store_id: activeStoreId,
            customer_name: generateForm.customer_name,
            customer_cpf: generateForm.customer_cpf.replace(/\D/g, ""),
            total: 0,
            subtotal: 0,
            shipping: 0,
            checkout_mode: 'whatsapp',
            status: "aguardando",
          }).select().single();

          if (orderError) throw orderError;
          orderId = newOrder.id;
        }
      }

      // 2. Create the tracking record
      const { data: statuses } = await cloud.from("order_tracking_status")
        .select("id, label")
        .eq("store_id", activeStoreId);
      
      const initialStatus = statuses?.find(s => s.label.includes("Coletado") || s.label.includes("Transporte")) || statuses?.[0];
      const initialStatusId = initialStatus?.id;
      const initialStatusLabel = initialStatus?.label || "Objeto postado";

      const { data: tracking, error: trackingError } = await cloud.from("order_tracking_main").insert({
        store_id: activeStoreId,
        order_id: orderId,
        carrier_id: generateForm.carrier_id,
        tracking_code: code.toUpperCase().trim(),
        current_status_id: initialStatusId,
        posted_at: new Date(generateForm.start_date + "T10:00:00").toISOString(),
        estimated_delivery_at: new Date(new Date(generateForm.start_date + "T10:00:00").getTime() + (parseInt(generateForm.estimated_days) * 86400000)).toISOString()
      }).select().single();

      if (trackingError) throw trackingError;

      // 3. Add initial timeline event
      await cloud.from("order_tracking_timeline").insert({
        tracking_id: tracking.id,
        status_id: initialStatusId,
        title: initialStatusLabel,
        description: "O objeto foi entregue à transportadora e está em processamento.",
        location_city: "Centro de Distribuição",
        event_at: new Date(generateForm.start_date + "T10:00:00").toISOString()
      });

      toast({ title: "Sucesso", description: `Rastreio ${code} gerado!` });
      setGenerateDialogOpen(false);
      setGenerateForm({ 
        customer_name: "", 
        customer_cpf: "", 
        carrier_id: "", 
        estimated_days: "7", 
        tracking_code: "",
        start_date: format(new Date(), "yyyy-MM-dd")
      });
      setSelectedOrderId("");
      loadData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredTracking = trackingData.filter(item => 

    item.tracking_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.order?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: any) => {
    if (!status) return <Badge variant="outline">Sem Status</Badge>;
    return (
      <Badge style={{ backgroundColor: status.color, color: 'white' }}>
        {status.label}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orquestrador de Logística Profissional</h1>
          <p className="text-sm text-muted-foreground">Sistema enterprise para ajuste de fretes, gestão de etapas e controle total da jornada do cliente.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Ativos</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-2xl font-bold">{stats.active + stats.shipping + stats.waiting}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-xs font-medium text-green-600 uppercase">Entregues</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-2xl font-bold text-green-700">{stats.delivered}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-xs font-medium text-blue-600 uppercase">Em Transporte</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-2xl font-bold text-blue-700">{stats.shipping}</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-xs font-medium text-orange-600 uppercase">Aguardando</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-2xl font-bold text-orange-700">{stats.waiting}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-xs font-medium text-red-600 uppercase">Atrasados</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-2xl font-bold text-red-700">{stats.delayed}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tracking" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="tracking">Rastreios Ativos</TabsTrigger>
          <TabsTrigger value="carriers">Transportadoras</TabsTrigger>
          <TabsTrigger value="preview">Preview & Fluxo</TabsTrigger>
        </TabsList>

        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <CardTitle className="text-lg">Gestão de Entregas</CardTitle>
                  <Button size="sm" onClick={async () => {
                    setGenerateForm({
                      carrier_id: carriers[0]?.id || "",
                      customer_name: "",
                      customer_cpf: "",
                      estimated_days: "7",
                      tracking_code: "",
                      start_date: format(new Date(), "yyyy-MM-dd")
                    });
                    setClientSearch("");
                    setMatchingClients([]);
                    setSelectedClientOrders([]);
                    setSelectedClientQuotations([]);
                    setVinculoPedido("existente");
                    
                    // Forçar carregamento da lista inicial em ordem alfabética
                    await searchClients("", "all");
                    setFilterType("all");
                    
                    setGenerateDialogOpen(true);
                  }}>
                    <Plus className="w-4 h-4 mr-2" /> Gerar Rastreio Manual
                  </Button>
                </div>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar código ou cliente..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-40 flex items-center justify-center text-muted-foreground">Carregando dados...</div>
              ) : filteredTracking.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-muted-foreground">Nenhum rastreio encontrado.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Transportadora</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Previsão</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTracking.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono font-medium">{item.tracking_code}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">#{item.order_id?.slice(0, 8) || "N/A"}</span>
                            {item.order_id && (
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="h-auto p-0 text-xs justify-start"
                                onClick={() => nav(`/admin/pedidos?id=${item.order_id}`)}
                              >
                                Ver Detalhes
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{item.order?.customer_name || "N/A"}</div>
                            <div className="text-xs text-muted-foreground">{item.order?.customer_phone || ""}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Truck className="w-3 h-3 text-muted-foreground" />
                            {item.carrier?.name || "Manual"}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-sm">
                          {item.estimated_delivery_at ? format(new Date(item.estimated_delivery_at), "dd/MM/yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSelectedOrder(item.order || { id: item.order_id });
                              setTrackingDialogOpen(true);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="carriers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Transportadoras Parceiras</CardTitle>
                  <CardDescription>Gerencie as transportadoras cadastradas no sistema.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={async () => {
                    try {
                      for (const official of OFFICIAL_CARRIERS) {
                        const existing = carriers.find(c => c.slug === official.slug);
                        const payload = {
                          name: official.name,
                          slug: official.slug,
                          website: official.website,
                          tracking_url_template: official.trackingUrlTemplate,
                          logo_url: official.svgDataUri,
                          store_id: activeStoreId,
                          active: true
                        };
                        if (existing) {
                          await cloud.from("order_tracking_carriers").update(payload).eq("id", existing.id);
                        } else {
                          await cloud.from("order_tracking_carriers").insert(payload);
                        }
                      }
                      toast({ title: "Sucesso", description: "12 transportadoras com logos oficiais configuradas." });
                      loadData();
                    } catch (err: any) {
                      toast({ title: "Erro ao gerar padrão", description: err.message, variant: "destructive" });
                    }
                  }}>
                    <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
                    Gerar Transportadoras Oficiais (Logos HD)
                  </Button>
                  <Button onClick={() => {
                    setEditingCarrier(null);
                    setCarrierForm({ name: "", website: "", tracking_url_template: "", logo_url: "" });
                    setCarrierDialogOpen(true);
                  }}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Template de Rastreio</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carriers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium flex items-center gap-3">
                        <CarrierBrandLogo name={c.name} logoUrl={c.logo_url} size="sm" />
                        <div>
                          <div className="font-bold">{c.name}</div>
                          {resolveOfficialCarrier(c.name) && (
                            <div className="text-[10px] text-muted-foreground">{resolveOfficialCarrier(c.name)?.modality}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.website ? (
                          <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                            {c.website} <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs font-mono">{c.tracking_url_template || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={c.active ? "default" : "secondary"}>
                          {c.active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleDuplicateCarrier(c)} title="Duplicar">
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingCarrier(c);
                            setCarrierForm({ name: c.name, website: c.website || "", tracking_url_template: c.tracking_url_template || "", logo_url: c.logo_url || "" });
                            setCarrierDialogOpen(true);
                          }} title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteCarrier(c.id)} title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {carriers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma transportadora cadastrada.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {/* Barra de Controles do Simulador */}
          <Card className="rounded-3xl border border-slate-200/90 shadow-md bg-white">
            <CardHeader className="p-5 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black uppercase tracking-tight">
                      Simulador e Preview de Telas em Tempo Real
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Altere a transportadora oficial, a % de envio e o status para ver a tela do cliente.
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <Button 
                      variant={previewMode === "desktop" ? "default" : "ghost"} 
                      size="sm" 
                      onClick={() => setPreviewMode("desktop")}
                      className="gap-1.5 h-8 text-xs font-bold rounded-lg"
                    >
                      <Monitor className="w-3.5 h-3.5" /> Desktop
                    </Button>
                    <Button 
                      variant={previewMode === "mobile" ? "default" : "ghost"} 
                      size="sm" 
                      onClick={() => setPreviewMode("mobile")}
                      className="gap-1.5 h-8 text-xs font-bold rounded-lg"
                    >
                      <Smartphone className="w-3.5 h-3.5" /> Mobile (iPhone)
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-8 text-xs font-black uppercase rounded-xl border-primary/20 text-primary"
                  >
                    <a href={`/rastreio?q=${previewTrackingCode}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-3.5 h-3.5 mr-1" /> Abrir no /rastreio
                    </a>
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-4">
              {/* Controles: Transportadora Oficial, Status, % de Envio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                {/* 1. Transportadora Oficial */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Transportadora Oficial
                  </Label>
                  <div className="flex items-center gap-2">
                    <select
                      className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={previewCarrierSlug}
                      onChange={(e) => setPreviewCarrierSlug(e.target.value)}
                    >
                      {OFFICIAL_CARRIERS.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name} ({c.modality})
                        </option>
                      ))}
                    </select>
                    <CarrierBrandLogo name={previewCarrierSlug} size="sm" />
                  </div>
                </div>

                {/* 2. Status e Etapa */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Etapa / Status Rápido
                  </Label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={previewStatusLabel}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPreviewStatusLabel(val);
                      if (val === "COLETADO") setPreviewProgress(50);
                      else if (val === "SAIU PARA ENTREGA") setPreviewProgress(85);
                      else if (val === "ENTREGUE") setPreviewProgress(100);
                      else if (val === "EM SEPARAÇÃO") setPreviewProgress(15);
                      else setPreviewProgress(65);
                    }}
                  >
                    <option value="COLETADO">COLETADO (50% de envio)</option>
                    <option value="EM TRANSPORTE">EM TRANSPORTE (65% de envio)</option>
                    <option value="SAIU PARA ENTREGA">SAIU PARA ENTREGA (85% de envio)</option>
                    <option value="ENTREGUE">ENTREGUE (100% de envio)</option>
                    <option value="EM SEPARAÇÃO">EM SEPARAÇÃO (15% de envio)</option>
                  </select>
                </div>

                {/* 3. Slider de % de Envio */}
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between text-xs font-black uppercase text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-primary" /> % de Envio em Tempo Real:
                    </span>
                    <span className="font-mono text-primary font-black text-sm bg-primary/10 px-2.5 py-0.5 rounded-full">
                      {previewProgress}% Concluído
                    </span>
                  </div>
                  <Slider
                    value={[previewProgress]}
                    onValueChange={(val) => setPreviewProgress(val[0])}
                    min={5}
                    max={100}
                    step={1}
                    className="py-1 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                    <span>Loja (10%)</span>
                    <span>CD (35%)</span>
                    <span>Trânsito (65%)</span>
                    <span>Entrega (85%)</span>
                    <span>Entregue (100%)</span>
                  </div>
                </div>
              </div>

              {/* Botões Rápidos de Fluxo */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">Visualizar Fluxo:</span>
                  <Button
                    size="sm"
                    variant={previewStep === 0 ? "default" : "outline"}
                    className="h-7 text-[11px] rounded-lg font-bold"
                    onClick={() => setPreviewStep(0)}
                  >
                    1. Tela de Busca
                  </Button>
                  <Button
                    size="sm"
                    variant={previewStep === 1 ? "default" : "outline"}
                    className="h-7 text-[11px] rounded-lg font-bold"
                    onClick={() => {
                      setPreviewStep(1);
                      setPreviewStatusLabel("COLETADO");
                      setPreviewProgress(50);
                    }}
                  >
                    2. Coletado / Em Trânsito (50%)
                  </Button>
                  <Button
                    size="sm"
                    variant={previewStep === 2 ? "default" : "outline"}
                    className="h-7 text-[11px] rounded-lg font-bold"
                    onClick={() => {
                      setPreviewStep(2);
                      setPreviewStatusLabel("ENTREGUE");
                      setPreviewProgress(100);
                    }}
                  >
                    3. Entregue (100%)
                  </Button>
                </div>

                <div className="text-[11px] text-slate-400 font-bold">
                  Código: <span className="font-mono text-slate-700">{previewTrackingCode}</span> • Pedido #{previewOrderId}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Área de Visualização Fiel da Tela */}
          <div className="flex justify-center bg-slate-100/70 rounded-3xl p-3 md:p-8 min-h-[650px] border-2 border-dashed border-slate-200">
            {previewMode === "mobile" ? (
              <div className="relative mx-auto border-[10px] border-slate-900 rounded-[3.2rem] h-[850px] w-[390px] shadow-2xl bg-white overflow-hidden ring-1 ring-slate-900/10">
                {/* Dynamic Island / Notch */}
                <div className="absolute top-0 inset-x-0 h-7 bg-slate-900 flex items-center justify-center z-50">
                  <div className="w-24 h-4 bg-black rounded-full flex items-center justify-end pr-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-900/80 border border-slate-800" />
                  </div>
                </div>

                <ScrollArea className="h-full w-full pt-8 pb-6">
                  <div className="p-3 admin-preview-mode">
                    {previewStep === 0 ? (
                      <PublicTrackingSearch />
                    ) : (
                      <TrackingCustomerCard
                        trackingCode={previewTrackingCode}
                        orderId={previewOrderId}
                        statusLabel={previewStatusLabel}
                        progress={previewProgress}
                        estimatedDeliveryAt="2026-11-10T10:00:00.000Z"
                        carrier={{
                          name: resolveOfficialCarrier(previewCarrierSlug)?.name || "Jadlog",
                          logo_url: resolveOfficialCarrier(previewCarrierSlug)?.svgDataUri,
                          website: resolveOfficialCarrier(previewCarrierSlug)?.website,
                          tracking_url_template: resolveOfficialCarrier(previewCarrierSlug)?.trackingUrlTemplate,
                        }}
                        timeline={[
                          {
                            title: previewStatusLabel,
                            description:
                              previewProgress >= 100
                                ? "O objeto foi entregue com sucesso no endereço cadastrado."
                                : "O objeto foi entregue à transportadora e está em processamento.",
                            location_city: "Centro de Distribuição",
                            location_state: "SP",
                            event_at: new Date().toISOString(),
                          },
                          {
                            title: "PEDIDO RECEBIDO",
                            description: "Nota fiscal emitida e volumes liberados para a transportadora.",
                            location_city: "Unidade Central",
                            event_at: new Date(Date.now() - 3600000 * 24).toISOString(),
                          },
                        ]}
                        items={[
                          { product_name: "Caixa d'Água 1000L Fortlev", quantity: 1, line_total: 279.9 },
                          { product_name: "Vara de Cano Esgoto 100mm (6m)", quantity: 2, line_total: 105.2 },
                        ]}
                        orderTotal={parseFloat(previewTotal) || 849.0}
                        customerName={previewCustomer}
                        address={previewAddress}
                        compact={true}
                      />
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="w-full max-w-5xl bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden flex flex-col min-h-[650px]">
                {/* Barra do Navegador Desktop */}
                <div className="h-11 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="mx-auto w-1/2 h-7 bg-white border border-slate-200 rounded-lg text-xs flex items-center px-3 text-slate-500 font-mono shadow-inner">
                    https://fortlev-quote-master.local/rastreio?q={previewTrackingCode}
                  </div>
                </div>

                <ScrollArea className="flex-1 p-6 md:p-8">
                  <div className="max-w-4xl mx-auto admin-preview-mode">
                    {previewStep === 0 ? (
                      <PublicTrackingSearch />
                    ) : (
                      <TrackingCustomerCard
                        trackingCode={previewTrackingCode}
                        orderId={previewOrderId}
                        statusLabel={previewStatusLabel}
                        progress={previewProgress}
                        estimatedDeliveryAt="2026-11-10T10:00:00.000Z"
                        carrier={{
                          name: resolveOfficialCarrier(previewCarrierSlug)?.name || "Jadlog",
                          logo_url: resolveOfficialCarrier(previewCarrierSlug)?.svgDataUri,
                          website: resolveOfficialCarrier(previewCarrierSlug)?.website,
                          tracking_url_template: resolveOfficialCarrier(previewCarrierSlug)?.trackingUrlTemplate,
                        }}
                        timeline={[
                          {
                            title: previewStatusLabel,
                            description:
                              previewProgress >= 100
                                ? "O objeto foi entregue com sucesso ao destinatário no endereço cadastrado."
                                : "O objeto foi entregue à transportadora e está em processamento.",
                            location_city: "Centro de Distribuição",
                            location_state: "SP",
                            event_at: new Date().toISOString(),
                          },
                          {
                            title: "PEDIDO CONFIRMADO",
                            description: "Nota fiscal emitida e separação física finalizada.",
                            location_city: "Unidade Central",
                            event_at: new Date(Date.now() - 3600000 * 24).toISOString(),
                          },
                        ]}
                        items={[
                          { product_name: "Caixa d'Água 1000L Fortlev", quantity: 1, line_total: 279.9 },
                          { product_name: "Vara de Cano Esgoto 100mm (6m)", quantity: 2, line_total: 105.2 },
                        ]}
                        orderTotal={parseFloat(previewTotal) || 849.0}
                        customerName={previewCustomer}
                        address={previewAddress}
                        compact={false}
                      />
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={carrierDialogOpen} onOpenChange={setCarrierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCarrier ? "Editar Transportadora" : "Nova Transportadora"}</DialogTitle>
            <DialogDescription>Preencha os dados da transportadora parceira.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Transportadora</Label>
                <Input 
                  value={carrierForm.name} 
                  onChange={(e) => setCarrierForm({ ...carrierForm, name: e.target.value })}
                  placeholder="Ex: Correios, Loggi..."
                />
              </div>
              <div className="space-y-2">
                <Label>Logo URL (PNG sem fundo)</Label>
                <div className="space-y-1">
                  <Input 
                    value={carrierForm.logo_url} 
                    onChange={(e) => setCarrierForm({ ...carrierForm, logo_url: e.target.value })}
                    placeholder="https://exemplo.com/logo.png"
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    pode ser URL caregar e ver arquivo ou selecionar enviar arquivo do computador também
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Site Oficial (URL)</Label>
              <Input 
                value={carrierForm.website} 
                onChange={(e) => setCarrierForm({ ...carrierForm, website: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Template da URL de Rastreio</Label>
              <Input 
                value={carrierForm.tracking_url_template} 
                onChange={(e) => setCarrierForm({ ...carrierForm, tracking_url_template: e.target.value })}
                placeholder="https://.../{code}"
              />
              <p className="text-[10px] text-muted-foreground">Use {"{code}"} para onde o código de rastreio será inserido.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCarrierDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCarrier}>Salvar Transportadora</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Novo Rastreio</DialogTitle>
            <DialogDescription>Crie um registro de rastreio manualmente para um cliente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-3 relative">
              <div className="flex items-center justify-between">
                <Label>Pesquisar Cliente</Label>
                <div className="flex bg-muted p-0.5 rounded-md text-[10px]">
                  <button 
                    onClick={() => { setFilterType("all"); searchClients(clientSearch, "all"); }}
                    className={`px-2 py-1 rounded ${filterType === 'all' ? 'bg-white shadow-sm font-bold' : 'text-muted-foreground'}`}
                  >
                    Todos
                  </button>
                  <button 
                    onClick={() => { setFilterType("with_cpf"); searchClients(clientSearch, "with_cpf"); }}
                    className={`px-2 py-1 rounded flex items-center gap-1 ${filterType === 'with_cpf' ? 'bg-white shadow-sm font-bold' : 'text-muted-foreground'}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Com CPF
                  </button>
                  <button 
                    onClick={() => { setFilterType("without_cpf"); searchClients(clientSearch, "without_cpf"); }}
                    className={`px-2 py-1 rounded flex items-center gap-1 ${filterType === 'without_cpf' ? 'bg-white shadow-sm font-bold' : 'text-muted-foreground'}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Sem CPF
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  value={clientSearch}
                  onFocus={() => {
                    if (clientSearch.length === 0) {
                      searchClients("", filterType);
                    }
                  }}
                  onChange={(e) => searchClients(e.target.value)}
                  placeholder="Nome, CPF, Tel ou Email..."
                  className="pl-9"
                />
              </div>
              
              {matchingClients.length > 0 && (
                <Card className="absolute z-50 w-full mt-1 shadow-xl border-primary/20 animate-in fade-in zoom-in-95 duration-200">
                  <ScrollArea className="h-[200px]">
                    <div className="p-1">
                      {matchingClients.map((client, idx) => (
                        <button
                          key={idx}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-primary/10 transition-colors flex flex-col gap-0.5"
                          onClick={async () => {
                            const cpfNumbers = client.document?.replace(/\D/g, "") || "";
                            setGenerateForm({
                              ...generateForm,
                              customer_name: client.name,
                              customer_cpf: client.document || ""
                            });
                            setClientSearch(client.name);
                            setMatchingClients([]);

                            try {
                              const [orders, fortlev, construction] = await Promise.all([
                                cloud.from("store_orders").select("*").eq("customer_cpf", cpfNumbers).eq("store_id", activeStoreId),
                                cloud.from("fortlev_quotations").select("*").filter("customer_json->>document", "eq", cpfNumbers),
                                cloud.from("construction_quotations").select("*").filter("customer_json->>document", "eq", cpfNumbers)
                              ]);
                              setSelectedClientOrders(orders.data || []);
                              setSelectedClientQuotations([...(fortlev.data || []), ...(construction.data || [])]);
                              if (orders.data && orders.data.length > 0) setVinculoPedido("existente");
                            } catch (e) {
                              console.error("Erro ao carregar detalhes do cliente", e);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm font-bold text-primary">{client.name}</span>
                            <div className={`w-2 h-2 rounded-full ${client.document ? 'bg-green-500' : 'bg-red-500'}`} />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {client.document ? `CPF: ${client.document}` : client.phone || 'Sem contato'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Cliente (Confirmado)</Label>
                <Input 
                  value={generateForm.customer_name} 
                  onChange={(e) => setGenerateForm({ ...generateForm, customer_name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label>CPF (Confirmado)</Label>
                <Input 
                  value={generateForm.customer_cpf} 
                  onChange={(e) => setGenerateForm({ ...generateForm, customer_cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
            {selectedClientOrders.length > 0 && (
              <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Label className="text-xs font-bold uppercase text-slate-500">Pedidos encontrados</Label>
                <div className="space-y-1">
                  {selectedClientOrders.map(order => (
                    <div key={order.id} className="text-[11px] flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                      <span className="font-mono font-bold">#{order.id.slice(0, 8)}</span>
                      <span className="font-bold text-primary">R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span className="text-slate-400">{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedClientQuotations.length > 0 && (
              <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Label className="text-xs font-bold uppercase text-slate-500">Orçamentos encontrados</Label>
                <div className="space-y-1">
                  {selectedClientQuotations.map(q => (
                    <div key={q.id} className="text-[11px] flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                      <span className="font-mono font-bold">{q.number || q.id.slice(0, 8)}</span>
                      <Badge variant="outline" className="text-[9px]">{q.status || 'Pendente'}</Badge>
                      <span className="font-bold text-slate-600">R$ {q.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2 border-t">
              <Label>Como deseja gerar o rastreio?</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="vinculo" 
                    checked={vinculoPedido === "existente"} 
                    onChange={() => setVinculoPedido("existente")} 
                  />
                  <span className="text-sm">Vincular ao Pedido</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="vinculo" 
                    checked={vinculoPedido === "independente"} 
                    onChange={() => setVinculoPedido("independente")} 
                  />
                  <span className="text-sm">Criar Independente</span>
                </label>
              </div>
            </div>

            {vinculoPedido === "existente" && selectedClientOrders.length > 0 && (
               <div className="space-y-2">
                 <Label>Selecionar Pedido</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedOrderId}
                    onChange={(e) => {
                      setSelectedOrderId(e.target.value);
                    }}
                  >
                    <option value="">Selecione um pedido...</option>
                    {selectedClientOrders.map(o => (
                      <option key={o.id} value={o.id}>Pedido #{o.id.slice(0, 8)} - R$ {o.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</option>
                    ))}
                  </select>
               </div>
             )}
            
            <div className="space-y-2">
              <Label>Transportadora</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={generateForm.carrier_id} 
                onChange={(e) => setGenerateForm({ ...generateForm, carrier_id: e.target.value })}
              >
                <option value="">Selecione...</option>
                {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input 
                  type="date"
                  value={generateForm.start_date} 
                  onChange={(e) => setGenerateForm({ ...generateForm, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo (Dias)</Label>
                <Input 
                  type="number"
                  value={generateForm.estimated_days} 
                  onChange={(e) => setGenerateForm({ ...generateForm, estimated_days: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Código (Opcional)</Label>
              <Input 
                value={generateForm.tracking_code} 
                onChange={(e) => setGenerateForm({ ...generateForm, tracking_code: e.target.value })}
                placeholder="Auto-gerar se vazio"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleGenerateTracking} disabled={!generateForm.customer_name || !generateForm.carrier_id}>Gerar Rastreio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedOrder && (
        <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gerenciar Rastreamento - Pedido #{selectedOrder.id.slice(0, 8)}</DialogTitle>
            </DialogHeader>
            <OrderTrackingDialog 
              order={selectedOrder} 
              onClose={() => setTrackingDialogOpen(false)} 
              onUpdate={loadData}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}