import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, DollarSign, Receipt, TrendingUp } from "lucide-react";
import { useConstructionQuotations } from "@/hooks/useConstructionQuotations";
import { useSales } from "@/hooks/useSales";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { toast } from "@/hooks/use-toast";

function currencyToNumber(raw: string) {
  const cleaned = raw.replace(/[^0-9,.-]/g, "").replace(".", "").replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

export default function ConstructionOverview() {
  const { quotations } = useConstructionQuotations();
  const { sales, salesByQuotationId, createSale } = useSales("construcao");

  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [sellQuotationId, setSellQuotationId] = useState<string | null>(null);
  const [sellValue, setSellValue] = useState<string>("");

  const totalQuoted = useMemo(
    () => quotations.reduce((acc, q) => acc + (q.total || 0), 0),
    [quotations]
  );

  const totalSales = useMemo(
    () => sales.reduce((acc, s) => acc + (s.value || 0), 0),
    [sales]
  );

  const conversion = quotations.length > 0 ? (sales.length / quotations.length) * 100 : 0;

  const last7DaysSales = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        label: d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
        key: d.toDateString(),
        valor: 0,
      };
    });

    sales.forEach((s) => {
      const key = new Date(s.soldAt).toDateString();
      const day = days.find((d) => d.key === key);
      if (day) day.valor += s.value;
    });

    return days;
  }, [sales]);

  const recentQuotations = useMemo(() => {
    return [...quotations]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [quotations]);

  const openSellDialog = (quotationId: string, defaultValue?: number) => {
    setSellQuotationId(quotationId);
    setSellValue(defaultValue ? defaultValue.toFixed(2).replace(".", ",") : "");
    setSellDialogOpen(true);
  };

  const confirmSell = () => {
    if (!sellQuotationId) return;
    const value = currencyToNumber(sellValue);
    if (value <= 0) {
      toast({ title: "Valor inválido", description: "Informe um valor de venda maior que zero", variant: "destructive" });
      return;
    }

    createSale({
      store: "construcao",
      quotationId: sellQuotationId,
      value,
      soldAt: new Date(),
    });

    toast({ title: "Venda registrada", description: "A venda foi adicionada ao dashboard" });
    setSellDialogOpen(false);
    setSellQuotationId(null);
    setSellValue("");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-muted">
                <Receipt className="h-5 w-5 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Orçamentos</p>
                <p className="text-lg font-bold truncate">{quotations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-muted">
                <TrendingUp className="h-5 w-5 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Total orçado</p>
                <p className="text-lg font-bold truncate">{formatCurrency(totalQuoted)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-muted">
                <DollarSign className="h-5 w-5 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Vendas (manual)</p>
                <p className="text-lg font-bold truncate">{formatCurrency(totalSales)}</p>
                <p className="text-xs text-muted-foreground">{sales.length} venda(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-muted">
                <BarChart3 className="h-5 w-5 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Conversão</p>
                <p className="text-lg font-bold truncate">{conversion.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-foreground" />
              Vendas (últimos 7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sem dados para exibir
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={last7DaysSales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(value: number) => [formatCurrency(value), "Vendas"]}
                  />
                  <Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Ticket médio (orçado)</span>
              <span className="font-semibold">
                {formatCurrency(quotations.length ? totalQuoted / quotations.length : 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Ticket médio (venda)</span>
              <span className="font-semibold">
                {formatCurrency(sales.length ? totalSales / sales.length : 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Orçamentos sem venda</span>
              <span className="font-semibold">
                {Math.max(0, quotations.length - new Set(sales.map((s) => s.quotationId)).size)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Orçamentos recentes</CardTitle>
            <Badge variant="secondary">Top 8</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {recentQuotations.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              Nenhum orçamento emitido ainda.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nº</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Venda</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentQuotations.map((q) => {
                    const sold = (salesByQuotationId.get(q.id) ?? []).length > 0;
                    return (
                      <TableRow key={q.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{q.number}</TableCell>
                        <TableCell className="max-w-[240px] truncate">{q.customer.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(new Date(q.createdAt))}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(q.total)}</TableCell>
                        <TableCell className="text-right">
                          {sold ? (
                            <Badge>Registrada</Badge>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => openSellDialog(q.id, q.total)}>
                              Registrar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar venda</DialogTitle>
            <DialogDescription>
              Informe o valor final da venda (controle manual, usado nas métricas do dashboard).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="sellValue">Valor (R$)</Label>
            <Input
              id="sellValue"
              inputMode="decimal"
              placeholder="Ex: 1.234,56"
              value={sellValue}
              onChange={(e) => setSellValue(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSellDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmSell}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
