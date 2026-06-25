import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Cpu, Settings2, Trash2, ShoppingBag, CheckCircle2, Zap, Bot, Lock, Save, Globe, Grid3x3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import StoreModulesMatrix from "./StoreModulesMatrix";

const ModulesManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "Cpu",
    category: "Geral",
    is_premium: false,
    price: 0,
    required_plan: "Free",
    is_active: true
  });

  const { data: modules, isLoading } = useQuery({
    queryKey: ['master-module-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('store_module_definitions').select('*');
      if (error) throw error;
      return data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingModule) {
        const { error } = await supabase.from('store_module_definitions').update(data).eq('id', editingModule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('store_module_definitions').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-module-definitions'] });
      toast.success(editingModule ? "Módulo atualizado" : "Módulo criado");
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('store_module_definitions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-module-definitions'] });
      toast.success("Módulo removido");
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      icon: "Cpu",
      category: "Geral",
      is_premium: false,
      price: 0,
      required_plan: "Free",
      is_active: true
    });
    setEditingModule(null);
  };

  const handleEdit = (mod: any) => {
    setEditingModule(mod);
    setFormData({
      name: mod.name,
      description: mod.description || "",
      icon: mod.icon || "Cpu",
      category: mod.category || "Geral",
      is_premium: mod.is_premium || false,
      price: mod.price || 0,
      required_plan: mod.required_plan || "Free",
      is_active: mod.is_active !== false
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Marketplace & Módulos</h2>
          <p className="text-muted-foreground">Gerencie o catálogo global de extensões da plataforma.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={resetForm}>
              <Plus size={18} /> Novo Módulo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingModule ? "Editar Módulo" : "Cadastrar Módulo"}</DialogTitle>
              <DialogDescription>Configure as propriedades do módulo para o Marketplace.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ex: WhatsApp IA" />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} placeholder="Ex: Marketing" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço (R$)</Label>
                  <Input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Plano Mínimo</Label>
                  <Input value={formData.required_plan} onChange={(e) => setFormData({...formData, required_plan: e.target.value})} placeholder="Ex: Pro" />
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-2">
                  <Switch checked={formData.is_premium} onCheckedChange={(val) => setFormData({...formData, is_premium: val})} />
                  <Label>Módulo Premium</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.is_active} onCheckedChange={(val) => setFormData({...formData, is_active: val})} />
                  <Label>Ativo no Marketplace</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending}>
                <Save size={16} className="mr-2" /> Salvar Módulo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all" className="gap-2">
            <Globe size={16} /> Todos Módulos
          </TabsTrigger>
          <TabsTrigger value="premium" className="gap-2">
            <Zap size={16} /> Apenas Premium
          </TabsTrigger>
          <TabsTrigger value="matrix" className="gap-2">
            <Grid3x3 size={16} /> Matriz Loja × Módulo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matrix">
          <StoreModulesMatrix />
        </TabsContent>


        <TabsContent value="all" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <p>Carregando catálogo...</p>
            ) : modules?.map((mod) => (
              <Card key={mod.id} className="group hover:border-primary transition-all shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Cpu size={20} />
                  </div>
                  <Badge variant={mod.is_premium ? "default" : "secondary"} className={mod.is_premium ? "bg-amber-500" : ""}>
                    {mod.is_premium ? "Premium" : "Core"}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-4">
                  <CardTitle className="text-lg">{mod.name}</CardTitle>
                  <CardDescription className="mt-2 line-clamp-2">{mod.description}</CardDescription>
                  <div className="mt-4 flex flex-col gap-2">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-muted-foreground">Preço:</span>
                      <span className="font-bold">R$ {(mod as any).price || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-muted-foreground">Requisito:</span>
                      <Badge variant="outline" className="py-0">{(mod as any).required_plan || "Free"}</Badge>
                    </div>
                    <div className="flex gap-2 pt-2 border-t">
                      <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => handleEdit(mod)}>
                        <Settings2 size={12} /> Editar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`Remover módulo ${mod.name}?`)) {
                            deleteMutation.mutate(mod.id);
                          }
                        }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModulesManager;