import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Edit2, Plus, Trash2, CheckCircle2, Save, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const SaaSPlansManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_monthly: 0,
    price_yearly: 0,
    trial_days: 14,
    is_active: true,
    limits: {
      max_users: 2,
      ai_enabled: true,
      max_stores: 1,
      max_modules: 5,
      white_label: false,
      max_products: 50,
      custom_domain: false,
      max_automations: 2
    }
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ['saas-plans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('saas_plans').select('*').order('price_monthly', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingPlan) {
        const { error } = await supabase.from('saas_plans').update(data).eq('id', editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('saas_plans').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-plans'] });
      toast({ title: editingPlan ? "Plano atualizado" : "Plano criado" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao salvar plano", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saas_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-plans'] });
      toast({ title: "Plano removido" });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price_monthly: 0,
      price_yearly: 0,
      trial_days: 14,
      is_active: true,
      limits: {
        max_users: 2,
        ai_enabled: true,
        max_stores: 1,
        max_modules: 5,
        white_label: false,
        max_products: 50,
        custom_domain: false,
        max_automations: 2
      }
    });
    setEditingPlan(null);
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly || 0,
      trial_days: plan.trial_days || 14,
      is_active: plan.is_active,
      limits: plan.limits || formData.limits
    });
    setIsDialogOpen(true);
  };

  if (isLoading) return <div className="p-8 text-center">Carregando planos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Planos SaaS</h2>
          <p className="text-muted-foreground">Gerencie os pacotes comerciais e limites da plataforma.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={resetForm}>
              <Plus size={18} /> Novo Plano
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Editar Plano" : "Criar Novo Plano"}</DialogTitle>
              <DialogDescription>Configure os preços e limites granulares para este plano.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Plano</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ex: Profissional" />
                </div>
                <div className="space-y-2">
                  <Label>Preço Mensal (R$)</Label>
                  <Input type="number" value={formData.price_monthly} onChange={(e) => setFormData({...formData, price_monthly: Number(e.target.value)})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="O que este plano oferece..." />
              </div>
              <div className="grid grid-cols-3 gap-4 border-t pt-4">
                <div className="space-y-2">
                  <Label>Max Lojas</Label>
                  <Input type="number" value={formData.limits.max_stores} onChange={(e) => setFormData({...formData, limits: {...formData.limits, max_stores: Number(e.target.value)}})} />
                </div>
                <div className="space-y-2">
                  <Label>Max Produtos</Label>
                  <Input type="number" value={formData.limits.max_products} onChange={(e) => setFormData({...formData, limits: {...formData.limits, max_products: Number(e.target.value)}})} />
                </div>
                <div className="space-y-2">
                  <Label>Max Usuários</Label>
                  <Input type="number" value={formData.limits.max_users} onChange={(e) => setFormData({...formData, limits: {...formData.limits, max_users: Number(e.target.value)}})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 mt-2">
                <div className="flex items-center justify-between">
                  <Label>IA Ativa</Label>
                  <Switch checked={formData.limits.ai_enabled} onCheckedChange={(val) => setFormData({...formData, limits: {...formData.limits, ai_enabled: val}})} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>White Label</Label>
                  <Switch checked={formData.limits.white_label} onCheckedChange={(val) => setFormData({...formData, limits: {...formData.limits, white_label: val}})} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Domínio Customizado</Label>
                  <Switch checked={formData.limits.custom_domain} onCheckedChange={(val) => setFormData({...formData, limits: {...formData.limits, custom_domain: val}})} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Plano Ativo</Label>
                  <Switch checked={formData.is_active} onCheckedChange={(val) => setFormData({...formData, is_active: val})} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending}>
                <Save size={16} className="mr-2" /> Salvar Plano
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans?.map((plan: any) => (
          <Card key={plan.id} className="relative flex flex-col h-full border-t-4 border-t-primary/50 shadow-sm hover:shadow-md transition-all">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{plan.name}</CardTitle>
                <Badge variant={plan.is_active ? "default" : "secondary"}>
                  {plan.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <CardDescription className="line-clamp-2">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="text-3xl font-bold">
                R$ {plan.price_monthly}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Lojas:</span>
                  <span className="font-semibold">{plan.limits.max_stores}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Produtos:</span>
                  <span className="font-semibold">{plan.limits.max_products}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">White Label:</span>
                  <span>{plan.limits.white_label ? <CheckCircle2 className="text-green-500 inline" size={16} /> : "Não"}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">IA Central:</span>
                  <span>{plan.limits.ai_enabled ? <CheckCircle2 className="text-green-500 inline" size={16} /> : "Não"}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Domínios:</span>
                  <span>{plan.limits.custom_domain ? <CheckCircle2 className="text-green-500 inline" size={16} /> : "Não"}</span>
                </div>
              </div>
            </CardContent>
            <div className="p-4 border-t flex gap-2 bg-muted/20">
              <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => handleEdit(plan)}>
                <Edit2 size={14} /> Editar
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive hover:text-red-600 hover:bg-red-50"
                onClick={() => {
                  if (confirm(`Remover plano ${plan.name}?`)) {
                    deleteMutation.mutate(plan.id);
                  }
                }}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </Card>
        ))}
        {plans?.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl">
            <p className="text-muted-foreground italic">Nenhum plano comercial configurado.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SaaSPlansManager;