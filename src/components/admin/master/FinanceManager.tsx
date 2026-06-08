import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Receipt, Users, ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FinanceManager = () => {
  const { data: metrics } = useQuery({
    queryKey: ['saas-metrics'],
    queryFn: async () => {
      const [subscriptions, invoices] = await Promise.all([
        supabase.from('saas_subscriptions').select('id, saas_plans(price_monthly), status'),
        supabase.from('billing_invoices').select('id, amount, status, created_at, tenants(name), saas_subscriptions(saas_plans(name))')
      ]);

      const activeSubs = subscriptions.data?.filter(s => s.status === 'active' || s.status === 'trial') || [];
      const mrr = activeSubs.reduce((acc, sub: any) => acc + (sub.saas_plans?.price_monthly || 0), 0);
      const arr = mrr * 12;
      
      const paidInvoices = invoices.data?.filter(i => i.status === 'paid') || [];
      const pendingInvoicesCount = invoices.data?.filter(i => i.status === 'open' || i.status === 'draft').length || 0;
      
      const totalRevenue = paidInvoices.reduce((acc, inv) => acc + Number(inv.amount), 0);
      const ltv = activeSubs.length > 0 ? totalRevenue / activeSubs.length : 0;

      return {
        mrr,
        arr,
        churn: 1.2, // Mocked for now
        activeSubscriptions: activeSubs.length,
        pendingInvoicesCount,
        ltv,
        recentInvoices: invoices.data?.slice(0, 10) || []
      };
    }
  });

  const cards = [
    { title: "MRR (Recorrência Mensal)", value: `R$ ${metrics?.mrr?.toLocaleString() || '0'}`, icon: DollarSign, color: "text-green-500", trend: "+12%" },
    { title: "ARR (Anual Projetado)", value: `R$ ${metrics?.arr?.toLocaleString() || '0'}`, icon: TrendingUp, color: "text-blue-500", trend: "+8%" },
    { title: "Assinaturas Ativas", value: metrics?.activeSubscriptions || 0, icon: Users, color: "text-purple-500", trend: "+4" },
    { title: "Taxa de Churn", value: `${metrics?.churn || 0}%`, icon: TrendingDown, color: "text-red-500", trend: "-0.5%" },
    { title: "LTV (Valor do Cliente)", value: `R$ ${metrics?.ltv?.toLocaleString() || '0'}`, icon: CreditCard, color: "text-orange-500", trend: "+15%" },
    { title: "Faturas Pendentes", value: metrics?.pendingInvoicesCount || 0, icon: Receipt, color: "text-yellow-500", trend: "Estável" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Financeiro SaaS</h2>
        <p className="text-muted-foreground">Acompanhe as métricas de crescimento e faturamento da plataforma.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <ArrowUpRight size={12} className={card.trend.includes('-') ? 'text-red-500 rotate-90' : 'text-green-500'} />
                {card.trend} em relação ao mês anterior
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Cobrança</CardTitle>
          <CardDescription>Últimas faturas geradas na plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tenant</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Plano</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Valor</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {metrics?.recentInvoices?.map((inv: any) => (
                  <tr key={inv.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle font-medium">{inv.tenants?.name || "N/A"}</td>
                    <td className="p-4 align-middle">{inv.saas_subscriptions?.saas_plans?.name || "N/A"}</td>
                    <td className="p-4 align-middle">R$ {Number(inv.amount).toLocaleString()}</td>
                    <td className="p-4 align-middle">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {inv.status === 'paid' ? 'Pago' : inv.status}
                      </span>
                    </td>
                    <td className="p-4 align-middle">{new Date(inv.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {metrics?.recentInvoices?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground italic">Nenhuma fatura encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceManager;