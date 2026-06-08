import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Layers, Edit2, Trash2, Eye } from "lucide-react";

const BlueprintsManager = () => {
  const { data: blueprints, isLoading } = useQuery({
    queryKey: ['master-blueprints'],
    queryFn: async () => {
      const { data, error } = await supabase.from('store_blueprints').select('*');
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Blueprints</h2>
          <p className="text-muted-foreground">Estruturas de negócio pré-configuradas para criação rápida.</p>
        </div>
        <Button className="gap-2">
          <Plus size={18} />
          Novo Blueprint
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p>Carregando blueprints...</p>
        ) : blueprints?.map((bp) => (
          <Card key={bp.id} className="overflow-hidden">
            <div className="h-32 bg-muted flex items-center justify-center border-b">
              <Layers size={48} className="text-muted-foreground opacity-20" />
            </div>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{bp.name}</CardTitle>
                <Badge>{bp.category}</Badge>
              </div>
              <CardDescription>{bp.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs space-y-2">
                <p className="font-semibold text-muted-foreground uppercase tracking-wider">Módulos Inclusos:</p>
                <div className="flex flex-wrap gap-1">
                  {(bp.config as any)?.modules?.map((m: string) => (
                    <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t flex justify-between p-4">
              <Button variant="ghost" size="sm" className="gap-1">
                <Eye size={14} /> Ver
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="gap-1">
                  <Edit2 size={14} /> Editar
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive gap-1">
                  <Trash2 size={14} /> Excluir
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BlueprintsManager;
