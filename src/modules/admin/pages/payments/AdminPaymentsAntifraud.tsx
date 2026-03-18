import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Save, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function AdminPaymentsAntifraud() {
  const qc = useQueryClient();

  const [rules, setRules] = useState({
    blockIp: true,
    blockCard: true,
    blockCountry: false,
    blockSuspectEmail: true,
    blockSuspectCpf: true,
    maxAttempts: "5",
    maxAmount: "50000",
    minScore: "30",
    reviewScore: "60",
  });

  const { data: blacklist, refetch: refetchBl } = useQuery({
    queryKey: ["payment-blacklist"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_blacklist").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const [blForm, setBlForm] = useState({ type: "email" as string, value: "", reason: "" });

  const addBlacklist = async () => {
    if (!blForm.value.trim()) { toast.error("Valor obrigatório"); return; }
    const { error } = await supabase.from("payment_blacklist").insert({ type: blForm.type, value: blForm.value.trim(), reason: blForm.reason || null });
    if (error) { toast.error("Erro"); return; }
    toast.success("Adicionado à lista negra");
    setBlForm({ type: "email", value: "", reason: "" });
    refetchBl();
  };

  const removeBlacklist = async (id: string) => {
    await supabase.from("payment_blacklist").delete().eq("id", id);
    toast.success("Removido");
    refetchBl();
  };

  const handleSave = () => { toast.success("Regras de antifraude salvas"); };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> Antifraude</h1>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Regras</TabsTrigger>
          <TabsTrigger value="score">Score</TabsTrigger>
          <TabsTrigger value="blacklist">Lista Negra</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Bloqueios automáticos</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><Label>Bloquear IP suspeito</Label><Switch checked={rules.blockIp} onCheckedChange={(v) => setRules({ ...rules, blockIp: v })} /></div>
                <div className="flex items-center justify-between"><Label>Bloquear cartão suspeito</Label><Switch checked={rules.blockCard} onCheckedChange={(v) => setRules({ ...rules, blockCard: v })} /></div>
                <div className="flex items-center justify-between"><Label>Bloquear país estrangeiro</Label><Switch checked={rules.blockCountry} onCheckedChange={(v) => setRules({ ...rules, blockCountry: v })} /></div>
                <div className="flex items-center justify-between"><Label>Bloquear email suspeito</Label><Switch checked={rules.blockSuspectEmail} onCheckedChange={(v) => setRules({ ...rules, blockSuspectEmail: v })} /></div>
                <div className="flex items-center justify-between"><Label>Bloquear CPF suspeito</Label><Switch checked={rules.blockSuspectCpf} onCheckedChange={(v) => setRules({ ...rules, blockSuspectCpf: v })} /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Limites</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Limite tentativas por IP</Label><Input value={rules.maxAttempts} onChange={(e) => setRules({ ...rules, maxAttempts: e.target.value })} type="number" /></div>
                <div className="space-y-2"><Label>Valor máximo (R$)</Label><Input value={rules.maxAmount} onChange={(e) => setRules({ ...rules, maxAmount: e.target.value })} type="number" /></div>
              </CardContent>
            </Card>
          </div>
          <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" /> Salvar regras</Button>
        </TabsContent>

        <TabsContent value="score" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Score Antifraude</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">O score é calculado com base em IP, frequência de compra, valor e histórico do cliente.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Score mínimo (bloqueado abaixo)</Label><Input value={rules.minScore} onChange={(e) => setRules({ ...rules, minScore: e.target.value })} type="number" /></div>
                <div className="space-y-2"><Label>Score revisão (revisar abaixo)</Label><Input value={rules.reviewScore} onChange={(e) => setRules({ ...rules, reviewScore: e.target.value })} type="number" /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
                  <AlertTriangle className="h-5 w-5 text-destructive mx-auto mb-1" />
                  <p className="text-sm font-medium">Score &lt; {rules.minScore}</p>
                  <p className="text-xs text-muted-foreground">Bloqueado</p>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-4 text-center">
                  <Shield className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                  <p className="text-sm font-medium">{rules.minScore}–{rules.reviewScore}</p>
                  <p className="text-xs text-muted-foreground">Revisar</p>
                </div>
                <div className="rounded-lg border border-green-500/30 bg-green-50 dark:bg-green-950/20 p-4 text-center">
                  <Shield className="h-5 w-5 text-green-600 mx-auto mb-1" />
                  <p className="text-sm font-medium">Score &gt; {rules.reviewScore}</p>
                  <p className="text-xs text-muted-foreground">Aprovado</p>
                </div>
              </div>
              <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" /> Salvar</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blacklist" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Adicionar à lista negra</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap items-end">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={blForm.type} onValueChange={(v) => setBlForm({ ...blForm, type: v })}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="ip">IP</SelectItem>
                      <SelectItem value="card">Cartão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-1 min-w-[200px]">
                  <Label>Valor</Label>
                  <Input value={blForm.value} onChange={(e) => setBlForm({ ...blForm, value: e.target.value })} placeholder="ex: 192.168.1.1" />
                </div>
                <div className="space-y-2 flex-1 min-w-[150px]">
                  <Label>Motivo</Label>
                  <Input value={blForm.reason} onChange={(e) => setBlForm({ ...blForm, reason: e.target.value })} placeholder="Fraude confirmada" />
                </div>
                <Button onClick={addBlacklist}><Plus className="h-4 w-4 mr-2" /> Adicionar</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Lista negra ({blacklist?.length || 0})</CardTitle></CardHeader>
            <CardContent>
              {!blacklist?.length ? (
                <p className="text-muted-foreground text-sm py-4 text-center">Lista vazia.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blacklist.map((b: any) => (
                      <TableRow key={b.id}>
                        <TableCell><Badge variant="outline" className="uppercase text-xs">{b.type}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{b.value}</TableCell>
                        <TableCell className="text-xs">{b.reason || "—"}</TableCell>
                        <TableCell className="text-xs">{new Date(b.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => removeBlacklist(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
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
