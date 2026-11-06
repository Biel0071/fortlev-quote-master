import React, { useState, useEffect } from "react";
import { cloud } from "@/lib/cloud";
import { useStore } from "@/contexts/StoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, MapPin, Truck, Calendar, CheckCircle2, Save, Eye, Gauge, ShieldCheck, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CarrierBrandLogo, OFFICIAL_CARRIERS, resolveOfficialCarrier } from "@/components/store/tracking/CarrierBrandLogo";
import { TrackingCustomerCard } from "@/components/store/tracking/TrackingCustomerCard";

interface OrderTrackingDialogProps {
  order: any;
  onClose: () => void;
  onUpdate: () => void;
}

export function OrderTrackingDialog({ order, onClose, onUpdate }: OrderTrackingDialogProps) {
  const { activeStoreId } = useStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [carriers, setCarriers] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [tracking, setTracking] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [customProgress, setCustomProgress] = useState<number>(35);
  const [customTotal, setCustomTotal] = useState<string>("0");
  
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
        const meta = (trackingRes.data.metadata as any) || {};
        const savedProgress = typeof meta.custom_progress === "number" ? meta.custom_progress : null;
        
        setForm({
          tracking_code: trackingRes.data.tracking_code || "",
          carrier_id: trackingRes.data.carrier_id || "",
          estimated_delivery_at: trackingRes.data.estimated_delivery_at ? format(new Date(trackingRes.data.estimated_delivery_at), "yyyy-MM-dd") : "",
        });
        setTimeline(trackingRes.data.order_tracking_timeline || []);
        
        const currentSt = (statusesRes.data || []).find((s: any) => s.id === trackingRes.data.current_status_id);
        const autoProgress = currentSt?.progress_percentage ?? 35;
        setCustomProgress(savedProgress ?? autoProgress);
        setCustomTotal(String(order.total || meta.custom_total || "0"));
      } else {
        const defaultCarrier = (carriersRes.data || [])[0];
        setForm({
          tracking_code: `RT${Math.floor(Math.random() * 90000000 + 10000000)}BR`,
          carrier_id: defaultCarrier?.id || "",
          estimated_delivery_at: format(new Date(Date.now() + 7 * 86400000), "yyyy-MM-dd"),
        });
        setCustomTotal(String(order.total || "0"));
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
      const prevMetadata = (tracking?.metadata as any) || {};
      const payload = {
        store_id: activeStoreId,
        order_id: order.id,
        tracking_code: form.tracking_code.toUpperCase().trim(),
        carrier_id: form.carrier_id || null,
        estimated_delivery_at: form.estimated_delivery_at ? new Date(form.estimated_delivery_at + "T10:00:00").toISOString() : null,
        metadata: {
          ...prevMetadata,
          custom_progress: customProgress,
          custom_total: parseFloat(customTotal) || 0,
        },
      };

      let res;
      if (tracking) {
        res = await cloud.from("order_tracking_main").update(payload).eq("id", tracking.id);
      } else {
        res = await cloud.from("order_tracking_main").insert(payload).select().single();
      }

      if (res.error) throw res.error;

      // Se novo rastreio, cria evento inicial
      if (!tracking && res.data) {
        const firstStatus = statuses[0];
        if (firstStatus) {
          await cloud.from("order_tracking_timeline").insert({
            tracking_id: res.data.id,
            status_id: firstStatus.id,
            title: firstStatus.label,
            description: "O objeto foi entregue à transportadora e está em processamento.",
            location_city: "Centro de Distribuição",
            event_at: new Date().toISOString()
          });
          await cloud.from("order_tracking_main").update({
            current_status_id: firstStatus.id
          }).eq("id", res.data.id);
        }
      }

      toast({ title: "Sucesso", description: "Dados de rastreio e % de envio atualizados." });
      await loadInitialData();
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

      const progressByStatus = selectedStatus?.progress_percentage ?? customProgress;
      setCustomProgress(progressByStatus);

      await cloud.from("order_tracking_main").update({
        current_status_id: newEvent.status_id,
        metadata: {
          ...((tracking.metadata as any) || {}),
          custom_progress: progressByStatus,
        }
      }).eq("id", tracking.id);

      toast({ title: "Sucesso", description: "Etapa adicionada ao histórico." });
      setNewEvent({ status_id: "", title: "", description: "", location_city: "", location_state: "" });
      await loadInitialData();
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

  const handleStepClick = async (statusId: string) => {
    if (!tracking) return;
    setLoading(true);
    try {
      const status = statuses.find(s => s.id === statusId);
      const newPct = status?.progress_percentage ?? customProgress;
      setCustomProgress(newPct);

      await cloud.from("order_tracking_main").update({
        current_status_id: statusId,
        metadata: {
          ...((tracking.metadata as any) || {}),
          custom_progress: newPct,
        }
      }).eq("id", tracking.id);
      
      await cloud.from("order_tracking_timeline").insert({
        tracking_id: tracking.id,
        status_id: statusId,
        title: status?.label || "Status Atualizado",
        description: `O status do pedido foi alterado para ${status?.label}.`,
        event_at: new Date().toISOString()
      });

      toast({ title: "Status Atualizado", description: `Etapa movida para: ${status?.label} (${newPct}% de envio)` });
      await loadInitialData();
      onUpdate();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const currentStatus = statuses.find(s => s.id === tracking?.current_status_id);
  const currentStatusIndex = currentStatus ? statuses.findIndex(s => s.id === currentStatus.id) : -1;
  const currentCarrier = carriers.find(c => c.id === form.carrier_id) || null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-2 w-full sm:w-80">
            <TabsTrigger value="edit">Configurar Rastreio</TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5">
              <Eye className="w-3.5 h-3.5 text-primary" /> Ver Preview do Cliente
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {tracking?.tracking_code && (
          <Button
            variant="outline"
            size="sm"
            asChild
            className="text-xs font-bold gap-1 rounded-xl hidden sm:inline-flex"
          >
            <a href={`/rastreio?q=${tracking.tracking_code}`} target="_blank" rel="noreferrer">
              <ExternalLink className="w-3.5 h-3.5" /> Abrir no Rastreio Público
            </a>
          </Button>
        )}
      </div>

      {activeTab === "edit" ? (
        <div className="space-y-6">
          {/* Seletor Rápido de Etapas */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">
                Avançar / Retornar Etapa de Envio
              </h4>
              <span className="text-xs font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                {customProgress}% Concluído
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 no-scrollbar">
              {statuses.map((s, idx) => {
                const isActive = s.id === tracking?.current_status_id;
                const isCompleted = currentStatusIndex > idx;
                
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleStepClick(s.id)}
                    disabled={loading}
                    className={`flex flex-col items-center gap-1.5 min-w-[85px] transition-all p-2 rounded-xl hover:bg-white ${
                      isActive ? 'scale-105 bg-white shadow-md border border-primary/20' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-colors ${
                      isActive ? 'bg-primary border-primary text-white shadow-sm' : 
                      isCompleted ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-background border-muted'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-tighter text-center leading-none max-w-[75px] ${isActive ? 'text-primary' : 'text-slate-600'}`}>
                      {s.label}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">
                      {s.progress_percentage ?? (idx + 1) * 20}%
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Ajuste Fino da % de Envio */}
            <div className="pt-2 border-t border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-primary" /> % de Envio Customizada:
                </span>
                <span className="font-mono text-primary font-black text-sm">{customProgress}%</span>
              </div>
              <Slider
                value={[customProgress]}
                onValueChange={(val) => setCustomProgress(val[0])}
                min={5}
                max={100}
                step={1}
                className="py-1 cursor-pointer"
              />
            </div>
          </div>

          {/* Dados Principais com Logos Oficiais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase">Código de Rastreio</Label>
              <Input 
                value={form.tracking_code} 
                onChange={e => setForm({...form, tracking_code: e.target.value})}
                placeholder="Ex: RT74307932BR"
                className="h-11 font-mono font-bold uppercase tracking-wider"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase flex items-center justify-between">
                <span>Transportadora Oficial</span>
                {currentCarrier && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Logo Oficial Ativa
                  </span>
                )}
              </Label>
              <div className="flex items-center gap-2">
                <Select value={form.carrier_id} onValueChange={v => setForm({...form, carrier_id: v})}>
                  <SelectTrigger className="h-11 font-bold">
                    <SelectValue placeholder="Selecione a transportadora..." />
                  </SelectTrigger>
                  <SelectContent>
                    {carriers.map(c => {
                      const official = resolveOfficialCarrier(c.name);
                      return (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{c.name}</span>
                            {official && <span className="text-[10px] text-muted-foreground">({official.modality})</span>}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {currentCarrier && (
                  <CarrierBrandLogo name={currentCarrier.name} logoUrl={currentCarrier.logo_url} size="sm" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase">Previsão de Entrega</Label>
              <Input 
                type="date"
                value={form.estimated_delivery_at} 
                onChange={e => setForm({...form, estimated_delivery_at: e.target.value})}
                className="h-11 font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase">Valor Total da Carga / Pedido (R$)</Label>
              <Input 
                type="number"
                step="0.01"
                value={customTotal} 
                onChange={e => setCustomTotal(e.target.value)}
                placeholder="0.00"
                className="h-11 font-bold"
              />
            </div>

            <div className="md:col-span-2 pt-2">
              <Button 
                className="w-full h-11 font-bold uppercase tracking-widest text-sm" 
                onClick={handleCreateOrUpdateTracking} 
                disabled={loading || !form.tracking_code}
              >
                {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <Save className="mr-2 w-4 h-4" />}
                {tracking ? "Atualizar Rastreio e % de Envio" : "Criar Rastreio Oficial"}
              </Button>
            </div>
          </div>

          {/* Gerenciamento de Etapas da Linha do Tempo */}
          {tracking && (
            <div className="border-t pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" /> Adicionar Ponto de Passagem / Evento
                </h3>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Status do Evento</Label>
                  <Select value={newEvent.status_id} onValueChange={v => setNewEvent({...newEvent, status_id: v})}>
                    <SelectTrigger className="h-10 bg-white">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Título Personalizado</Label>
                  <Input 
                    value={newEvent.title} 
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                    placeholder="Ex: Saiu para entrega ao destinatário"
                    className="h-10 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Cidade</Label>
                    <Input 
                      value={newEvent.location_city} 
                      onChange={e => setNewEvent({...newEvent, location_city: e.target.value})}
                      placeholder="Ex: Guarulhos"
                      className="h-10 bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500">UF</Label>
                    <Input 
                      value={newEvent.location_state} 
                      onChange={e => setNewEvent({...newEvent, location_state: e.target.value})}
                      placeholder="SP"
                      className="h-10 bg-white uppercase"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Mensagem da Etapa</Label>
                  <Input 
                    value={newEvent.description} 
                    onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                    placeholder="Ex: Objeto em transferência para Centro de Distribuição..."
                    className="h-10 bg-white"
                  />
                </div>

                <Button 
                  className="md:col-span-2 h-10 font-bold uppercase tracking-widest" 
                  variant="secondary" 
                  onClick={handleAddEvent} 
                  disabled={loading || !newEvent.status_id}
                >
                  Adicionar ao Histórico
                </Button>
              </div>

              {/* Linha do Tempo Editável */}
              <div className="space-y-4">
                <h4 className="font-black uppercase tracking-widest text-xs text-muted-foreground">
                  Histórico Atual ({timeline.length} etapas)
                </h4>
                <div className="space-y-3">
                  {timeline.length === 0 ? (
                    <p className="text-sm text-center py-6 text-muted-foreground border-2 border-dashed rounded-xl">
                      Nenhum evento registrado ainda.
                    </p>
                  ) : (
                    timeline.sort((a,b) => new Date(b.event_at).getTime() - new Date(a.event_at).getTime()).map(event => (
                      <div key={event.id} className="group relative flex gap-3 p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:border-primary/40 transition-all">
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
      ) : (
        /* Preview em tempo real da tela do cliente */
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl flex items-center justify-between text-xs font-bold">
            <span>Pré-visualização fiel da experiência do cliente com % de envio e transportadora oficial:</span>
            <Button size="sm" variant="ghost" className="h-7 text-xs font-black uppercase" onClick={() => setActiveTab("edit")}>
              Voltar à Edição
            </Button>
          </div>

          <div className="border rounded-3xl p-4 bg-slate-100/50">
            <TrackingCustomerCard
              trackingCode={form.tracking_code || "RT74307932BR"}
              orderId={order.id}
              statusLabel={currentStatus?.label || "Coletado"}
              progress={customProgress}
              estimatedDeliveryAt={form.estimated_delivery_at}
              carrier={currentCarrier}
              timeline={timeline.length > 0 ? timeline : [
                {
                  title: "COLETADO",
                  description: "O objeto foi entregue à transportadora e está em processamento.",
                  location_city: "Centro de Distribuição",
                  event_at: new Date().toISOString()
                }
              ]}
              items={order.items || []}
              orderTotal={parseFloat(customTotal) || order.total || 0}
              customerName={order.customer_name}
              address={order.address}
              compact={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
