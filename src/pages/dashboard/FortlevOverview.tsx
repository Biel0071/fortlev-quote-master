import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { BarChart3, DollarSign, Receipt, TrendingUp, Plus, Pencil, Copy, Trash2, FileText, Image, FileDown, MoreHorizontal, Building2, Users, Search, Filter, Eye } from "lucide-react";
import SmartQuotationGenerator from "@/components/admin/SmartQuotationGenerator";
import { useQuotations } from "@/hooks/useQuotations";
import { useSales } from "@/hooks/useSales";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { downloadPDF, downloadPNG } from "@/utils/pdfGenerator";
import { downloadNFePDF } from "@/utils/nfeGenerator";
import { toast } from "@/hooks/use-toast";
import { QuotationPreview } from "@/components/QuotationPreview";
import { Quotation, FiscalStatus } from "@/types/quotation";
import { FiscalStatusBadge } from "@/components/FiscalStatusBadge";
import { authorizeFiscalQuotation } from "@/utils/fiscalService";
import { ShieldCheck } from "lucide-react";


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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);

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
    selected.size === filteredQuotations.length ? setSelected(new Set()) : setSelected(new Set(filteredQuotations.map((q) => q.id)));
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
      await downloadNFePDF(q);
      toast({ title: "Nota Fiscal gerada com sucesso" });
    } catch { toast({ title: "Erro ao gerar NFe", variant: "destructive" }); }
  };

  const handlePreview = (q: Quotation) => {
    setPreviewQuotation(q);
    setPreviewOpen(true);
  };

  const handleAuthorizeFiscal = async (q: Quotation) => {
    try {
      const updated = await authorizeFiscalQuotation(q, true);
      toast({ 
        title: "Nota Autorizada", 
        description: `NF-e ${updated.fiscal?.invoiceNumber} emitida com sucesso.` 
      });
      // Update local state if needed (useQuotations might need a way to refresh)
      window.location.reload(); // Quickest way to sync state for now
    } catch (error: any) {
      toast({ 
        title: "Erro na Autorização", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel Fortlev</h1>
          <p className="text-muted-foreground">Gestão inteligente de orçamentos e propostas comerciais.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" className="gap-2">
             <Filter className="h-4 w-4" /> Filtros
           </Button>
           <Button onClick={() => navigate("/orcamentos")} className="gap-2">
             <Plus className="h-4 w-4" /> Novo Orçamento
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <SmartQuotationGenerator onItemsGenerated={(items, nearestFactory, customerData) => {
            console.log("Items generated:", items);
            // Store items, factory and customer in session storage to be picked up by the quotation page
            sessionStorage.setItem("smart_quotation_items", JSON.stringify(items));
            if (nearestFactory) {
              sessionStorage.setItem("smart_quotation_factory", JSON.stringify(nearestFactory));
            }
            if (customerData) {
              sessionStorage.setItem("smart_quotation_customer", JSON.stringify(customerData));
            }
            toast({ title: "Gerador Inteligente", description: "Itens e dados do cliente processados." });
            navigate("/orcamentos");
          }} />
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="premium-card bg-card/50 backdrop-blur-sm border-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Orçamentos</p>
                    <p className="text-lg font-bold truncate">{quotations.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="premium-card bg-card/50 backdrop-blur-sm border-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Total orçado</p>
                    <p className="text-lg font-bold truncate">{formatCurrency(totalQuoted)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="premium-card bg-card/50 backdrop-blur-sm border-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Vendas</p>
                    <p className="text-lg font-bold truncate">{formatCurrency(totalSales)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="premium-card bg-card/50 backdrop-blur-sm border-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Conversão</p>
                    <p className="text-lg font-bold truncate">{conversion.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="premium-card bg-card/50 backdrop-blur-sm border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-primary" />
                Desempenho Comercial
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sales.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">Sem dados para exibir</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={last7DaysSales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(value: number) => [formatCurrency(value), "Vendas"]} />
                    <Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" fill="url(#colorSales)" />
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-8 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por cliente ou nº do orçamento..." 
            className="pl-9 bg-card/50 border-primary/10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="bg-card/50 border border-primary/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
          value={selectedIssuerId}
          onChange={(e) => setSelectedIssuerId(e.target.value)}
        >
          <option value="all">Todas as Unidades</option>
          {issuers.map(i => (
            <option key={i.id} value={i.id}>{i.trading_name || i.name}</option>
          ))}
        </select>
      </div>

      {/* Quotations table */}
      <Card className="premium-card">
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
          {filteredQuotations.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Nenhum orçamento encontrado com os filtros atuais.</div>
          ) : (
            <div className="premium-table-container">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10">
                      <Checkbox checked={selected.size === filteredQuotations.length && filteredQuotations.length > 0} onCheckedChange={toggleAll} />
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
                  {filteredQuotations.map((q) => {
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
                          <div className="flex flex-col gap-1">
                            {sold ? (
                              <Badge variant="secondary" className="w-fit">Vendido</Badge>
                            ) : (
                              <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => openSellDialog(q.id, q.total)}>Vender</Button>
                            )}
                            <FiscalStatusBadge status={q.fiscal?.status} className="text-[9px] py-0 px-1.5" />
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-1.5">
                                <FileDown className="h-3.5 w-3.5" />
                                NF-e / Docs
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              {!q.fiscal?.accessKey && (
                                <DropdownMenuItem onClick={() => handleAuthorizeFiscal(q)} className="text-blue-600 font-semibold">
                                  <ShieldCheck className="h-4 w-4 mr-2" />
                                  Autorizar NF-e (Oficial)
                                </DropdownMenuItem>
                              )}

                               <DropdownMenuItem onClick={() => handlePreview(q as any)}>
                                <Eye className="h-4 w-4 mr-2 text-primary" />Pré-visualizar
                              </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleDownloadPDF(q)}>
                                <FileDown className="h-4 w-4 mr-2" />Baixar Orçamento PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadPNG(q)}>
                                <Image className="h-4 w-4 mr-2" />Baixar Orçamento PNG
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadNFe(q)}>
                                <Receipt className="h-4 w-4 mr-2" />Baixar DANFE / NF-e
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
      <QuotationPreview 
        quotation={previewQuotation}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onDownloadPDF={() => previewQuotation && handleDownloadPDF(previewQuotation)}
        onDownloadPNG={() => previewQuotation && handleDownloadPNG(previewQuotation)}
        onDownloadDANFE={() => previewQuotation && handleDownloadNFe(previewQuotation)}
      />
    </div>
  );
}
