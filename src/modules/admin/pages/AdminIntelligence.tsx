import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminDashboardInsights } from "@/hooks/useAdminDashboardInsights";

export default function AdminIntelligence() {
  const { data } = useAdminDashboardInsights();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl"><CardHeader><CardTitle>Taxa de conversão</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{data.intelligence.conversionRate.toFixed(1)}%</CardContent></Card>
        <Card className="rounded-2xl"><CardHeader><CardTitle>Taxa de abandono</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{data.intelligence.abandonmentRate.toFixed(1)}%</CardContent></Card>
        <Card className="rounded-2xl"><CardHeader><CardTitle>Tempo médio no site</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{Math.round(data.intelligence.avgTimeOnSite)}s</CardContent></Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle>Produtos mais visualizados</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.lists.topViewedProducts.map((item) => (
              <div key={item.id} className="rounded-xl border border-border p-3 flex items-center justify-between gap-3">
                <span className="font-medium truncate">{item.name}</span>
                <Badge variant="secondary">{item.views}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle>Termos mais pesquisados</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.lists.topSearchTerms.length === 0 ? (
              <div className="text-sm text-muted-foreground">Ainda sem termos pesquisados.</div>
            ) : (
              data.lists.topSearchTerms.map((term) => (
                <div key={term.term} className="rounded-xl border border-border p-3 flex items-center justify-between gap-3">
                  <span className="font-medium">{term.term}</span>
                  <Badge>{term.count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
