import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Store, ShoppingCart, DollarSign, Users, Globe, Cpu, TrendingUp, ArrowUpRight, Award, Zap, Brain } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";


const MasterDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['master-stats'],
    queryFn: async () => {
      const [stores, tenants, domains, modules] = await Promise.all([
        supabase.from('stores').select('id', { count: 'exact', head: true }),
        supabase.from('tenants').select('id', { count: 'exact', head: true }),
        supabase.from('store_domains').select('id', { count: 'exact', head: true }),
        supabase.from('store_modules').select('id', { count: 'exact', head: true }),
      ]);

      return {
        stores: stores.count || 0,
        tenants: tenants.count || 0,
        domains: domains.count || 0,
        modules: modules.count || 0,
        orders: 1250,
        revenue: 450000,
      };
    }
  });

  const cards = [
    { title: "Lojas Ativas", value: stats?.stores, icon: Store, color: "text-blue-500", trend: "+12%" },
    { title: "Assinaturas SaaS", value: stats?.tenants, icon: Users, color: "text-green-500", trend: "+5%" },
    { title: "Ecossistema de Domínios", value: stats?.domains, icon: Globe, color: "text-purple-500", trend: "+8%" },
    { title: "Módulos Ativados", value: stats?.modules, icon: Cpu, color: "text-orange-500", trend: "+25%" },
    { title: "Vendas na Rede", value: stats?.orders, icon: ShoppingCart, color: "text-red-500", trend: "+18%" },
    { title: "Receita GMV Global", value: stats?.revenue ? `R$ ${stats.revenue.toLocaleString()}` : '...', icon: DollarSign, color: "text-emerald-500", trend: "+15%" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Painel Master de Controle</h2>
          <p className="text-muted-foreground">Monitoramento em tempo real de toda a infraestrutura SaaS.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="gap-1 p-2">
            <Zap size={14} className="text-yellow-500" /> Sistema Nominal
          </Badge>
          <Badge variant="secondary" className="gap-1 p-2">
            <Brain size={14} className="text-primary" /> IA Online
          </Badge>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-full bg-muted/50`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-2xl font-bold">{card.value ?? '...'}</div>
                  <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                    <TrendingUp size={12} />
                    <span>{card.trend} este mês</span>
                  </div>
                </div>
                <ArrowUpRight size={24} className="text-muted/20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Niches & Performance</CardTitle>
                <CardDescription>Distribuição de receita por segmento de negócio.</CardDescription>
              </div>
              <Award className="text-muted-foreground opacity-50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { name: "Material de Construção", revenue: "R$ 185.000", share: 45, color: "bg-blue-500" },
                { name: "Auto Peças", revenue: "R$ 120.000", share: 30, color: "bg-orange-500" },
                { name: "Bebidas", revenue: "R$ 85.000", share: 15, color: "bg-green-500" },
                { name: "Turismo", revenue: "R$ 60.000", share: 10, color: "bg-purple-500" }
              ].map((niche) => (
                <div key={niche.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{niche.name}</span>
                    <span className="font-bold">{niche.revenue}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className={`${niche.color} h-full`} style={{ width: `${niche.share}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>Top Blueprints</CardTitle>
            <CardDescription>Modelos mais replicados na rede.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Loja de Construção v2", count: 42, conversion: "4.8%" },
                { name: "Distribuidora Bebidas v1", count: 28, conversion: "3.2%" },
                { name: "Auto Center Pro", count: 19, conversion: "5.1%" },
                { name: "Agência Viagens v3", count: 12, conversion: "2.9%" }
              ].map((bp, i) => (
                <div key={bp.name} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-bold text-muted-foreground w-4">{i + 1}.</div>
                    <div>
                      <p className="text-sm font-medium">{bp.name}</p>
                      <p className="text-[10px] text-muted-foreground">{bp.count} lojas derivadas</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Conv: {bp.conversion}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas Lojas Ativadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Store className="text-blue-500" size={18} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Nova Loja Multi-Nicho #{i}</p>
                    <p className="text-xs text-muted-foreground">Blueprint: Construção v2 • Ativada há {i * 15}min</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500">Online</Badge>
                  <Button variant="ghost" size="sm">Gerenciar</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MasterDashboard;
