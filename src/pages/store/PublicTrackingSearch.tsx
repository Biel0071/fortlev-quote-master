import React, { useState, useEffect } from "react";
import { cloud } from "@/lib/cloud";
import { AppHeader } from "@/components/store/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Package, Truck, CheckCircle2, MapPin, Calendar, Clock, ArrowLeft, Box, ShieldCheck, CreditCard } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSearchParams, Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { formatCurrency } from "@/utils/formatters";


export default function PublicTrackingSearch() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(searchParams.get("q") || "");
  const [cpf, setCpf] = useState("");
  const [result, setResult] = useState<any>(null);

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

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({ title: "Não encontrado", description: "Nenhum pedido encontrado para os dados informados.", variant: "destructive" });
      } else {
        setResult(data);
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
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <AppHeader cartCount={0} />
      <StoreMobileChrome cartCount={0} />
      
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
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
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-xs font-black uppercase tracking-wider text-muted-foreground ml-1">Código de Rastreio ou Pedido</Label>
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input 
                    id="code" 
                    value={code} 
                    onChange={e => setCode(e.target.value)} 
                    placeholder="Ex: BR123456789 ou #83271" 
                    className="h-14 pl-12 rounded-2xl border-2 border-slate-100 focus:border-primary transition-all font-bold text-slate-700"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf" className="text-xs font-black uppercase tracking-wider text-muted-foreground ml-1">Ou CPF do comprador</Label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input 
                    id="cpf" 
                    value={cpf} 
                    onChange={e => setCpf(e.target.value)} 
                    placeholder="000.000.000-00" 
                    className="h-14 pl-12 rounded-2xl border-2 border-slate-100 focus:border-primary transition-all font-bold text-slate-700"
                  />
                </div>
              </div>
              <Button type="submit" className="md:col-span-2 w-full h-14 text-lg font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all" disabled={loading || (!code && !cpf)}>
                {loading ? <Clock className="animate-spin mr-3 w-6 h-6" /> : <Search className="mr-3 w-6 h-6" />}
                Consultar Status de Entrega
              </Button>
            </form>
          </CardContent>
        </Card>

        {result ? (
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

                   <div className="flex justify-between mt-3">
                      {[
                        { label: 'Preparação', active: (result.status?.progress_percentage || 0) >= 10 },
                        { label: 'Em transporte', active: (result.status?.progress_percentage || 0) >= 50 },
                        { label: 'Entregue', active: (result.status?.progress_percentage || 0) >= 100 }
                      ].map((step, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${step.active ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-white/20'}`} />
                          <span className={`text-[9px] font-black uppercase tracking-tighter transition-opacity ${step.active ? 'opacity-100' : 'opacity-40'}`}>
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
             {[
               { icon: Truck, title: "Tempo Real", desc: "Acompanhe cada etapa logística da sua obra, desde a separação até a entrega final." },
               { icon: ShieldCheck, title: "Segurança Total", desc: "Seus dados estão protegidos por criptografia de ponta a ponta durante toda a consulta." },
               { icon: Calendar, title: "Previsões Reais", desc: "Algoritmos avançados calculam a data de entrega baseada no histórico de transporte." },
             ].map((feature, i) => (
               <div key={i} className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100 space-y-3 text-center md:text-left hover:bg-white hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary mx-auto md:mx-0">
                     <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-black uppercase tracking-tight text-base text-slate-800">{feature.title}</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
               </div>
             ))}
          </div>
        )}
      </main>
    </div>

  );
}
