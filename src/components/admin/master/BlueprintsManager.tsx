import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Layers, Edit2, Trash2, Eye, History, Save, Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useBlueprintManager } from "@/hooks/useBlueprintManager";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BlueprintsManager = () => {
  const queryClient = useQueryClient();
  const { saveStoreAsBlueprint, loading: savingBp } = useBlueprintManager();
  const [selectedBp, setSelectedBp] = useState<any>(null);
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [targetStoreId, setTargetStoreId] = useState("");

  const { data: blueprints, isLoading } = useQuery({
    queryKey: ['master-blueprints'],
    queryFn: async () => {
      const { data, error } = await supabase.from('store_blueprints').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: versions, isLoading: loadingVersions } = useQuery({
    queryKey: ['blueprint-versions', selectedBp?.id],
    queryFn: async () => {
      if (!selectedBp) return [];
      const { data, error } = await supabase
        .from('blueprint_versions')
        .select('*')
        .eq('blueprint_id', selectedBp.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedBp
  });


  const handleCreateSnapshot = async () => {
    if (!targetStoreId || !snapshotLabel) {
      toast.error("Preencha o ID da loja e a etiqueta");
      return;
    }
    await saveStoreAsBlueprint(targetStoreId, snapshotLabel);
    queryClient.invalidateQueries({ queryKey: ['master-blueprints'] });
    setIsVersionDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Fábrica de Blueprints</h2>
          <p className="text-muted-foreground">Converta lojas em modelos replicáveis e gerencie versões.</p>
        </div>
        <Dialog open={isVersionDialogOpen} onOpenChange={setIsVersionDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={18} />
              Criar Blueprint de Loja
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Blueprint</DialogTitle>
              <DialogDescription>
                Selecione uma loja existente para capturar seu snapshot.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="storeId">ID da Loja (UUID)</Label>
                <Input 
                  id="storeId" 
                  value={targetStoreId} 
                  onChange={(e) => setTargetStoreId(e.target.value)}
                  placeholder="Ex: 550e8400-e29b-41d4-a716-446655440000" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="label">Etiqueta da Versão</Label>
                <Input 
                  id="label" 
                  value={snapshotLabel} 
                  onChange={(e) => setSnapshotLabel(e.target.value)}
                  placeholder="Ex: v1.0 - Lançamento" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsVersionDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateSnapshot} disabled={savingBp}>
                {savingBp ? "Salvando..." : "Criar Snapshot"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p>Carregando blueprints...</p>
        ) : blueprints?.map((bp) => (
          <Card key={bp.id} className="overflow-hidden border-2 hover:border-primary/50 transition-all">
            <div className="h-32 bg-muted flex items-center justify-center border-b relative">
              <Layers size={48} className="text-muted-foreground opacity-20" />
              <div className="absolute bottom-2 right-2">
                <Badge variant="secondary" className="gap-1">
                  <History size={12} /> {versions?.filter(v => v.blueprint_id === bp.id).length || 0} versões
                </Badge>
              </div>
            </div>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">{bp.name}</CardTitle>
                <Badge>{bp.category}</Badge>
              </div>
              <CardDescription>{bp.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-xs space-y-2">
                  <p className="font-semibold text-muted-foreground uppercase tracking-wider">Metadados IA:</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">Tom: {(bp.ai_config as any)?.tone || 'Padrão'}</Badge>
                    <Badge variant="outline">Meta: {(bp.ai_config as any)?.goals?.length || 0}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t flex justify-between p-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1"
                onClick={() => setSelectedBp(bp)}
              >
                <History size={14} /> Versões
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="gap-1">
                  <Play size={14} /> Replicar
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive">
                  <Trash2 size={14} />
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {selectedBp && (
        <Card className="mt-8 border-primary/20">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Histórico de Versões: {selectedBp.name}</CardTitle>
                <CardDescription>Gerencie snapshots salvos e restaure estados anteriores.</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setSelectedBp(null)}>Fechar</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loadingVersions ? (
                <p>Carregando versões...</p>
              ) : versions?.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Save className="text-primary" size={20} />
                    </div>
                    <div>
                      <p className="font-medium">{v.version_label}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(v.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Comparar</Button>
                    <Button size="sm">Restaurar</Button>
                  </div>
                </div>
              ))}
              {versions?.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma versão encontrada para este blueprint.</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BlueprintsManager;

export default BlueprintsManager;
