import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Activity } from "lucide-react";

const MasterLogs = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['master-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          stores (name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Logs do Sistema</h2>
        <p className="text-muted-foreground">Monitoramento em tempo real de todas as atividades da plataforma.</p>
      </header>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input placeholder="Filtrar logs..." className="pl-10" />
        </div>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>IP / Destino</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Carregando logs...</TableCell>
              </TableRow>
            ) : logs?.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-muted-foreground" />
                    {log.action || "Acesso ao Sistema"}
                  </div>
                </TableCell>
                <TableCell>{log.stores?.name || "Global"}</TableCell>
                <TableCell className="text-xs">{log.user_id ? log.user_id.substring(0, 8) : "Visitante"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{log.ip || "127.0.0.1"}</TableCell>
                <TableCell className="text-xs">
                  {new Date(log.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">Success</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MasterLogs;
