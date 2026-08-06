import React, { useState } from "react";
import { cloud } from "@/lib/cloud";
import { AppHeader } from "@/components/store/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Package, Truck, CheckCircle2, MapPin, Calendar, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function PublicTrackingSearch() {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [cpf, setCpf] = useState("");
  const [result, setResult] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code && !cpf) return;
    setLoading(true);
    setResult(null);

    try {
      let query = cloud.from("order_tracking_main").select("*, carrier:order_tracking_carriers(*), status:order_tracking_status(*), timeline:order_tracking_timeline(*), order:store_orders(*)");
      
      if (code) {
        query = query.eq("tracking_code", code.trim());
      } else if (cpf) {
        // Busca baseada no CPF do cliente do pedido
        query = query.filter("order.customer_cpf", "eq", cpf.replace(/\D/g, ""));
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader cartCount={0} />
      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Rastrear Pedido</h1>
          <p className="text-muted-foreground">Consulte o status da sua entrega em tempo real.</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código de Rastreio</Label>
                <Input id="code" value={code} onChange={e => setCode(e.target.value)} placeholder="Ex: BR123456789" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">Ou CPF do comprador</Label>
                <Input id="cpf" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" />
              </div>
              <Button type="submit" className="md:col-span-2 w-full h-12 text-lg" disabled={loading || (!code && !cpf)}>
                {loading ? <Clock className="animate-spin mr-2" /> : <Search className="mr-2" />}
                Consultar Status
              </Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <Card className="overflow-hidden border-2 border-primary/10 shadow-lg">
            <CardHeader className="bg-primary/5 border-b">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">Pedido #{result.order?.id?.slice(0, 8)}</CardTitle>
                  <p className="text-sm text-muted-foreground">Código: <span className="font-mono font-medium text-foreground">{result.tracking_code}</span></p>
                </div>
                <div className="flex flex-col items-end">
                   <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-primary-foreground font-semibold">
                      {result.status?.icon === 'Truck' && <Truck className="w-4 h-4" />}
                      {result.status?.label || 'Em processamento'}
                   </div>
                   {result.estimated_delivery_at && (
                     <p className="text-xs text-muted-foreground mt-1">
                       Previsão: {new Date(result.estimated_delivery_at).toLocaleDateString()}
                     </p>
                   )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8 pb-12">
              <div className="relative">
                {/* Timeline visual (Vertical) */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted-foreground/20" />
                
                <div className="space-y-8 relative">
                  {(result.timeline || []).sort((a:any, b:any) => new Date(b.event_at).getTime() - new Date(a.event_at).getTime()).map((event: any, idx: number) => (
                    <div key={event.id} className="pl-10 relative">
                      <div className={`absolute left-3 top-1 w-3 h-3 rounded-full border-2 border-background ${idx === 0 ? 'bg-primary scale-125' : 'bg-muted-foreground/40'}`} />
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className={`font-bold ${idx === 0 ? 'text-primary' : 'text-foreground/80'}`}>{event.title}</span>
                          <span className="text-xs text-muted-foreground">{new Date(event.event_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        {(event.location_city || event.location_state) && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground/80">
                            <MapPin className="w-3 h-3" />
                            {event.location_city}{event.location_city && event.location_state ? ', ' : ''}{event.location_state}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
