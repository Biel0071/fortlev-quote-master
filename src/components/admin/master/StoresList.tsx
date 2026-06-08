import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreHorizontal, ExternalLink, Copy, Trash2, Archive, History, Layers, Settings, Globe, Cpu, Sparkles, Activity, CreditCard, ShieldCheck } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import StoreFactory from "./StoreFactory";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useBlueprintManager } from "@/hooks/useBlueprintManager";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";



const StoresList = () => {
  const [search, setSearch] = useState("");
  const [isFactoryOpen, setIsFactoryOpen] = useState(false);
  const [isSnapshotDialogOpen, setIsSnapshotDialogOpen] = useState(false);
  const [selectedStoreForSnapshot, setSelectedStoreForSnapshot] = useState<any>(null);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const { saveStoreAsBlueprint, loading: savingBp } = useBlueprintManager();
  const queryClient = useQueryClient();
  const navigate = useNavigate();



  const { data: stores, isLoading } = useQuery({
    queryKey: ['master-stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select(`
          *,
          tenants (
            id,
            name,
            saas_subscriptions (
              status,
              saas_plans (name)
            )
          ),
          store_domains (domain, is_primary, verified)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stores').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-stores'] });
      toast.success("Loja removida com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao remover loja: " + error.message);
    }
  });

  const filteredStores = stores?.filter(store => 
    store.name.toLowerCase().includes(search.toLowerCase()) ||
    store.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Lojas</h2>
          <p className="text-muted-foreground">Administre todas as lojas criadas na plataforma.</p>
        </div>
        <Dialog open={isFactoryOpen} onOpenChange={setIsFactoryOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={18} />
              Nova Loja
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <StoreFactory onSuccess={() => {
              setIsFactoryOpen(false);
              queryClient.invalidateQueries({ queryKey: ['master-stores'] });
            }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Buscar loja por nome ou slug..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome / Slug</TableHead>
              <TableHead>Tenant / Plano</TableHead>
              <TableHead>Domínio</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data Criação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando lojas...</TableCell>
              </TableRow>
            ) : filteredStores?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma loja encontrada.</TableCell>
              </TableRow>
            ) : filteredStores?.map((store) => (
              <TableRow key={store.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{store.name}</p>
                    <p className="text-xs text-muted-foreground">/{store.slug}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{store.tenants?.name || "N/A"}</span>
                    {store.tenants?.saas_subscriptions?.[0] && (
                      <Badge variant="outline" className="w-fit text-[10px] py-0">
                        {store.tenants.saas_subscriptions[0].saas_plans?.name} - {store.tenants.saas_subscriptions[0].status}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm">{store.store_domains?.[0]?.domain || `${store.slug}.plataforma.com`}</span>
                    {store.store_domains?.[0] && (
                      <Badge variant={store.store_domains[0].verified ? "default" : "secondary"} className="w-fit text-[10px] py-0 bg-green-500/10 text-green-600 border-green-200">
                        {store.store_domains[0].verified ? "Verificado" : "Pendente"}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={store.active ? "default" : "secondary"}>
                    {store.active ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {new Date(store.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal size={18} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações Master</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => navigate(`/admin/master/stores/${store.id}`)}>
                        <Settings size={14} className="mr-2" /> Cockpit da Loja
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(`/${store.slug}`, '_blank')}>
                        <ExternalLink size={14} className="mr-2" /> Abrir Loja Pública
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/admin/store/${store.id}/dashboard`)}>
                        <ShieldCheck size={14} className="mr-2 text-primary" /> Entrar no Admin
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate(`/admin/master/domains?storeId=${store.id}`)}>
                        <Globe size={14} className="mr-2" /> Gerenciar Domínios
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/admin/master/modules?storeId=${store.id}`)}>
                        <Cpu size={14} className="mr-2" /> Gerenciar Módulos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/admin/master/ia?storeId=${store.id}`)}>
                        <Sparkles size={14} className="mr-2" /> Gerenciar IA
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/admin/master/logs?storeId=${store.id}`)}>
                        <Activity size={14} className="mr-2" /> Ver Logs
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/admin/master/plans?tenantId=${store.tenant_id}`)}>
                        <CreditCard size={14} className="mr-2" /> Ver Plano/Assinatura
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        setSelectedStoreForSnapshot(store);
                        setSnapshotLabel(`v1.0 - ${new Date().toLocaleDateString()}`);
                        setIsSnapshotDialogOpen(true);
                      }}>
                        <Layers size={14} className="mr-2" /> Salvar como Blueprint
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy size={14} className="mr-2" /> Clonar Loja
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Archive size={14} className="mr-2" /> Arquivar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`Remover permanentemente a loja ${store.name}?`)) {
                            deleteMutation.mutate(store.id);
                          }
                        }}
                      >
                        <Trash2 size={14} className="mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isSnapshotDialogOpen} onOpenChange={setIsSnapshotDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Blueprint de {selectedStoreForSnapshot?.name}</DialogTitle>
            <DialogDescription>
              Isso capturará categorias, banners, páginas, tema, módulos e IA desta loja para um modelo replicável.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="snap-label">Etiqueta da Versão</Label>
              <Input 
                id="snap-label" 
                value={snapshotLabel} 
                onChange={(e) => setSnapshotLabel(e.target.value)}
                placeholder="Ex: Versão de Natal" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSnapshotDialogOpen(false)}>Cancelar</Button>
            <Button onClick={async () => {
              await saveStoreAsBlueprint(selectedStoreForSnapshot.id, snapshotLabel);
              setIsSnapshotDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['master-blueprints'] });
            }} disabled={savingBp}>
              {savingBp ? "Processando Snapshot..." : "Gerar Blueprint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


export default StoresList;
