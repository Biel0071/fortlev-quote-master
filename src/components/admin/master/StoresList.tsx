import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreHorizontal, ExternalLink, Copy, Trash2, Archive } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import StoreFactory from "./StoreFactory";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

const StoresList = () => {
  const [search, setSearch] = useState("");
  const [isFactoryOpen, setIsFactoryOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: stores, isLoading } = useQuery({
    queryKey: ['master-stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select(`
          *,
          tenants (name),
          store_domains (domain)
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
              <TableHead>Tenant</TableHead>
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
                <TableCell>{store.tenants?.name || "N/A"}</TableCell>
                <TableCell>
                  {store.store_domains?.[0]?.domain || `${store.slug}.plataforma.com`}
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
                      <DropdownMenuLabel>Opções</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => window.open(`/${store.slug}`, '_blank')}>
                        <ExternalLink size={14} className="mr-2" /> Acessar Loja
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy size={14} className="mr-2" /> Duplicar
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
    </div>
  );
};

export default StoresList;
