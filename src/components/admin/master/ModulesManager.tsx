import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Cpu, Settings2, Trash2 } from "lucide-react";

const ModulesManager = () => {
  const { data: modules, isLoading } = useQuery({
    queryKey: ['master-module-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('store_module_definitions').select('*');
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Módulos</h2>
          <p className="text-muted-foreground">Gerencie os recursos que podem ser instalados nas lojas.</p>
        </div>
        <Button className="gap-2">
          <Plus size={18} />
          Novo Módulo
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <p>Carregando módulos...</p>
        ) : modules?.map((mod) => (
          <Card key={mod.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Cpu size={20} />
              </div>
              {mod.is_premium && <Badge variant="default" className="bg-amber-500">Premium</Badge>}
            </CardHeader>
            <CardContent className="pt-4">
              <CardTitle className="text-lg">{mod.name}</CardTitle>
              <CardDescription className="mt-2 line-clamp-2">{mod.description}</CardDescription>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="w-full gap-1 text-xs">
                  <Settings2 size={12} /> Config
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive">
                  <Trash2 size={12} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ModulesManager;
