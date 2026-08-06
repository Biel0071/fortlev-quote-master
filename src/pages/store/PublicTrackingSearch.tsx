import React, { useState, useEffect } from "react";
import { cloud } from "@/lib/cloud";
import { AppHeader } from "@/components/store/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Package, Truck, CheckCircle2, MapPin, Calendar, Clock, ArrowLeft, Box, ShieldCheck, CreditCard, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSearchParams, Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { FloatingChatButton } from "@/components/store/FloatingChatButton";

export default function PublicTrackingSearch() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(searchParams.get("q") || "");
  const [cpf, setCpf] = useState("");
  const [result, setResult] = useState<any>(null);
  const [activeInfo, setActiveInfo] = useState<{ title: string; desc: string } | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code && !cpf) return;
    setLoading(true);
    setResult(null);

    try {
      let query = cloud
        .from("order_tracking_main")
        .select(`
          *, 
          carrier:order_tracking_carriers(*), 
          status:order_tracking_status(*), 
          timeline:order_tracking_timeline(*), 
          order:store_orders(*),
          items:store_order_items(*)
        `);
      
      if (code) {
        query = query.or(`tracking_code.eq.${code.trim()},order_id.eq.${code.trim()}`);
      } else if (cpf) {
        const cleanCpf = cpf.replace(/\D/g, "");
        query = query.filter("order.customer_cpf", "eq", cleanCpf);
      }

      const { data, error } = await query;
      
      const resultData = Array.isArray(data) ? data[0] : data;

      if (error) throw error;
      if (!resultData) {
        setResult({ notFound: true });
        toast({ title: "Não encontrado", description: "Nenhum pedido encontrado para os dados informados.", variant: "destructive" });
      } else {
        setResult(resultData);
      }
    } catch (error: any) {
      toast({ title: "Erro na consulta", description: "Ocorreu um erro ao buscar seu rastreio.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get("q")) {
      handleSearch();
    }
  }, []);


  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12 tracking-search-page">
      <AppHeader cartCount={0} />
      <StoreMobileChrome cartCount={0} />
      <FloatingChatButton />

      
      <main className="max-w-4xl mx-auto px-4 pt-[var(--store-header-offset)] pb-8 sm:py-12 space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
            <Truck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase">Rastreio de Pedidos</h1>
            <p className="text-muted-foreground max-w-md mx-auto">Acompanhe o status da sua entrega em tempo real.</p>
          </div>
        </div>

        <Card className="border-2 border-primary/5 shadow-xl rounded-3xl overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSearch} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="search" className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground ml-1">
                    Código de Rastreio, Pedido ou CPF
                  </Label>
                  <div className="relative">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input 
                      id="search" 
                      value={code} 
                      onChange={e => {
                        const val = e.target.value;
                        setCode(val);
                        // Auto-detect CPF to sync fields if needed, but here we unify the logic
                        if (/^\d+$/.test(val.replace(/[\.\-]/g, "")) && val.replace(/[\.\-]/g, "").length > 9) {
                          setCpf(val);
                        } else {
                          setCpf("");
                        }
                      }} 
                      placeholder="Digite seu código ou CPF" 
                      className="h-12 sm:h-14 pl-12 rounded-2xl border-2 border-slate-100 focus:border-primary transition-all font-bold text-slate-700 text-sm sm:text-base"
                    />
                  </div>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 sm:h-14 text-[13px] sm:text-base font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all px-2" 
                disabled={loading || !code}
              >
                {loading ? <Clock className="animate-spin mr-2 w-4 h-4 sm:w-5 sm:h-5" /> : <Search className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />}
                <span className="truncate">Consultar Status de Entrega</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {result && !result.notFound ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Main Result Card */}
            <Card className="overflow-hidden border-2 border-primary/10 shadow-2xl rounded-3xl">
              <div className="bg-primary p-6 sm:p-8 text-primary-foreground relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-80">Status do seu pedido</p>
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black uppercase">{result.status?.label || 'Em processamento'}</h2>
                      <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    </div>
                    <p className="text-sm font-medium opacity-90">Pedido #{result.order?.id?.slice(0, 8)} • Código {result.tracking_code}</p>
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-2 relative z-10">
                    {result.estimated_delivery_at && (
                      <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 shadow-lg">
                         <div className="flex items-center gap-2 mb-1">
                           <Calendar className="w-3.5 h-3.5 opacity-70" />
                           <p className="text-[10px] uppercase font-black tracking-wider opacity-70 leading-none">Previsão de Entrega</p>
                         </div>
                         <p className="text-xl font-black">{new Date(result.estimated_delivery_at).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stepper Modernizado */}
                <div className="mt-10 relative z-10">
                   <div className="flex justify-between items-end mb-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block">Progresso Logístico</span>
                        <div className="text-xs font-black bg-white/20 px-2 py-0.5 rounded-full inline-block">
                          {result.status?.progress_percentage || 10}% Concluído
                        </div>
                      </div>
                      <Box className="w-8 h-8 opacity-20" />
                   </div>

                   <div className="relative h-4 bg-white/10 rounded-full overflow-hidden p-1 shadow-inner">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                        style={{ width: `${result.status?.progress_percentage || 10}%` }}
                      />
                   </div>

                   <div className="flex justify-between mt-3 text-center">
                      {[
                        { label: 'Loja', active: (result.status?.progress_percentage || 0) >= 10 },
                        { label: 'CD Logístico', active: (result.status?.progress_percentage || 0) >= 30 },
                        { label: 'Em transporte', active: (result.status?.progress_percentage || 0) >= 60 },
                        { label: 'Saiu para Entrega', active: (result.status?.progress_percentage || 0) >= 90 },
                        { label: 'Entregue', active: (result.status?.progress_percentage || 0) >= 100 }
                      ].map((step, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
                          <div className={`w-2 h-2 rounded-full transition-all duration-500 ${step.active ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-white/20'}`} />
                          <span className={`text-[8px] font-black uppercase tracking-tighter transition-opacity leading-none ${step.active ? 'opacity-100' : 'opacity-40'}`}>
                            {step.label}
                          </span>
                        </div>
                      ))}
                   </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-5 gap-10">
                 {/* Timeline */}
                 <div className="lg:col-span-3 space-y-8">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                             <Clock className="w-4 h-4" />
                          </div>
                          <h3 className="font-black uppercase tracking-widest text-sm text-slate-800">Linha do Tempo</h3>
                       </div>
                       <Badge variant="outline" className="text-[10px] font-black uppercase border-primary/20 text-primary">Tempo Real</Badge>
                    </div>

                    <div className="relative pl-6 space-y-10 before:absolute before:left-6 before:top-2 before:bottom-2 before:w-1 before:bg-slate-100">
                      {(result.timeline || []).sort((a:any, b:any) => new Date(b.event_at).getTime() - new Date(a.event_at).getTime()).map((event: any, idx: number) => (
                        <div key={event.id} className="relative pl-10">
                          <div className={`absolute left-[-6px] top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm ${idx === 0 ? 'bg-primary scale-125' : 'bg-slate-300'}`} />
                          <div className="flex flex-col gap-1.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <span className={`font-black uppercase tracking-tight text-base ${idx === 0 ? 'text-primary' : 'text-slate-700'}`}>{event.title}</span>
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                {new Date(event.event_at).toLocaleString()}
                              </span>
                            </div>
                            {event.description && <p className="text-sm text-slate-500 font-medium leading-relaxed">{event.description}</p>}
                            {(event.location_city || event.location_state) && (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mt-1">
                                <MapPin className="w-3.5 h-3.5 text-primary" />
                                {event.location_city}{event.location_city && event.location_state ? ', ' : ''}{event.location_state}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>

                 {/* Sidebar Info */}
                 <div className="lg:col-span-2 space-y-6">
                    {result.carrier && (
                      <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
                         <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary">
                               <Truck className="w-6 h-6" />
                            </div>
                            <div>
                               <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider leading-none mb-1">Transportadora</p>
                               <h4 className="font-black text-lg text-slate-800">{result.carrier.name}</h4>
                            </div>
                         </div>
                         {result.carrier.website && (
                            <Button asChild variant="outline" className="w-full rounded-2xl border-2 font-black uppercase text-xs h-10 tracking-widest">
                               <a href={result.carrier.website} target="_blank" rel="noreferrer">Acessar Site Oficial</a>
                            </Button>
                         )}
                      </div>
                    )}

                    <div className="p-5 rounded-3xl border-2 border-slate-50 space-y-4">
                       <h4 className="font-black uppercase tracking-wider text-xs text-slate-400">Produtos do pedido</h4>
                       <div className="space-y-3">
                          {(result.items || []).map((item: any, i: number) => (
                             <div key={i} className="flex items-center justify-between gap-4 text-sm">
                                <span className="font-bold text-slate-700 line-clamp-1">{item.name_snapshot}</span>
                                <span className="font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">x{item.quantity}</span>
                             </div>
                          ))}
                       </div>
                    </div>

                    <Card className="rounded-3xl border-none bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl">
                       <CardContent className="p-6 flex items-center justify-between gap-4">
                          <div className="space-y-1">
                             <p className="text-[10px] uppercase font-black tracking-widest opacity-60">Valor Total</p>
                             <p className="text-2xl font-black">{formatCurrency(Number(result.order?.total || 0))}</p>
                          </div>
                          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                             <CreditCard className="w-6 h-6 opacity-80" />
                          </div>
                       </CardContent>
                    </Card>
                 </div>
              </div>
            </Card>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
               <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-green-500" /> Sistema de rastreamento auditado e seguro
               </div>
               <span className="hidden sm:inline text-slate-200">•</span>
               <button onClick={() => { setResult(null); setCode(""); setCpf(""); }} className="text-xs font-black uppercase tracking-widest text-primary hover:underline">
                  Realizar Nova Consulta
               </button>
            </div>
          </div>
        ) : result?.notFound && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Search className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-800 uppercase">Não encontrado</h2>
              <p className="text-muted-foreground max-w-sm">Não foi encontrado rastreio para o pedido com os dados informados.</p>
            </div>
            <Button asChild className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-green-500/20 bg-green-600 hover:bg-green-700">
              <a href="https://wa.me/553175193626?text=Olá, não consegui rastrear minha entrega" target="_blank" rel="noreferrer">
                Falar no WhatsApp
              </a>
            </Button>
            <button onClick={() => { setResult(null); setCode(""); setCpf(""); }} className="text-xs font-black uppercase tracking-widest text-primary hover:underline">
              Tentar Novamente
            </button>
          </div>
        )}

        <Dialog open={!!activeInfo} onOpenChange={(open) => !open && setActiveInfo(null)}>
          <DialogContent className="rounded-3xl max-w-[90vw] sm:max-w-md">
            <DialogHeader className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                <Info className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-black uppercase text-center tracking-tight">
                {activeInfo?.title}
              </DialogTitle>
              <DialogDescription className="text-center text-base font-medium leading-relaxed text-slate-600">
                {activeInfo?.desc}
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => setActiveInfo(null)} className="w-full rounded-2xl h-12 font-black uppercase tracking-widest mt-4">
              Entendi
            </Button>
          </DialogContent>
        </Dialog>
      </main>
    </div>

  );
}
