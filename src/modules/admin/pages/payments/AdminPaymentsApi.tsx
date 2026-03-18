import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Key, BookOpen, TestTube, Play, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const ENDPOINTS = [
  { method: "POST", path: "/payments/create", description: "Criar pagamento" },
  { method: "POST", path: "/payments/refund", description: "Solicitar reembolso" },
  { method: "GET", path: "/payments/:id", description: "Consultar transação por ID" },
  { method: "GET", path: "/payments/status", description: "Status do serviço" },
  { method: "POST", path: "/checkouts/create", description: "Criar link de checkout" },
  { method: "POST", path: "/webhooks/:gateway", description: "Receber webhook do gateway" },
];

const PERMISSIONS = ["create_payment", "refund_payment", "read_payment", "manage_checkouts", "manage_subscriptions"];

export default function AdminPaymentsApi() {
  const [sandboxResult, setSandboxResult] = useState<string | null>(null);

  const { data: apiKeys } = useQuery({
    queryKey: ["payment-api-keys"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_api_keys").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const simulate = (type: string) => {
    const results: Record<string, any> = {
      approved: { status: "approved", transaction_id: crypto.randomUUID().slice(0, 12), amount: 150.0, method: "pix" },
      failed: { status: "failed", error: "insufficient_funds", transaction_id: crypto.randomUUID().slice(0, 12) },
      webhook: { event: "payment.approved", payload: { transaction_id: crypto.randomUUID().slice(0, 12), amount: 250.0 } },
    };
    setSandboxResult(JSON.stringify(results[type] || {}, null, 2));
    toast.success(`Simulação: ${type}`);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Key className="h-6 w-6 text-primary" /> Desenvolvedor</h1>

      <Tabs defaultValue="keys">
        <TabsList>
          <TabsTrigger value="keys"><Key className="h-3.5 w-3.5 mr-1" /> API Keys</TabsTrigger>
          <TabsTrigger value="docs"><BookOpen className="h-3.5 w-3.5 mr-1" /> Documentação</TabsTrigger>
          <TabsTrigger value="sandbox"><TestTube className="h-3.5 w-3.5 mr-1" /> Sandbox</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">API Keys</CardTitle></CardHeader>
            <CardContent>
              {!apiKeys?.length ? (
                <p className="text-muted-foreground text-sm py-4 text-center">Nenhuma chave cadastrada.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Prefixo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Permissões</TableHead>
                      <TableHead>Último uso</TableHead>
                      <TableHead>Criação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.name}</TableCell>
                        <TableCell className="font-mono text-xs">{k.key_prefix}...</TableCell>
                        <TableCell><Badge variant={k.active ? "default" : "secondary"}>{k.active ? "Ativa" : "Inativa"}</Badge></TableCell>
                        <TableCell className="text-xs">
                          {Array.isArray(k.permissions) ? (k.permissions as string[]).join(", ") : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString("pt-BR") : "Nunca"}</TableCell>
                        <TableCell className="text-xs">{new Date(k.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Permissões disponíveis</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {PERMISSIONS.map((p) => <Badge key={p} variant="outline" className="font-mono text-xs">{p}</Badge>)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Endpoints da API</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Método</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Copiar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ENDPOINTS.map((ep) => (
                    <TableRow key={ep.path}>
                      <TableCell><Badge variant={ep.method === "POST" ? "default" : "secondary"}>{ep.method}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{ep.path}</TableCell>
                      <TableCell className="text-sm">{ep.description}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(ep.path); toast.success("Copiado"); }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Exemplo de request</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-md overflow-auto">{`POST /payments/create
Content-Type: application/json
Authorization: Bearer sk_live_...

{
  "amount": 150.00,
  "method": "pix",
  "customer": {
    "name": "João Silva",
    "email": "joao@email.com",
    "cpf": "123.456.789-00"
  },
  "description": "Pedido #1234"
}`}</pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sandbox" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Simulador</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Simule respostas da API para testar integrações.</p>
              <div className="flex gap-3 flex-wrap">
                <Button variant="outline" onClick={() => simulate("approved")}>
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" /> Pagamento Aprovado
                </Button>
                <Button variant="outline" onClick={() => simulate("failed")}>
                  <XCircle className="h-4 w-4 mr-2 text-destructive" /> Pagamento Recusado
                </Button>
                <Button variant="outline" onClick={() => simulate("webhook")}>
                  <Play className="h-4 w-4 mr-2" /> Simular Webhook
                </Button>
              </div>
              {sandboxResult && (
                <pre className="text-xs bg-muted p-4 rounded-md overflow-auto">{sandboxResult}</pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
