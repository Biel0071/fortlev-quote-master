import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function AdminPaymentsCheckouts() {
  const { data: checkouts } = useQuery({
    queryKey: ["payment-checkouts"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_checkouts").select("*").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Checkouts</h1>
      <Card>
        <CardHeader><CardTitle className="text-sm">Checkouts criados</CardTitle></CardHeader>
        <CardContent>
          {!checkouts?.length ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhum checkout encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkouts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{fmt(Number(c.price))}</TableCell>
                    <TableCell>{c.template}</TableCell>
                    <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                    <TableCell>{fmtDate(c.created_at)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(c.id); toast.success("ID copiado"); }}><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button>
                    </TableCell>
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
