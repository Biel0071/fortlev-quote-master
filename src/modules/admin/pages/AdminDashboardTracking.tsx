import React, { useState, useEffect } from "react";
import { useStore } from "@/contexts/StoreContext";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit2, Package, Truck, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TrackingRecord {
  id: string;
  order_id: string;
  status: string;
  detail: string;
  created_at: string;
  order?: {
    customer_name: string;
    customer_phone: string;
  };
}

export default function AdminDashboardTracking() {
  const { activeStoreId } = useStore();
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState<TrackingRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
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
      const { data, error } = await cloud
        .from("store_order_tracking")
        .select(`
          *,
          order:store_orders(customer_name, customer_phone)
        `)
        .eq("store_id", activeStoreId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTrackingData(data || []);

      // Calculate stats based on status
      const newStats = (data || []).reduce((acc: any, curr: any) => {
        const s = curr.status.toLowerCase();
        if (s === "entregue") acc.delivered++;
        else if (s === "enviado" || s === "em transporte") acc.shipping++;
        else if (s === "aguardando" || s === "separando") acc.waiting++;
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

  const filteredData = trackingData.filter(item => 
    item.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.order?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "entregue") return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Entregue</Badge>;
    if (s === "enviado" || s === "em transporte") return <Badge className="bg-blue-500 hover:bg-blue-600"><Truck className="w-3 h-3 mr-1" /> Em transporte</Badge>;
    if (s === "aguardando" || s === "separando") return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Aguardando</Badge>;
    if (s === "atrasado") return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Atrasado</Badge>;
    return <Badge variant="outline"><Package className="w-3 h-3 mr-1" /> {status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Módulo de Rastreamento</h1>
          <p className="text-sm text-muted-foreground">Gerencie as etapas de entrega e atualize seus clientes.</p>
        </div>
        <Button className="w-fit">
          <Plus className="w-4 h-4 mr-2" /> Novo Rastreamento
        </Button>
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg">Histórico de Movimentações</CardTitle>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por pedido ou cliente..." 
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
          ) : filteredData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground">Nenhum registro encontrado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">#{item.order_id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{item.order?.customer_name || "N/A"}</div>
                        <div className="text-xs text-muted-foreground">{item.order?.customer_phone || ""}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{item.detail || "-"}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
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
    </div>
  );
}
