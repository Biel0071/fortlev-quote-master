import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Plan { id: string; name: string; price: string; frequency: string; status: string; }

export default function AdminPaymentsSubscriptions() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState({ name: "", price: "", frequency: "mensal" });

  const addPlan = () => {
    if (!form.name || !form.price) { toast.error("Preencha nome e valor"); return; }
    setPlans([...plans, { ...form, id: crypto.randomUUID(), status: "active" }]);
    setForm({ name: "", price: "", frequency: "mensal" });
    toast.success("Plano adicionado");
  };

  const fmt = (v: string) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Repeat className="h-6 w-6 text-primary" /> Assinaturas</h1>
      <Card>
        <CardHeader><CardTitle className="text-sm">Novo plano</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Plano Básico" /></div>
            <div className="space-y-2"><Label>Valor (R$)</Label><Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" /></div>
            <div className="space-y-2"><Label>Frequência</Label>
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
          </div>
          <Button onClick={addPlan} size="sm"><Plus className="h-4 w-4 mr-2" /> Adicionar</Button>
        </CardContent>
      </Card>
      {plans.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Planos</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Valor</TableHead><TableHead>Freq.</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{fmt(p.price)}</TableCell>
                    <TableCell className="capitalize">{p.frequency}</TableCell>
                    <TableCell><Badge>Ativo</Badge></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => setPlans(plans.filter((x) => x.id !== p.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
