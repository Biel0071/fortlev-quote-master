import React, { useState, useEffect } from "react";
import { cloud } from "@/lib/cloud";
import { useStore } from "@/contexts/StoreContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, MapPin, Truck, Calendar, CheckCircle2, Save } from "lucide-react";
import { format } from "date-fns";

interface OrderTrackingDialogProps {
  order: any;
  onClose: () => void;
  onUpdate: () => void;
}

export function OrderTrackingDialog({ order, onClose, onUpdate }: OrderTrackingDialogProps) {
  const { activeStoreId } = useStore();
  const [loading, setLoading] = useState(false);
  const [carriers, setCarriers] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [tracking, setTracking] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  
  const [form, setForm] = useState({
    tracking_code: "",
    carrier_id: "",
    estimated_delivery_at: "",
  });

  const [newEvent, setNewEvent] = useState({
    status_id: "",
    title: "",
    description: "",
    location_city: "",
    location_state: "",
  });

  const loadInitialData = async () => {
    if (!activeStoreId) return;
    setLoading(true);
    try {
      const [carriersRes, statusesRes, trackingRes] = await Promise.all([
        cloud.from("order_tracking_carriers").select("*").eq("store_id", activeStoreId).eq("active", true),
        cloud.from("order_tracking_status").select("*").eq("store_id", activeStoreId).order("order", { ascending: true }),
        cloud.from("order_tracking_main").select("*, order_tracking_timeline(*)").eq("order_id", order.id).maybeSingle()
      ]);

      setCarriers(carriersRes.data || []);
      setStatuses(statusesRes.data || []);
      
      if (trackingRes.data) {
        setTracking(trackingRes.data);
        setForm({
          tracking_code: trackingRes.data.tracking_code,
          carrier_id: trackingRes.data.carrier_id || "",
          estimated_delivery_at: trackingRes.data.estimated_delivery_at ? format(new Date(trackingRes.data.estimated_delivery_at), "yyyy-MM-dd") : "",
        });
        setTimeline(trackingRes.data.order_tracking_timeline || []);
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [order.id, activeStoreId]);

  const handleCreateOrUpdateTracking = async () => {
    if (!activeStoreId) return;
    setLoading(true);
    try {
      const payload = {
        store_id: activeStoreId,
        order_id: order.id,
        tracking_code: form.tracking_code,
        carrier_id: form.carrier_id || null,
        estimated_delivery_at: form.estimated_delivery_at || null,
      };

      let res;
      if (tracking) {
        res = await cloud.from("order_tracking_main").update(payload).eq("id", tracking.id);
      } else {
        res = await cloud.from("order_tracking_main").insert(payload).select().single();
      }

      if (res.error) {
        // HINT: Check for RLS or missing fields
        console.error("Error saving tracking:", res.error);
        throw res.error;
      }

      // If it's a new tracking, check if we need to add a default first event
      if (!tracking && res.data) {
        const { data: statuses } = await cloud.from("order_tracking_status")
          .select("id, label")
          .eq("store_id", activeStoreId)
          .order("order", { ascending: true });
        
        if (statuses && statuses.length > 0) {
          await cloud.from("order_tracking_timeline").insert({
            tracking_id: res.data.id,
            status_id: statuses[0].id,
            title: statuses[0].label,
            description: "Objeto postado e em processamento.",
            event_at: new Date().toISOString()
          });
          
          await cloud.from("order_tracking_main").update({
            current_status_id: statuses[0].id
          }).eq("id", res.data.id);
        }
      }

      if (res.error) throw res.error;
      toast({ title: "Sucesso", description: "Dados de rastreio salvos." });
      loadInitialData();
      onUpdate();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!tracking) return;
    setLoading(true);
    try {
      const selectedStatus = statuses.find(s => s.id === newEvent.status_id);
      const res = await cloud.from("order_tracking_timeline").insert({
        tracking_id: tracking.id,
        status_id: newEvent.status_id,
        title: newEvent.title || selectedStatus?.label || "Atualização",
        description: newEvent.description,
        location_city: newEvent.location_city,
        location_state: newEvent.location_state,
        event_at: new Date().toISOString()
      });

      if (res.error) throw res.error;

      // Update main status
      await cloud.from("order_tracking_main").update({
        current_status_id: newEvent.status_id
      }).eq("id", tracking.id);

      toast({ title: "Sucesso", description: "Evento adicionado." });
      setNewEvent({ status_id: "", title: "", description: "", location_city: "", location_state: "" });
      loadInitialData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEvent = async (eventId: string, updates: any) => {
    setLoading(true);
    try {
      const { error } = await cloud.from("order_tracking_timeline").update(updates).eq("id", eventId);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Evento atualizado." });
      loadInitialData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Excluir esta etapa do histórico?")) return;
    setLoading(true);
    try {
      const { error } = await cloud.from("order_tracking_timeline").delete().eq("id", eventId);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Evento excluído." });
      loadInitialData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const currentStatus = statuses.find(s => s.id === tracking?.current_status_id);
  const currentStatusIndex = currentStatus ? statuses.findIndex(s => s.id === currentStatus.id) : -1;

  const handleStepClick = async (statusId: string) => {
    if (!tracking) return;
    setLoading(true);
    try {
      const status = statuses.find(s => s.id === statusId);
      await cloud.from("order_tracking_main").update({
        current_status_id: statusId
      }).eq("id", tracking.id);
      
      // Also add a timeline event for this status change
      await cloud.from("order_tracking_timeline").insert({
        tracking_id: tracking.id,
        status_id: statusId,
        title: status?.label || "Status Atualizado",
        description: `O status do pedido foi alterado para ${status?.label}.`,
        event_at: new Date().toISOString()
      });

      toast({ title: "Status Atualizado", description: `Pedido movido para: ${status?.label}` });
      loadInitialData();
      onUpdate();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Avançar / Retornar Etapas</h4>
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 no-scrollbar">
          {statuses.map((s, idx) => {
            const isActive = s.id === tracking?.current_status_id;
            const isCompleted = currentStatusIndex > idx;
            
            return (
              <button
                key={s.id}
                onClick={() => handleStepClick(s.id)}
                disabled={loading}
                className={`flex flex-col items-center gap-2 min-w-[80px] transition-all ${isActive ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isActive ? 'bg-primary border-primary text-white shadow-lg' : 
                  isCompleted ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-background border-muted'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-tighter text-center leading-none max-w-[70px] ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase">Código de Rastreio</Label>
          <Input 
            value={form.tracking_code} 
            onChange={e => setForm({...form, tracking_code: e.target.value})}
            placeholder="Ex: BR123456789"
            className="h-10 font-bold"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase">Transportadora</Label>
          <Select value={form.carrier_id} onValueChange={v => setForm({...form, carrier_id: v})}>
            <SelectTrigger className="h-10 font-bold">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {carriers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase">Previsão de Entrega</Label>
          <Input 
            type="date"
            value={form.estimated_delivery_at} 
            onChange={e => setForm({...form, estimated_delivery_at: e.target.value})}
            className="h-10 font-bold"
          />
        </div>
        <div className="flex items-end">
          <Button className="w-full h-10 font-bold uppercase tracking-widest" onClick={handleCreateOrUpdateTracking} disabled={loading || !form.tracking_code}>
            {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <Save className="mr-2 w-4 h-4" />}
            {tracking ? "Atualizar Dados" : "Criar Rastreio"}
          </Button>
        </div>
      </div>

      {tracking && (
        <div className="border-t pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Personalizar Etapa
            </h3>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Status do Evento</Label>
              <Select value={newEvent.status_id} onValueChange={v => setNewEvent({...newEvent, status_id: v})}>
                <SelectTrigger className="h-10 bg-white">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Título Personalizado</Label>
              <Input 
                value={newEvent.title} 
                onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                placeholder="Ex: Saiu para entrega"
                className="h-10 bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Cidade</Label>
                <Input 
                  value={newEvent.location_city} 
                  onChange={e => setNewEvent({...newEvent, location_city: e.target.value})}
                  className="h-10 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">UF</Label>
                <Input 
                  value={newEvent.location_state} 
                  onChange={e => setNewEvent({...newEvent, location_state: e.target.value})}
                  className="h-10 bg-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Mensagem da Etapa</Label>
              <Input 
                value={newEvent.description} 
                onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                placeholder="Ex: Objeto em trânsito para..."
                className="h-10 bg-white"
              />
            </div>
            <Button className="md:col-span-2 h-10 font-bold uppercase tracking-widest" variant="secondary" onClick={handleAddEvent} disabled={loading || !newEvent.status_id}>
              Adicionar ao Histórico
            </Button>
          </div>

          <div className="space-y-4">
            <h4 className="font-black uppercase tracking-widest text-xs text-muted-foreground">Linha do Tempo (Edição)</h4>
            <div className="space-y-3">
              {timeline.length === 0 ? (
                <p className="text-sm text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">Nenhum evento registrado.</p>
              ) : (
                timeline.sort((a,b) => new Date(b.event_at).getTime() - new Date(a.event_at).getTime()).map(event => (
                  <div key={event.id} className="group relative flex gap-3 p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-primary/30 transition-all">
                    <div className="mt-1.5 relative">
                      <div className="w-3 h-3 rounded-full bg-primary ring-4 ring-primary/10" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <Input 
                          className="h-7 text-sm font-bold border-none p-0 focus-visible:ring-0 w-full bg-transparent"
                          defaultValue={event.title}
                          onBlur={(e) => handleUpdateEvent(event.id, { title: e.target.value })}
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <Input 
                            type="datetime-local"
                            className="h-6 text-[10px] w-32 border-none p-0 focus-visible:ring-0 bg-transparent text-muted-foreground"
                            defaultValue={format(new Date(event.event_at), "yyyy-MM-dd'T'HH:mm")}
                            onBlur={(e) => handleUpdateEvent(event.id, { event_at: new Date(e.target.value).toISOString() })}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <Input 
                        className="h-6 text-xs text-slate-500 border-none p-0 focus-visible:ring-0 w-full bg-transparent"
                        defaultValue={event.description}
                        placeholder="Sem descrição..."
                        onBlur={(e) => handleUpdateEvent(event.id, { description: e.target.value })}
                      />
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <MapPin className="w-3 h-3" />
                          <Input 
                            className="h-5 text-[10px] border-none p-0 focus-visible:ring-0 w-24 bg-transparent"
                            defaultValue={event.location_city}
                            placeholder="Cidade"
                            onBlur={(e) => handleUpdateEvent(event.id, { location_city: e.target.value })}
                          />
                          <span>/</span>
                          <Input 
                            className="h-5 text-[10px] border-none p-0 focus-visible:ring-0 w-8 bg-transparent"
                            defaultValue={event.location_state}
                            placeholder="UF"
                            onBlur={(e) => handleUpdateEvent(event.id, { location_state: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
