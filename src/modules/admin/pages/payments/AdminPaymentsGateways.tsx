import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Settings, Power, PowerOff } from "lucide-react";
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

  const toggleStatus = async (id: string, current: string) => {
    const next = current === "active" ? "inactive" : "active";
    const { error } = await supabase.from("payment_gateways").update({ status: next }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success(`Gateway ${next === "active" ? "ativado" : "desativado"}`);
    refetch();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gateways</h1>
        <Button onClick={() => nav("/admin/payments/gateways/add")} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Adicionar Gateway
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Gateways cadastrados</CardTitle></CardHeader>
        <CardContent>
          {!gateways?.length ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhum gateway cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gateways.map((gw) => (
                  <TableRow key={gw.id}>
                    <TableCell className="font-medium">{gw.name}</TableCell>
                    <TableCell>{gw.provider}</TableCell>
                    <TableCell>
                      <Badge variant={gw.status === "active" ? "default" : "secondary"}>
                        {gw.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
