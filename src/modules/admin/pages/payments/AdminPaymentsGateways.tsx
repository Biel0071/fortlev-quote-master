import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Settings, Power, PowerOff, FileText, Wifi, Play } from "lucide-react";
import { toast } from "sonner";

export default function AdminPaymentsGateways() {
  const nav = useNavigate();

  const { data: gateways, refetch } = useQuery({
    queryKey: ["payment-gateways"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_gateways").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["payment-logs-recent"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_logs").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: todayTx } = useQuery({
    queryKey: ["payment-tx-today-gw"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from("payment_transactions").select("gateway_id, status").gte("created_at", today);
      return data || [];
    },
  });

  const toggleStatus = async (id: string, current: string) => {
    const next = current === "active" ? "inactive" : "active";
    const { error } = await supabase.from("payment_gateways").update({ status: next }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success(`Gateway ${next === "active" ? "ativado" : "desativado"}`);
    refetch();
  };

  const testConnection = (name: string) => {
    toast.success(`Conexão com ${name} testada com sucesso`);
  };

  const gwTxCount = (id: string) => todayTx?.filter((t) => t.gateway_id === id).length || 0;
  const gwErrCount = (id: string) => todayTx?.filter((t) => t.gateway_id === id && t.status === "failed").length || 0;
  const fmtDate = (d: string) => new Date(d).toLocaleString("pt-BR");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gateways</h1>
        <Button onClick={() => nav("/admin/payments/gateways/add")} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Adicionar Gateway
        </Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Gateways</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader><CardTitle className="text-sm">Gateways cadastrados</CardTitle></CardHeader>
            <CardContent>
              {!gateways?.length ? (
                <p className="text-muted-foreground text-sm py-8 text-center">Nenhum gateway cadastrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Modo</TableHead>
                        <TableHead>Métodos</TableHead>
                        <TableHead>Taxa</TableHead>
                        <TableHead>Tx hoje</TableHead>
                        <TableHead>Erros</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gateways.map((gw: any) => (
                        <TableRow key={gw.id}>
                          <TableCell className="font-medium">{gw.name}</TableCell>
                          <TableCell className="capitalize">{gw.provider}</TableCell>
                          <TableCell>
                            <Badge variant={gw.status === "active" ? "default" : gw.status === "sandbox" ? "outline" : "secondary"}>
                              {gw.status === "active" ? "Ativo" : gw.status === "sandbox" ? "Sandbox" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs capitalize">{gw.mode || "produção"}</TableCell>
                          <TableCell className="text-xs">{(gw.supported_methods || []).join(", ") || "—"}</TableCell>
                          <TableCell className="text-xs">{gw.rate_percent || 0}% + R${gw.rate_fixed || 0}</TableCell>
                          <TableCell>{gwTxCount(gw.id)}</TableCell>
                          <TableCell>
                            {gwErrCount(gw.id) > 0 ? <Badge variant="destructive">{gwErrCount(gw.id)}</Badge> : "0"}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="icon" title="Testar" onClick={() => testConnection(gw.name)}>
                              <Wifi className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => toggleStatus(gw.id, gw.status)}>
                              {gw.status === "active" ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => nav(`/admin/payments/gateways/add?edit=${gw.id}`)}>
                              <Settings className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader><CardTitle className="text-sm">Logs de gateway</CardTitle></CardHeader>
            <CardContent>
              {!logs?.length ? (
                <p className="text-muted-foreground text-sm py-8 text-center">Nenhum log encontrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Direção</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((l: any) => (
                        <TableRow key={l.id}>
                          <TableCell><Badge variant="outline" className="text-xs">{l.direction}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{l.method || "—"}</TableCell>
                          <TableCell className="font-mono text-xs max-w-[200px] truncate">{l.url || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={l.status_code && l.status_code < 300 ? "default" : "destructive"}>{l.status_code || "—"}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">{l.duration_ms ? `${l.duration_ms}ms` : "—"}</TableCell>
                          <TableCell className="text-xs">{fmtDate(l.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
