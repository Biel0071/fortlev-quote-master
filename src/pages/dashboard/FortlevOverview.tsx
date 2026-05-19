import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, DollarSign, Receipt, TrendingUp, Plus, Pencil, Copy, Trash2, FileText, Image, FileDown, MoreHorizontal, Building2, Users, Search, Filter } from "lucide-react";
import SmartQuotationGenerator from "@/components/admin/SmartQuotationGenerator";
import { useQuotations } from "@/hooks/useQuotations";
import { useSales } from "@/hooks/useSales";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { downloadPDF, downloadPNG } from "@/utils/pdfGenerator";
import { downloadNFePDF } from "@/utils/nfeGenerator";
import { toast } from "@/hooks/use-toast";

function currencyToNumber(raw: string) {
  const cleaned = raw.replace(/[^0-9,.-]/g, "").replace(".", "").replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

export default function FortlevOverview() {
  const navigate = useNavigate();
  const { quotations, deleteQuotation, duplicateQuotation } = useQuotations();
  const { sales, salesByQuotationId, createSale } = useSales("fortlev");

  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [sellQuotationId, setSellQuotationId] = useState<string | null>(null);
  const [sellValue, setSellValue] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [issuers, setIssuers] = useState<any[]>([]);
  const [selectedIssuerId, setSelectedIssuerId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchIssuers = async () => {
      const { data } = await supabase.from("issuing_companies").select("*").order("name");
      setIssuers(data || []);
    };
    fetchIssuers();
  }, []);

  const filteredQuotations = useMemo(() => {
    let result = quotations;
    if (selectedIssuerId !== "all") {
      result = result.filter(q => q.companyId === selectedIssuerId);
    }
    if (searchTerm) {
      result = result.filter(q => 
        q.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return result;
  }, [quotations, selectedIssuerId, searchTerm]);

  const totalQuoted = useMemo(() => quotations.reduce((acc, q) => acc + (q.total || 0), 0), [quotations]);
  const totalSales = useMemo(() => sales.reduce((acc, s) => acc + (s.value || 0), 0), [sales]);
  const conversion = quotations.length > 0 ? (sales.length / quotations.length) * 100 : 0;

  const last7DaysSales = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { label: d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }), key: d.toDateString(), valor: 0 };
    });
    sales.forEach((s) => {
      const key = new Date(s.soldAt).toDateString();
      const day = days.find((d) => d.key === key);
      if (day) day.valor += s.value;
    });
    return days;
  }, [sales]);

  const recentQuotations = useMemo(() =>
    [...quotations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [quotations]
  );

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
    createSale({ store: "fortlev", quotationId: sellQuotationId, value, soldAt: new Date() });
    toast({ title: "Venda registrada", description: "A venda foi adicionada ao dashboard" });
    setSellDialogOpen(false);
    setSellQuotationId(null);
    setSellValue("");
  };

  const handleDelete = async (id: string) => {
    await deleteQuotation(id);
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
    toast({ title: "Orçamento excluído" });
  };

  const handleDuplicate = async (id: string) => { await duplicateQuotation(id); };

  const handleBulkDelete = async () => {
    for (const id of selected) { await deleteQuotation(id); }
    toast({ title: `${selected.size} orçamento(s) excluído(s)` });
    setSelected(new Set());
    setBulkDeleteOpen(false);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    selected.size === recentQuotations.length ? setSelected(new Set()) : setSelected(new Set(recentQuotations.map((q) => q.id)));
  };

  const handleEdit = (id: string) => { navigate(`/orcamentos?edit=${id}`); };

  const handleDownloadPDF = (q: typeof quotations[0]) => {
    try { downloadPDF(q); toast({ title: "PDF gerado com sucesso" }); }
    catch { toast({ title: "Erro ao gerar PDF", variant: "destructive" }); }
  };

  const handleDownloadPNG = async (q: typeof quotations[0]) => {
    try { await downloadPNG(q); toast({ title: "PNG gerado com sucesso" }); }
    catch { toast({ title: "Erro ao gerar PNG", variant: "destructive" }); }
  };

  const handleDownloadNFe = async (q: typeof quotations[0]) => {
    try {
      const nfeNumber = q.number.slice(0, 9).padStart(9, "0");
      await downloadNFePDF(q, nfeNumber);
      toast({ title: "Nota Fiscal gerada com sucesso" });
    } catch { toast({ title: "Erro ao gerar NFe", variant: "destructive" }); }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-muted"><Receipt className="h-5 w-5 text-foreground" /></div><div className="min-w-0"><p className="text-xs text-muted-foreground">Orçamentos</p><p className="text-lg font-bold truncate">{quotations.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-muted"><TrendingUp className="h-5 w-5 text-foreground" /></div><div className="min-w-0"><p className="text-xs text-muted-foreground">Total orçado</p><p className="text-lg font-bold truncate">{formatCurrency(totalQuoted)}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-muted"><DollarSign className="h-5 w-5 text-foreground" /></div><div className="min-w-0"><p className="text-xs text-muted-foreground">Vendas (manual)</p><p className="text-lg font-bold truncate">{formatCurrency(totalSales)}</p><p className="text-xs text-muted-foreground">{sales.length} venda(s)</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-muted"><BarChart3 className="h-5 w-5 text-foreground" /></div><div className="min-w-0"><p className="text-xs text-muted-foreground">Conversão</p><p className="text-lg font-bold truncate">{conversion.toFixed(1)}%</p></div></div></CardContent></Card>
      </div>

      {/* Chart + Summary */}
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
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">Sem dados para exibir</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={last7DaysSales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(value: number) => [formatCurrency(value), "Vendas"]} />
                  <Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Ticket médio (orçado)</span><span className="font-semibold">{formatCurrency(quotations.length ? totalQuoted / quotations.length : 0)}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Ticket médio (venda)</span><span className="font-semibold">{formatCurrency(sales.length ? totalSales / sales.length : 0)}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Orçamentos sem venda</span><span className="font-semibold">{Math.max(0, quotations.length - new Set(sales.map((s) => s.quotationId)).size)}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Quotations table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle>Orçamentos</CardTitle>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-1" />Excluir ({selected.size})
                </Button>
              )}
              <Button size="sm" onClick={() => navigate("/orcamentos")}>
                <Plus className="h-4 w-4 mr-1" />Novo Orçamento
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentQuotations.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Nenhum orçamento emitido ainda.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10">
                      <Checkbox checked={selected.size === recentQuotations.length && recentQuotations.length > 0} onCheckedChange={toggleAll} />
                    </TableHead>
                    <TableHead>Nº</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Documentos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentQuotations.map((q) => {
                    const sold = (salesByQuotationId.get(q.id) ?? []).length > 0;
                    return (
                      <TableRow key={q.id} className="hover:bg-muted/30">
                        <TableCell>
                          <Checkbox checked={selected.has(q.id)} onCheckedChange={() => toggleSelect(q.id)} />
                        </TableCell>
                        <TableCell className="font-medium">{q.number}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{q.customer.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(new Date(q.createdAt))}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(q.total)}</TableCell>
                        <TableCell>
                          {sold ? (
                            <Badge>Vendido</Badge>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => openSellDialog(q.id, q.total)}>Registrar</Button>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-1.5">
                                <FileDown className="h-3.5 w-3.5" />
                                Gerar
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center">
                              <DropdownMenuItem onClick={() => handleDownloadPDF(q)}>
                                <FileText className="h-4 w-4 mr-2" />PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadPNG(q)}>
                                <Image className="h-4 w-4 mr-2" />PNG
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadNFe(q)}>
                                <Receipt className="h-4 w-4 mr-2" />Nota Fiscal
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => handleEdit(q.id)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Duplicar" onClick={() => handleDuplicate(q.id)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Excluir" onClick={() => { setDeleteTargetId(q.id); setDeleteDialogOpen(true); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Sell Dialog */}
      <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar venda</DialogTitle>
            <DialogDescription>Informe o valor final da venda (controle manual, usado nas métricas do dashboard).</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sellValue">Valor (R$)</Label>
            <Input id="sellValue" inputMode="decimal" placeholder="Ex: 1.234,56" value={sellValue} onChange={(e) => setSellValue(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSellDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmSell}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete single confirm */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir orçamento?</DialogTitle>
            <DialogDescription>Essa ação não pode ser desfeita. O orçamento será removido permanentemente.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteTargetId && handleDelete(deleteTargetId)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirm */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir {selected.size} orçamento(s)?</DialogTitle>
            <DialogDescription>Todos os orçamentos selecionados serão removidos permanentemente.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleBulkDelete}>Excluir todos</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
