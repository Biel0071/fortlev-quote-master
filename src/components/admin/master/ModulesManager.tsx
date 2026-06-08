import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Cpu, Settings2, Trash2, ShoppingBag, CheckCircle2, Star, Zap, Bot } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ModulesManager = () => {
  const { data: modules, isLoading } = useQuery({
    queryKey: ['master-module-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('store_module_definitions').select('*');
      if (error) throw error;
      return data;
    }
  });

  const marketplaceItems = [
    { id: 1, name: "WhatsApp IA Pro", desc: "Atendimento automático via GPT-4", price: "R$ 49/mês", icon: Bot, category: "IA" },
    { id: 2, name: "SEO Optimizer Engine", desc: "Indexação ultra-rápida no Google", price: "Grátis", icon: Zap, category: "Marketing" },
    { id: 3, name: "Checkout Transparente", desc: "Pagamentos integrados sem redirecionamento", price: "1% p/ transação", icon: ShoppingBag, category: "Pagamentos" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Marketplace & Módulos</h2>
          <p className="text-muted-foreground">O ecossistema de expansão para seus tenants.</p>
        </div>
        <Button className="gap-2">
          <Plus size={18} />
          Desenvolver Módulo
        </Button>
      </div>

      <Tabs defaultValue="installed" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="installed" className="gap-2">
            <CheckCircle2 size={16} /> Instalados
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="gap-2">
            <ShoppingBag size={16} /> Marketplace Central
          </TabsTrigger>
          <TabsTrigger value="developers" className="gap-2">
            <Star size={16} /> Top Desenvolvedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <p>Carregando módulos instalados...</p>
            ) : modules?.map((mod) => (
              <Card key={mod.id} className="group hover:border-primary transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <Cpu size={20} />
                  </div>
                  {mod.is_premium ? (
                    <Badge variant="default" className="bg-amber-500">Premium</Badge>
                  ) : (
                    <Badge variant="secondary">Core</Badge>
                  )}
                </CardHeader>
                <CardContent className="pt-4">
                  <CardTitle className="text-lg">{mod.name}</CardTitle>
                  <CardDescription className="mt-2 line-clamp-2">{mod.description}</CardDescription>
                  <div className="mt-4 flex flex-col gap-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span>Lojas ativas:</span>
                      <span className="font-bold text-foreground">124</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs">
                        <Settings2 size={12} /> Config
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-6">
          <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 p-8 rounded-xl border border-primary/20 mb-8">
            <h3 className="text-2xl font-bold mb-2">Novidades do Marketplace</h3>
            <p className="text-muted-foreground mb-4">Descubra novos módulos para turbinar a plataforma dos seus clientes.</p>
            <Button size="lg" className="gap-2">
              <Zap size={18} /> Ver Todos Lançamentos
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {marketplaceItems.map((item) => (
              <Card key={item.id} className="overflow-hidden border-2 border-transparent hover:border-primary transition-all">
                <div className="h-24 bg-muted flex items-center justify-center">
                  <item.icon size={48} className="text-muted-foreground/30" />
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge className="mb-2" variant="outline">{item.category}</Badge>
                      <CardTitle>{item.name}</CardTitle>
                    </div>
                    <span className="font-bold text-primary">{item.price}</span>
                  </div>
                  <CardDescription>{item.desc}</CardDescription>
                </CardHeader>
                <CardFooter className="bg-muted/30 p-4">
                  <Button className="w-full gap-2">
                    <ShoppingBag size={16} /> Instalar na Rede
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModulesManager;
