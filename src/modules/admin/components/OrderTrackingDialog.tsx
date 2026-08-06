import React, { useState, useEffect } from "react";
import { cloud } from "@/lib/cloud";
import { useStore } from "@/contexts/StoreContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, MapPin, Truck, Calendar } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Código de Rastreio</Label>
          <Input 
            value={form.tracking_code} 
            onChange={e => setForm({...form, tracking_code: e.target.value})}
            placeholder="Ex: BR123456789"
          />
        </div>
        <div className="space-y-2">
          <Label>Transportadora</Label>
          <Select value={form.carrier_id} onValueChange={v => setForm({...form, carrier_id: v})}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {carriers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Previsão de Entrega</Label>
          <Input 
            type="date"
            value={form.estimated_delivery_at} 
            onChange={e => setForm({...form, estimated_delivery_at: e.target.value})}
          />
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={handleCreateOrUpdateTracking} disabled={loading || !form.tracking_code}>
            {loading ? <Loader2 className="animate-spin mr-2" /> : null}
            {tracking ? "Atualizar Rastreio" : "Criar Rastreio"}
          </Button>
        </div>
      </div>

      {tracking && (
        <div className="border-t pt-6 space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Plus className="w-5 h-5" /> Adicionar Evento na Timeline
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newEvent.status_id} onValueChange={v => setNewEvent({...newEvent, status_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título (Opcional)</Label>
              <Input 
                value={newEvent.title} 
                onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                placeholder="Ex: Saiu para entrega"
              />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input 
                value={newEvent.location_city} 
                onChange={e => setNewEvent({...newEvent, location_city: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>UF</Label>
              <Input 
                value={newEvent.location_state} 
                onChange={e => setNewEvent({...newEvent, location_state: e.target.value})}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Descrição</Label>
              <Input 
                value={newEvent.description} 
                onChange={e => setNewEvent({...newEvent, description: e.target.value})}
              />
            </div>
            <Button className="md:col-span-2" variant="secondary" onClick={handleAddEvent} disabled={loading || !newEvent.status_id}>
              Adicionar ao Histórico
            </Button>
          </div>

          <div className="mt-6 space-y-4">
            <h4 className="font-medium">Linha do Tempo Atual</h4>
            <div className="space-y-3">
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
              ) : (
                timeline.sort((a,b) => new Date(b.event_at).getTime() - new Date(a.event_at).getTime()).map(event => (
                  <div key={event.id} className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="mt-1">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{event.title}</span>
                        <span className="text-xs text-muted-foreground">{new Date(event.event_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                      {(event.location_city || event.location_state) && (
                        <div className="text-xs flex items-center gap-1 mt-1 text-muted-foreground">
                          <MapPin className="w-3 h-3" /> {event.location_city}{event.location_city && event.location_state ? ', ' : ''}{event.location_state}
                        </div>
                      )}
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
