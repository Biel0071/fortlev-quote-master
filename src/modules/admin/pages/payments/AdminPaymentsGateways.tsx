import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PlugZap, MoreVertical, Settings, Trash2, Wifi, WifiOff, Power, Activity,
  CheckCircle2, XCircle, AlertTriangle, Clock, Server, Zap, Eye,
} from "lucide-react";
import { toast } from "sonner";

type GatewayFilter = "all" | "active" | "inactive" | "production" | "sandbox";

function healthIndicator(txCount: number, errCount: number) {
  if (txCount === 0 && errCount === 0) return { label: "Sem dados", color: "text-muted-foreground", icon: Clock };
  const rate = errCount / Math.max(txCount, 1);
  if (rate > 0.3) return { label: "Falha", color: "text-destructive", icon: XCircle };
  if (rate > 0.1) return { label: "Instável", color: "text-yellow-500", icon: AlertTriangle };
  return { label: "Saudável", color: "text-green-500", icon: CheckCircle2 };
}

export default function AdminPaymentsGateways() {
  const nav = useNavigate();
  const [filter, setFilter] = useState<GatewayFilter>("all");
  const [toggleTarget, setToggleTarget] = useState<{ id: string; name: string; current: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [testResult, setTestResult] = useState<{ name: string; ok: boolean; latency: number } | null>(null);
  const [testPayDialog, setTestPayDialog] = useState(false);
  const [testPayAmount, setTestPayAmount] = useState("10");
  const [testPayMethod, setTestPayMethod] = useState("pix");
  const [testPayLoading, setTestPayLoading] = useState(false);
  const [logPayload, setLogPayload] = useState<any>(null);

  const { data: gateways, refetch } = useQuery({
    queryKey: ["payment-gateways"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_gateways").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: webhooks } = useQuery({
    queryKey: ["payment-webhooks-recent"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_webhooks").select("*").order("created_at", { ascending: false }).limit(50);
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

  const activeGw = gateways?.find((g: any) => g.status === "active");
  const txToday = todayTx?.length || 0;
  const errToday = todayTx?.filter((t: any) => t.status === "failed").length || 0;
  const lastWebhook = webhooks?.[0];

  const gwTxCount = (id: string) => todayTx?.filter((t: any) => t.gateway_id === id).length || 0;
  const gwErrCount = (id: string) => todayTx?.filter((t: any) => t.gateway_id === id && t.status === "failed").length || 0;
  const fmtDate = (d: string) => new Date(d).toLocaleString("pt-BR");
  const fmtRelative = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000) return "agora";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const confirmToggle = async () => {
    if (!toggleTarget) return;
    const next = toggleTarget.current === "active" ? "inactive" : "active";
    const { error } = await supabase.from("payment_gateways").update({ status: next }).eq("id", toggleTarget.id);
    if (error) { toast.error("Erro ao atualizar"); setToggleTarget(null); return; }
    toast.success(`Gateway ${next === "active" ? "ativado" : "desativado"}`);
    setToggleTarget(null);
    refetch();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("payment_gateways").delete().eq("id", deleteTarget.id);
    if (error) { toast.error("Erro ao remover gateway"); setDeleteTarget(null); return; }
    toast.success("Gateway removido");
    setDeleteTarget(null);
    refetch();
  };

  const testConnection = async (name: string) => {
    const start = Date.now();
    try {
      const { error } = await supabase.functions.invoke("allowpay-payment-status", {
        body: { payment_id: "test-ping" },
      });
      const latency = Date.now() - start;
      setTestResult({ name, ok: !error, latency });
    } catch {
      setTestResult({ name, ok: false, latency: Date.now() - start });
    }
  };

  const runTestPayment = async () => {
    setTestPayLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("allowpay-create-payment", {
        body: {
          amount: parseFloat(testPayAmount),
          currency: "BRL",
          payment_method: testPayMethod,
          customer: { name: "Teste Sistema", email: "teste@sistema.com" },
          metadata: { order_id: "test-" + Date.now() },
        },
      });
      if (error) throw error;
      toast.success("Pagamento teste criado!");
      setTestPayDialog(false);
      if (data?.qr_code) toast.info("QR Code PIX gerado com sucesso");
    } catch (e: any) {
      toast.error("Erro: " + (e.message || "falha no teste"));
    } finally {
      setTestPayLoading(false);
    }
  };

  const filtered = gateways?.filter((gw: any) => {
    if (filter === "active") return gw.status === "active";
    if (filter === "inactive") return gw.status === "inactive";
    if (filter === "production") return gw.mode === "production";
    if (filter === "sandbox") return gw.mode === "sandbox";
    return true;
  });

  const methodLabel = (m: string) => m.toUpperCase();

  return (
    <div className="p-6 space-y-6">
      {/* Status header */}
      <div>
        <h1 className="text-2xl font-bold mb-1">Pagamentos</h1>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            {activeGw ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
            API {activeGw ? activeGw.name : "—"}: {activeGw ? "online" : "offline"}
          </span>
          <span className="flex items-center gap-1">
            {lastWebhook ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
            Webhook: {lastWebhook ? "funcionando" : "sem eventos"}
          </span>
          {lastWebhook && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Último evento: {fmtRelative(lastWebhook.created_at)}
            </span>
          )}
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground mb-1">Gateway ativo</p>
            <p className="text-lg font-bold flex items-center gap-2">
              {activeGw ? (
                <><CheckCircle2 className="h-4 w-4 text-green-500" /> {activeGw.name}</>
              ) : (
                <><XCircle className="h-4 w-4 text-destructive" /> Nenhum</>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground mb-1">Métodos ativos</p>
            <p className="text-lg font-bold">
              {activeGw ? (activeGw.supported_methods || []).map(methodLabel).join(" / ") : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground mb-1">Transações hoje</p>
            <p className="text-lg font-bold">{txToday}</p>
            {errToday > 0 && <p className="text-xs text-destructive">{errToday} erros</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground mb-1">Status API</p>
            <p className="text-lg font-bold flex items-center gap-2">
              {activeGw ? (
                <><Activity className="h-4 w-4 text-green-500" /> Online</>
              ) : (
                <><WifiOff className="h-4 w-4 text-destructive" /> Offline</>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => nav("/admin/payments/gateways/add")} size="sm">
          <PlugZap className="h-4 w-4 mr-2" /> Conectar Gateway
        </Button>
        <Button variant="outline" size="sm" onClick={() => setTestPayDialog(true)}>
          <Zap className="h-4 w-4 mr-2" /> Criar pagamento teste
        </Button>
        <div className="ml-auto">
          <Select value={filter} onValueChange={(v) => setFilter(v as GatewayFilter)}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Desativados</SelectItem>
              <SelectItem value="production">Produção</SelectItem>
              <SelectItem value="sandbox">Sandbox</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="gateways">
        <TabsList>
          <TabsTrigger value="gateways">Gateways</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* Gateways tab */}
        <TabsContent value="gateways">
          {!filtered?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Server className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nenhum gateway encontrado.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:hidden">
              {filtered.map((gw: any) => {
                const h = healthIndicator(gwTxCount(gw.id), gwErrCount(gw.id));
                return (
                  <Card key={gw.id}>
                    <CardContent className="pt-4 pb-3 px-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{gw.name}</span>
                        <Badge variant={gw.status === "active" ? "default" : "secondary"}>
                          {gw.status === "active" ? "🟢 Ativo" : "🔴 Inativo"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{gw.mode === "sandbox" ? "Sandbox" : "Produção"}</span>
                        <span>{(gw.supported_methods || []).map(methodLabel).join(" / ")}</span>
                        <span>{gw.rate_percent || 0}%</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span>Hoje: {gwTxCount(gw.id)}</span>
                        <span className={h.color}><h.icon className="h-3 w-3 inline mr-0.5" />{h.label}</span>
                      </div>
                      <div className="flex gap-1 pt-1">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => testConnection(gw.name)}>Testar</Button>
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => setToggleTarget({ id: gw.id, name: gw.name, current: gw.status })}>
                          {gw.status === "active" ? "Desativar" : "Ativar"}
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => nav(`/admin/payments/gateways/add?edit=${gw.id}`)}>Editar</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {filtered && filtered.length > 0 && (
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gateway</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ambiente</TableHead>
                      <TableHead>Métodos</TableHead>
                      <TableHead>Taxa</TableHead>
                      <TableHead>Hoje</TableHead>
                      <TableHead>Saúde</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((gw: any) => {
                      const h = healthIndicator(gwTxCount(gw.id), gwErrCount(gw.id));
                      return (
                        <TableRow key={gw.id}>
                          <TableCell className="font-medium">{gw.name}</TableCell>
                          <TableCell>
                            <Badge variant={gw.status === "active" ? "default" : "secondary"} className="text-xs">
                              {gw.status === "active" ? "🟢 Ativo" : "🔴 Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs capitalize">{gw.mode === "sandbox" ? "Sandbox" : "Produção"}</TableCell>
                          <TableCell className="text-xs">{(gw.supported_methods || []).map(methodLabel).join(" / ")}</TableCell>
                          <TableCell className="text-xs">{gw.rate_percent || 0}% + R${gw.rate_fixed || 0}</TableCell>
                          <TableCell className="text-sm font-medium">{gwTxCount(gw.id)}</TableCell>
                          <TableCell>
                            <span className={`flex items-center gap-1 text-xs ${h.color}`}>
                              <h.icon className="h-3.5 w-3.5" /> {h.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => nav(`/admin/payments/gateways/add?edit=${gw.id}`)}>
                                  <Settings className="h-4 w-4 mr-2" /> Editar gateway
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => testConnection(gw.name)}>
                                  <Wifi className="h-4 w-4 mr-2" /> Testar conexão
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  const tab = document.querySelector('[data-value="logs"]') as HTMLElement;
                                  tab?.click();
                                }}>
                                  <Eye className="h-4 w-4 mr-2" /> Ver logs
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setToggleTarget({ id: gw.id, name: gw.name, current: gw.status })}>
                                  <Power className="h-4 w-4 mr-2" />
                                  {gw.status === "active" ? "Desativar" : "Ativar"}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget({ id: gw.id, name: gw.name })}>
                                  <Trash2 className="h-4 w-4 mr-2" /> Remover
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Logs tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader><CardTitle className="text-sm">Logs recentes</CardTitle></CardHeader>
            <CardContent>
              {!logs?.length ? (
                <p className="text-muted-foreground text-sm py-8 text-center">Nenhum log encontrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Gateway</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((l: any) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs">{fmtDate(l.created_at)}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline">{l.direction === "inbound" ? "Webhook" : "API"}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{l.method} {l.url ? l.url.split("/").pop() : "—"}</TableCell>
                          <TableCell>
                            <Badge variant={l.status_code && l.status_code < 300 ? "default" : "destructive"} className="text-xs">
                              {l.status_code || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{l.duration_ms ? `${l.duration_ms}ms` : "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setLogPayload(l)}>
                              <Eye className="h-3.5 w-3.5 mr-1" /> Ver
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
      </Tabs>

      {/* Toggle confirmation */}
      <AlertDialog open={!!toggleTarget} onOpenChange={() => setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.current === "active" ? "Desativar" : "Ativar"} gateway {toggleTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.current === "active"
                ? "Pagamentos não poderão ser processados por este gateway enquanto estiver desativado."
                : "O gateway voltará a processar pagamentos."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover gateway {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todas as configurações deste gateway serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={confirmDelete}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Test connection result */}
      <Dialog open={!!testResult} onOpenChange={() => setTestResult(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Teste de conexão — {testResult?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 py-4">
            {testResult?.ok ? (
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            ) : (
              <XCircle className="h-8 w-8 text-destructive" />
            )}
            <div>
              <p className="font-medium">{testResult?.ok ? "API respondendo" : "Falha na conexão"}</p>
              <p className="text-xs text-muted-foreground">Latência: {testResult?.latency}ms</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestResult(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test payment dialog */}
      <Dialog open={testPayDialog} onOpenChange={setTestPayDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Criar pagamento teste</DialogTitle>
            <DialogDescription>Simular um pagamento para testar a integração.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Valor (R$)</label>
              <Input type="number" value={testPayAmount} onChange={(e) => setTestPayAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium">Método</label>
              <Select value={testPayMethod} onValueChange={setTestPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="card">Cartão</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestPayDialog(false)}>Cancelar</Button>
            <Button onClick={runTestPayment} disabled={testPayLoading}>
              {testPayLoading ? "Criando..." : "Criar pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log payload viewer */}
      <Dialog open={!!logPayload} onOpenChange={() => setLogPayload(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Payload do log</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Request</p>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(logPayload?.request_body, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Response</p>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(logPayload?.response_body, null, 2)}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogPayload(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
