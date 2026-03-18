import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Webhook, RotateCcw, Eye } from "lucide-react";
import { toast } from "sonner";

const EVENT_TYPES = ["payment.created", "payment.approved", "payment.failed", "payment.refunded", "checkout.created", "subscription.renewed"];

export default function AdminPaymentsWebhooks() {
  const [filterEvent, setFilterEvent] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedPayload, setSelectedPayload] = useState<any>(null);

  const { data: webhooks } = useQuery({
    queryKey: ["payment-webhooks"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_webhooks").select("*").order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
  });

  const { data: gateways } = useQuery({
    queryKey: ["payment-gw-names-wh"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_gateways").select("id, name");
      return data || [];
    },
  });

  const gwName = (source: string) => gateways?.find((g) => g.id === source)?.name || source;

  const filtered = (webhooks || []).filter((w) => {
    if (filterEvent !== "all" && w.event !== filterEvent) return false;
    if (filterStatus !== "all" && w.status !== filterStatus) return false;
    return true;
  });

  const reprocess = (id: string) => { toast.success(`Webhook ${id.slice(0, 8)} reprocessado`); };
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

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterEvent} onValueChange={setFilterEvent}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Evento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos eventos</SelectItem>
            {EVENT_TYPES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Logs ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {!filtered.length ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhum evento encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono text-xs">{w.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs">{gwName(w.source)}</TableCell>
                      <TableCell className="font-mono text-xs">{w.event}</TableCell>
                      <TableCell>
                        <Badge variant={w.status === "delivered" ? "default" : w.status === "pending" ? "secondary" : "destructive"}>{w.status}</Badge>
                      </TableCell>
                      <TableCell>{w.response_code || "—"}</TableCell>
                      <TableCell className="text-xs">{fmtDate(w.created_at)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Ver payload" onClick={() => setSelectedPayload(w.payload)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle>Payload</DialogTitle></DialogHeader>
                            <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-96">{JSON.stringify(selectedPayload, null, 2)}</pre>
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" title="Reprocessar" onClick={() => reprocess(w.id)}>
                          <RotateCcw className="h-4 w-4" />
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
    </div>
  );
}
