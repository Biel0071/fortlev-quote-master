import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Repeat, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export default function AdminPaymentsSubscriptions() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", price: "", frequency: "mensal", trial_days: "0" });

  const { data: plans } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data } = await supabase.from("subscription_plans").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: subs } = useQuery({
    queryKey: ["payment-subscriptions"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_subscriptions").select("*, subscription_plans(name, price, frequency)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const addPlan = async () => {
    if (!form.name || !form.price) { toast.error("Preencha nome e valor"); return; }
    const { error } = await supabase.from("subscription_plans").insert({
      name: form.name,
      price: Number(form.price),
      frequency: form.frequency,
      trial_days: Number(form.trial_days) || 0,
    });
    if (error) { toast.error("Erro ao criar plano"); return; }
    toast.success("Plano criado");
    setForm({ name: "", price: "", frequency: "mensal", trial_days: "0" });
    qc.invalidateQueries({ queryKey: ["subscription-plans"] });
  };

  const deletePlan = async (id: string) => {
    await supabase.from("subscription_plans").delete().eq("id", id);
    toast.success("Plano removido");
    qc.invalidateQueries({ queryKey: ["subscription-plans"] });
  };

  const fmt = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");
  const statusVariant = (s: string) => s === "active" ? "default" : s === "canceled" ? "destructive" : "secondary";

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Repeat className="h-6 w-6 text-primary" /> Assinaturas</h1>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="subscribers">Assinantes</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Novo plano</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Plano Básico" /></div>
                <div className="space-y-2"><Label>Valor (R$)</Label><Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" /></div>
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Trial (dias)</Label><Input value={form.trial_days} onChange={(e) => setForm({ ...form, trial_days: e.target.value })} type="number" /></div>
              </div>
              <Button onClick={addPlan} size="sm"><Plus className="h-4 w-4 mr-2" /> Adicionar plano</Button>
            </CardContent>
          </Card>

          {(plans?.length || 0) > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Planos ({plans?.length})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Frequência</TableHead>
                      <TableHead>Trial</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans!.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{fmt(p.price)}</TableCell>
                        <TableCell className="capitalize">{p.frequency}</TableCell>
                        <TableCell>{p.trial_days || 0} dias</TableCell>
                        <TableCell><Badge variant={statusVariant(p.status)}>{p.status === "active" ? "Ativo" : p.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => deletePlan(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="subscribers" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Assinantes</CardTitle></CardHeader>
            <CardContent>
              {!subs?.length ? (
                <p className="text-muted-foreground text-sm py-8 text-center">Nenhum assinante encontrado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Próx. cobrança</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subs.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.customer_name || s.customer_id?.slice(0, 8) || "—"}</TableCell>
                        <TableCell>{(s.subscription_plans as any)?.name || "—"}</TableCell>
                        <TableCell><Badge variant={statusVariant(s.status)}>{s.status === "active" ? "Ativo" : s.status === "canceled" ? "Cancelado" : "Atrasado"}</Badge></TableCell>
                        <TableCell className="text-xs">{s.next_billing_at ? fmtDate(s.next_billing_at) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
