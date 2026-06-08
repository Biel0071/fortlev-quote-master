import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, ExternalLink, ShieldCheck, ShieldAlert, Trash2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

const DomainsManager = () => {
  const queryClient = useQueryClient();
  const { data: domains, isLoading } = useQuery({
    queryKey: ['master-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_domains')
        .select(`
          *,
          stores (name, slug)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      // In a real scenario, this would call an Edge Function to check DNS
      const { error } = await supabase
        .from('store_domains')
        .update({ verified: true, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-domains'] });
      toast.success("Domínio verificado com sucesso (Simulado)");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('store_domains').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-domains'] });
      toast.success("Domínio removido");
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Gestão de Domínios</h2>
        <p className="text-muted-foreground">Monitore e configure domínios customizados para as lojas.</p>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domínio</TableHead>
              <TableHead>Loja / Slug</TableHead>
              <TableHead>Principal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Carregando domínios...</TableCell>
              </TableRow>
            ) : domains?.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-primary" />
                    {d.domain}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{d.stores?.name}</span>
                    <span className="text-xs text-muted-foreground">/{d.stores?.slug}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {d.is_primary ? (
                    <Badge variant="default" className="bg-blue-500">Sim</Badge>
                  ) : (
                    <Badge variant="secondary">Não</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={d.verified ? "default" : "destructive"} className={d.verified ? "bg-green-500" : ""}>
                    {d.verified ? (
                      <span className="flex items-center gap-1"><ShieldCheck size={12} /> Ativo</span>
                    ) : (
                      <span className="flex items-center gap-1"><ShieldAlert size={12} /> Pendente</span>
                    )}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {new Date(d.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => window.open(`https://${d.domain}`, '_blank')}>
                      <ExternalLink size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => verifyMutation.mutate(d.id)}
                      disabled={verifyMutation.isPending || d.verified}
                    >
                      <RefreshCcw size={16} className={verifyMutation.isPending ? "animate-spin" : ""} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`Remover domínio ${d.domain}?`)) {
                          deleteMutation.mutate(d.id);
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {domains?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">Nenhum domínio customizado encontrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DomainsManager;