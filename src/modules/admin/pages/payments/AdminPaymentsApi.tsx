import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Key } from "lucide-react";
import { toast } from "sonner";

const ENDPOINTS = [
  { method: "POST", path: "/payments/create", description: "Criar pagamento" },
  { method: "POST", path: "/payments/refund", description: "Solicitar reembolso" },
  { method: "GET", path: "/payments/status", description: "Consultar status" },
];

export default function AdminPaymentsApi() {
  const { data: apiKeys } = useQuery({
    queryKey: ["payment-api-keys"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_api_keys").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Key className="h-6 w-6 text-primary" /> Desenvolvedor</h1>
      <Card>
        <CardHeader><CardTitle className="text-sm">API Keys</CardTitle></CardHeader>
        <CardContent>
          {!apiKeys?.length ? (
            <p className="text-muted-foreground text-sm py-4 text-center">Nenhuma chave cadastrada.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Prefixo</TableHead><TableHead>Status</TableHead><TableHead>Último uso</TableHead></TableRow></TableHeader>
              <TableBody>
                {apiKeys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell className="font-mono text-xs">{k.key_prefix}...</TableCell>
                    <TableCell><Badge variant={k.active ? "default" : "secondary"}>{k.active ? "Ativa" : "Inativa"}</Badge></TableCell>
                    <TableCell className="text-xs">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString("pt-BR") : "Nunca"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Endpoints</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Método</TableHead><TableHead>Endpoint</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Copiar</TableHead></TableRow></TableHeader>
            <TableBody>
              {ENDPOINTS.map((ep) => (
                <TableRow key={ep.path}>
                  <TableCell><Badge variant={ep.method === "POST" ? "default" : "secondary"}>{ep.method}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{ep.path}</TableCell>
                  <TableCell>{ep.description}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(ep.path); toast.success("Copiado"); }}><Copy className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
