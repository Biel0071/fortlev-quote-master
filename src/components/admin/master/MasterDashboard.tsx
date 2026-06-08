import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, ShoppingCart, DollarSign, Users, Globe, Cpu } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
        orders: 1250, // Mock for now
        revenue: 450000, // Mock for now
      };
    }
  });

  const cards = [
    { title: "Total de Lojas", value: stats?.stores, icon: Store, color: "text-blue-500" },
    { title: "Tenants (Clientes SaaS)", value: stats?.tenants, icon: Users, color: "text-green-500" },
    { title: "Domínios Ativos", value: stats?.domains, icon: Globe, color: "text-purple-500" },
    { title: "Módulos Instalados", value: stats?.modules, icon: Cpu, color: "text-orange-500" },
    { title: "Total de Pedidos", value: stats?.orders, icon: ShoppingCart, color: "text-red-500" },
    { title: "Receita Global", value: stats?.revenue ? `R$ ${stats.revenue.toLocaleString()}` : '...', icon: DollarSign, color: "text-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Global</h2>
        <p className="text-muted-foreground">Visão geral de toda a plataforma.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value ?? '...'}</div>
              <p className="text-xs text-muted-foreground">+12% desde o mês passado</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Top Lojas por Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {i}
                    </div>
                    <div>
                      <p className="font-medium text-sm">Loja Exemplo {i}</p>
                      <p className="text-xs text-muted-foreground">loja-{i}.plataforma.com</p>
                    </div>
                  </div>
                  <p className="font-bold text-sm">R$ {(15000 / i).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Módulos Populares</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['CRM', 'WhatsApp IA', 'SEO Pro'].map((mod, i) => (
                <div key={mod} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium text-sm">{mod}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="bg-primary h-full" style={{ width: `${80 - i * 15}%` }} />
                    </div>
                    <span className="text-xs font-bold">{80 - i * 15}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MasterDashboard;
