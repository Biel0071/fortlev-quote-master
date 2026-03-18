import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Webhook } from "lucide-react";

const EVENT_TYPES = ["payment.created", "payment.approved", "payment.failed", "payment.refunded"];

export default function AdminPaymentsWebhooks() {
  const { data: webhooks } = useQuery({
    queryKey: ["payment-webhooks"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_webhooks").select("*").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const fmtDate = (d: string) => new Date(d).toLocaleString("pt-BR");

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Webhook className="h-6 w-6 text-primary" /> Webhooks</h1>
      <Card>
        <CardHeader><CardTitle className="text-sm">Eventos suportados</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((e) => <Badge key={e} variant="outline">{e}</Badge>)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Logs</CardTitle></CardHeader>
        <CardContent>
          {!webhooks?.length ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhum evento registrado.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Evento</TableHead><TableHead>Source</TableHead><TableHead>Status</TableHead><TableHead>Response</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
              <TableBody>
                {webhooks.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-mono text-xs">{w.event}</TableCell>
                    <TableCell>{w.source}</TableCell>
                    <TableCell><Badge variant={w.status === "delivered" ? "default" : "destructive"}>{w.status}</Badge></TableCell>
                    <TableCell>{w.response_code || "—"}</TableCell>
                    <TableCell className="text-xs">{fmtDate(w.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
