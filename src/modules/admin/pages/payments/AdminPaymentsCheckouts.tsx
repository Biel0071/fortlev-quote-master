import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, ExternalLink, Plus, XCircle, Link2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminPaymentsCheckouts() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", customer_email: "", customer_phone: "", price: "", description: "", template: "default", status: "active" });

  const { data: checkouts } = useQuery({
    queryKey: ["payment-checkouts"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_checkouts").select("*").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const { data: gateways } = useQuery({
    queryKey: ["payment-gw-list"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_gateways").select("id, name").eq("status", "active");
      return data || [];
    },
  });

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

  const createCheckout = async () => {
    if (!form.name || !form.price) { toast.error("Nome e valor obrigatórios"); return; }
    const { error } = await supabase.from("payment_checkouts").insert({
      name: form.name,
      price: Number(form.price),
      customer_email: form.customer_email || null,
      customer_phone: form.customer_phone || null,
      description: form.description || null,
      template: form.template,
      status: "active",
      config_json: {},
    } as any);
    if (error) { toast.error("Erro ao criar checkout"); return; }
    toast.success("Checkout criado!");
    setForm({ name: "", customer_email: "", customer_phone: "", price: "", description: "", template: "default", status: "active" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["payment-checkouts"] });
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/checkout/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const statusVariant = (s: string) => s === "active" ? "default" : s === "expired" ? "secondary" : s === "paid" ? "outline" : "destructive";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Checkouts</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Criar Checkout</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Criar checkout / link de pagamento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Nome / Produto</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Caixa d'água 1000L" /></div>
                <div className="space-y-2"><Label>Valor (R$)</Label><Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Email cliente</Label><Input value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Telefone</Label><Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={form.template} onValueChange={(v) => setForm({ ...form, template: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Padrão</SelectItem>
                    <SelectItem value="minimal">Minimalista</SelectItem>
                    <SelectItem value="branded">Com marca</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createCheckout} className="w-full">Gerar Link de Pagamento</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Checkouts criados</CardTitle></CardHeader>
        <CardContent>
          {!checkouts?.length ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhum checkout encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkouts.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-xs">{c.customer_email || "—"}</TableCell>
                      <TableCell>{fmt(Number(c.price))}</TableCell>
                      <TableCell className="text-xs">{c.template}</TableCell>
                      <TableCell><Badge variant={statusVariant(c.status)}>{c.status}</Badge></TableCell>
                      <TableCell className="text-xs">{fmtDate(c.created_at)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" title="Copiar link" onClick={() => copyLink(c.id)}><Link2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" title="Abrir"><ExternalLink className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" title="Cancelar"><XCircle className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
