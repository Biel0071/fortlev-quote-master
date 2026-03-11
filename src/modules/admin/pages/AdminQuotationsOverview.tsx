import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, DollarSign, Receipt, TrendingUp, Droplets, HardHat } from "lucide-react";
import { useQuotations } from "@/hooks/useQuotations";
import { useConstructionQuotations } from "@/hooks/useConstructionQuotations";
import { useSales } from "@/hooks/useSales";
import { formatCurrency, formatDate } from "@/utils/formatters";

export default function AdminQuotationsOverview() {
  const { quotations: fortlevQ } = useQuotations();
  const { quotations: constructionQ } = useConstructionQuotations();
  const { sales: fortlevSales } = useSales("fortlev");
  const { sales: constructionSales } = useSales("construcao");

  const totalQ = fortlevQ.length + constructionQ.length;
  const totalQuoted = useMemo(
    () =>
      fortlevQ.reduce((a, q) => a + q.total, 0) +
      constructionQ.reduce((a, q) => a + q.total, 0),
    [fortlevQ, constructionQ],
  );
  const totalSalesValue = useMemo(
    () =>
      fortlevSales.reduce((a, s) => a + s.value, 0) +
      constructionSales.reduce((a, s) => a + s.value, 0),
    [fortlevSales, constructionSales],
  );
  const totalSalesCount = fortlevSales.length + constructionSales.length;
  const conversion = totalQ > 0 ? (totalSalesCount / totalQ) * 100 : 0;

  const allRecent = useMemo(() => {
    const combined = [
      ...fortlevQ.map((q) => ({ ...q, store: "Fortlev" as const })),
      ...constructionQ.map((q) => ({ ...q, store: "Construção" as const })),
    ];
    return combined
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [fortlevQ, constructionQ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-muted"><Receipt className="h-5 w-5 text-foreground" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Orçamentos</p>
                <p className="text-lg font-bold">{totalQ}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-muted"><TrendingUp className="h-5 w-5 text-foreground" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Orçado</p>
                <p className="text-lg font-bold">{formatCurrency(totalQuoted)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-muted"><DollarSign className="h-5 w-5 text-foreground" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Vendas Registradas</p>
                <p className="text-lg font-bold">{formatCurrency(totalSalesValue)}</p>
                <p className="text-xs text-muted-foreground">{totalSalesCount} venda(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-muted"><BarChart3 className="h-5 w-5 text-foreground" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Conversão</p>
                <p className="text-lg font-bold">{conversion.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Droplets className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold">Fortlev</p>
              <p className="text-sm text-muted-foreground">{fortlevQ.length} orçamentos · {formatCurrency(fortlevQ.reduce((a, q) => a + q.total, 0))}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <HardHat className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-semibold">Construção</p>
              <p className="text-sm text-muted-foreground">{constructionQ.length} orçamentos · {formatCurrency(constructionQ.reduce((a, q) => a + q.total, 0))}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Últimos orçamentos</CardTitle>
            <Badge variant="secondary">Top 10</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {allRecent.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Nenhum orçamento emitido.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Loja</TableHead>
                    <TableHead>Nº</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allRecent.map((q) => (
                    <TableRow key={q.id} className="hover:bg-muted/30">
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {q.store}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{q.number}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{q.customer.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(new Date(q.createdAt))}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(q.total)}</TableCell>
                      <TableCell>
                        <Badge variant={q.status === "approved" ? "default" : q.status === "sent" ? "secondary" : "outline"}>
                          {q.status === "pending" ? "Pendente" : q.status === "sent" ? "Enviado" : q.status === "approved" ? "Aprovado" : q.status === "rejected" ? "Rejeitado" : q.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
