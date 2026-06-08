import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Edit2, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const SaaSPlansManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: plans, isLoading } = useQuery({
    queryKey: ['saas-plans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('saas_plans').select('*').order('price_monthly', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div>Carregando planos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Planos SaaS</h2>
          <p className="text-muted-foreground">Gerencie os pacotes comerciais e limites da plataforma.</p>
        </div>
        <Button className="gap-2">
          <Plus size={18} /> Novo Plano
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans?.map((plan: any) => (
          <Card key={plan.id} className="relative flex flex-col h-full border-t-4 border-t-primary/50">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{plan.name}</CardTitle>
                <Badge variant={plan.is_active ? "default" : "secondary"}>
                  {plan.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <CardDescription>{plan.description}</CardDescription>
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
              </div>
            </CardContent>
            <div className="p-4 border-t flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-1">
                <Edit2 size={14} /> Editar
              </Button>
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                <Trash2 size={14} />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SaaSPlansManager;