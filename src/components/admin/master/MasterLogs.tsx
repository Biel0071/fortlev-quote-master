import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, Activity, Terminal, ShieldAlert, Cpu, Bot, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


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

  const { data: automations } = useQuery({
    queryKey: ['master-automations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_automations')
        .select('*, stores(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Logs & Automações</h2>
          <p className="text-muted-foreground">Monitoramento técnico do motor de replicação e atividades de rede.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
            <Activity size={14} className="mr-1" /> Infra: Estável
          </Badge>
        </div>
      </header>

      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="activity" className="gap-2">
            <Terminal size={16} /> Atividade Global
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-2">
            <Zap size={16} /> Automation Engine
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <ShieldAlert size={16} /> Alertas de Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-6">
          <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input placeholder="Buscar por ID de loja, usuário ou tipo de ação..." className="pl-10" />
            </div>
          </div>

          <div className="rounded-md border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Evento</TableHead>
                  <TableHead>Tenant/Loja</TableHead>
                  <TableHead>IP / Contexto</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">Sincronizando logs...</TableCell>
                  </TableRow>
                ) : logs?.map((log) => (
                  <TableRow key={log.id} className="hover:bg-accent/5 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {log.action?.includes('blueprint') ? <Cpu size={14} className="text-blue-500" /> : <Activity size={14} className="text-muted-foreground" />}
                        {log.action || "System Access"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {log.stores?.name || "Plataforma Master"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{log.ip || "127.0.0.1"}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">200 OK</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="automations" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {automations?.map((auto) => (
              <Card key={auto.id} className="border-l-4 border-l-yellow-500">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-600">
                      <Zap size={20} />
                    </div>
                    <Badge variant={auto.is_active ? "default" : "secondary"}>
                      {auto.is_active ? "Monitorando" : "Inativo"}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-4">{auto.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Trigger: </span>
                    <span className="font-mono bg-muted px-1 rounded">{auto.trigger_type}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Ação: </span>
                    <span className="font-mono bg-muted px-1 rounded">{auto.action_type}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Loja: </span>
                    <span className="font-bold">{(auto.stores as any)?.name}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {automations?.length === 0 && (
              <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl">
                <Bot className="mx-auto mb-4 text-muted-foreground opacity-20" size={48} />
                <p className="text-muted-foreground italic">Nenhuma automação configurada no engine.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MasterLogs;
