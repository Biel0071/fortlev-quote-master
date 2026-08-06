import React, { useState, useEffect } from "react";
import { useStore } from "@/contexts/StoreContext";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit2, Package, Truck, CheckCircle2, AlertCircle, Clock, MapPin, Globe, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OrderTrackingDialog } from "../components/OrderTrackingDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Carrier {
  id: string;
  name: string;
  slug: string;
  website: string;
  tracking_url_template: string;
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
  const [carrierForm, setCarrierForm] = useState({

    name: "",
    website: "",
    tracking_url_template: "",
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
            status:order_tracking_status(label, color),
            carrier:order_tracking_carriers(name),
            order:store_orders(customer_name, customer_phone)
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

  useEffect(() => {
    loadData();
  }, [activeStoreId]);

  const handleSaveCarrier = async () => {
    if (!activeStoreId) return;
    try {
      const slug = carrierForm.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
      const payload = {
        ...carrierForm,
        slug,
        store_id: activeStoreId,
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
          <h1 className="text-2xl font-bold tracking-tight">Centro de Operações de Rastreamento</h1>
          <p className="text-sm text-muted-foreground">Orquestração completa de logística e entregas.</p>
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
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="tracking">Rastreios Ativos</TabsTrigger>
          <TabsTrigger value="carriers">Transportadoras</TabsTrigger>
        </TabsList>

        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-lg">Gestão de Entregas</CardTitle>
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
                        <TableCell>#{item.order_id.slice(0, 8)}</TableCell>
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
                              setSelectedOrder({ id: item.order_id });
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
                <Button onClick={() => {
                  setEditingCarrier(null);
                  setCarrierForm({ name: "", website: "", tracking_url_template: "" });
                  setCarrierDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" /> Adicionar
                </Button>
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
                      <TableCell className="font-medium">{c.name}</TableCell>
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
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingCarrier(c);
                          setCarrierForm({ name: c.name, website: c.website || "", tracking_url_template: c.tracking_url_template || "" });
                          setCarrierDialogOpen(true);
                        }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
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
      </Tabs>

      <Dialog open={carrierDialogOpen} onOpenChange={setCarrierDialogOpen}>
        ...
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