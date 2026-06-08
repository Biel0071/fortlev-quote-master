import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Activity, AlertCircle, Info, AlertTriangle, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

const MasterLogs = () => {
  const [searchParams] = useSearchParams();
  const filterStoreId = searchParams.get("storeId");
  const [search, setSearch] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ['system-logs', filterStoreId],
    queryFn: async () => {
      let query = supabase
        .from('system_event_logs')
        .select(`
          *,
          tenants (name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (filterStoreId) {
        query = query.filter('metadata->>store_id', 'eq', filterStoreId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return <ShieldAlert className="text-red-600" size={14} />;
      case 'error': return <AlertCircle className="text-red-500" size={14} />;
      case 'warning': return <AlertTriangle className="text-yellow-500" size={14} />;
      default: return <Info className="text-blue-500" size={14} />;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'critical': return <Badge variant="destructive">CRÍTICO</Badge>;
      case 'error': return <Badge variant="destructive">ERRO</Badge>;
      case 'warning': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">AVISO</Badge>;
      default: return <Badge variant="outline">INFO</Badge>;
    }
  };

  const filteredLogs = logs?.filter(log => 
    log.message.toLowerCase().includes(search.toLowerCase()) ||
    log.event_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Logs do Sistema</h2>
        <p className="text-muted-foreground">Monitoramento global de atividades e auditoria técnica.</p>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Buscar logs por mensagem ou tipo..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {filterStoreId && (
          <Badge variant="secondary" className="h-10 px-4 gap-2">
            Filtrando por Loja <span className="font-mono text-[10px]">{filterStoreId.slice(0, 8)}...</span>
          </Badge>
        )}
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Data/Hora</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead className="text-right">Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Carregando logs...</TableCell>
              </TableRow>
            ) : filteredLogs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">Nenhum log encontrado.</TableCell>
              </TableRow>
            ) : filteredLogs?.map((log) => (
              <TableRow key={log.id} className="text-xs">
                <TableCell className="font-mono text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getLevelIcon(log.level)}
                    {getLevelBadge(log.level)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono bg-muted/50 uppercase text-[10px]">
                    {log.event_type}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[300px] truncate font-medium">
                  {log.message}
                </TableCell>
                <TableCell>
                   <Badge variant="secondary" className="text-[10px]">{log.source}</Badge>
                </TableCell>
                <TableCell className="text-right">
                   <pre className="text-[9px] text-muted-foreground overflow-hidden max-w-[150px] inline-block">
                     {JSON.stringify(log.metadata)}
                   </pre>
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
