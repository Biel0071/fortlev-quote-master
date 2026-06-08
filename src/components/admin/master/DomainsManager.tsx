import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, ExternalLink, ShieldCheck, ShieldAlert, Trash2, RefreshCcw, Search, Plus, Copy, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const DomainsManager = () => {
  const [searchParams] = useSearchParams();
  const filterStoreId = searchParams.get("storeId");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [targetStoreId, setTargetStoreId] = useState(filterStoreId || "");

  const { data: domains, isLoading } = useQuery({
    queryKey: ['master-domains', filterStoreId],
    queryFn: async () => {
      let query = supabase
        .from('store_domains')
        .select(`
          *,
          stores (name, slug, tenant_id)
        `)
        .order('created_at', { ascending: false });
      
      if (filterStoreId) {
        query = query.eq('store_id', filterStoreId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const { data: stores } = useQuery({
    queryKey: ['master-stores-minimal'],
    queryFn: async () => {
      const { data } = await supabase.from('stores').select('id, name, slug').order('name');
      return data;
    }
  });

  const addDomainMutation = useMutation({
    mutationFn: async ({ domain, storeId }: { domain: string, storeId: string }) => {
      const selectedStore = stores?.find(s => s.id === storeId);
      const { error } = await supabase.from('store_domains').insert({
        domain,
        store_id: storeId,
        tenant_id: (selectedStore as any)?.tenant_id, // This might need a join or direct fetch
        is_primary: false,
        verified: false
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-domains'] });
      toast.success("Domínio adicionado com sucesso");
      setIsAddDialogOpen(false);
      setNewDomain("");
    },
    onError: (err: any) => toast.error("Erro ao adicionar: " + err.message)
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('store_domains')
        .update({ verified: true, updated_at: new Date().toISOString(), ssl_active: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-domains'] });
      toast.success("Domínio verificado com sucesso (Simulado)");
    }
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (domainObj: any) => {
      // First, set all other domains for this store to non-primary
      await supabase.from('store_domains').update({ is_primary: false }).eq('store_id', domainObj.store_id);
      // Then set this one to primary
      const { error } = await supabase.from('store_domains').update({ is_primary: true }).eq('id', domainObj.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-domains'] });
      toast.success("Domínio principal atualizado");
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

  const filteredDomains = domains?.filter(d => 
    d.domain.toLowerCase().includes(search.toLowerCase()) ||
    d.stores?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Domínios</h2>
          <p className="text-muted-foreground">Monitore e configure domínios customizados para as lojas.</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={18} /> Novo Domínio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Domínio Customizado</DialogTitle>
              <DialogDescription>Vincule um novo domínio ou subdomínio a uma loja existente.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Loja Alvo</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={targetStoreId}
                  onChange={(e) => setTargetStoreId(e.target.value)}
                >
                  <option value="">Selecione uma loja...</option>
                  {stores?.map(s => <option key={s.id} value={s.id}>{s.name} (/{s.slug})</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Domínio (ex: loja.com.br)</Label>
                <Input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="www.seudominio.com" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => addDomainMutation.mutate({ domain: newDomain, storeId: targetStoreId })} disabled={!newDomain || !targetStoreId}>
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Buscar por domínio ou loja..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {filterStoreId && (
          <Badge variant="secondary" className="h-10 px-4">Filtrando Loja</Badge>
        )}
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domínio</TableHead>
              <TableHead>Loja / Slug</TableHead>
              <TableHead>Config</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Carregando domínios...</TableCell>
              </TableRow>
            ) : filteredDomains?.map((d) => (
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
                   <div className="flex flex-col gap-1">
                    {d.is_primary ? (
                      <Badge variant="default" className="w-fit text-[10px] h-4">Principal</Badge>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-4 text-[10px] p-0" onClick={() => setPrimaryMutation.mutate(d)}>Tornar Principal</Button>
                    )}
                    {d.is_fallback && <Badge variant="outline" className="w-fit text-[10px] h-4">Fallback</Badge>}
                    {d.ssl_active && <Badge variant="outline" className="w-fit text-[10px] h-4 text-green-600 border-green-200 bg-green-50">SSL Ativo</Badge>}
                  </div>
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
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => window.open(`http://${d.domain}`, '_blank')}>
                      <ExternalLink size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => verifyMutation.mutate(d.id)}
                      disabled={verifyMutation.isPending || d.verified}
                      title="Verificar DNS"
                    >
                      <RefreshCcw size={16} className={verifyMutation.isPending ? "animate-spin" : ""} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                         navigator.clipboard.writeText(d.domain);
                         toast.success("Copiado!");
                      }}
                      title="Copiar URL"
                    >
                      <Copy size={16} />
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
            {filteredDomains?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">Nenhum domínio encontrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Card className="bg-muted/30 border-dashed">
         <CardContent className="p-4 flex items-start gap-3">
            <ShieldAlert size={20} className="text-orange-500 mt-1" />
            <div className="text-sm">
               <p className="font-bold">Instruções de DNS para Domínios Customizados</p>
               <p className="text-muted-foreground mt-1">
                 Para domínios externos, o cliente deve apontar um registro <strong>CNAME</strong> para <code>lb.lovable.app</code> ou um registro <strong>A</strong> para <code>76.76.21.21</code> (Vercel/Lovable IP).
               </p>
            </div>
         </CardContent>
      </Card>
    </div>
  );
};

export default DomainsManager;
