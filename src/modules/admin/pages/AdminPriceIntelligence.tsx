import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/formatters";
import {
  ArrowLeft, Brain, Save, Plus, Trash2, Search, Play, Loader2,
  CheckCircle, XCircle, AlertTriangle, BarChart3, Bug, TrendingUp, TrendingDown,
  DollarSign, Activity, Shield,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PriceRow {
  id: string;
  categoria: string;
  unidade: string;
  preco_min: number;
  preco_max: number;
  preco_medio: number;
}

export default function AdminPriceIntelligence() {
  const nav = useNavigate();
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [newRow, setNewRow] = useState({ categoria: "", unidade: "unidade", preco_min: 0, preco_max: 0, preco_medio: 0 });
  const [activeTab, setActiveTab] = useState("ranges");

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [fixing, setFixing] = useState(false);
  const [fixReport, setFixReport] = useState<any>(null);

  useEffect(() => { loadRows(); }, []);

  const loadRows = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("price_intelligence" as any)
      .select("*")
      .order("categoria");
    if (data) setRows(data as unknown as PriceRow[]);
    setLoading(false);
  };

  const handleSave = async (row: PriceRow) => {
    setSaving(true);
    const { error } = await supabase
      .from("price_intelligence" as any)
      .update({ preco_min: row.preco_min, preco_max: row.preco_max, preco_medio: row.preco_medio } as any)
      .eq("id", row.id);
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else toast({ title: "Faixa atualizada" });
    setSaving(false);
  };

  const handleAdd = async () => {
    if (!newRow.categoria.trim()) {
      toast({ title: "Categoria obrigatória", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("price_intelligence" as any)
      .insert({ ...newRow } as any);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Faixa adicionada" });
      setNewRow({ categoria: "", unidade: "unidade", preco_min: 0, preco_max: 0, preco_medio: 0 });
      await loadRows();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("price_intelligence" as any).delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Faixa removida" });
      setRows(prev => prev.filter(r => r.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof PriceRow, value: number) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setReport(null);
    try {
      const { data, error } = await cloud.functions.invoke("batch-product-ops", { body: { action: "analyze_prices" } });
      if (error) throw error;
      setReport(data?.report ?? data);
      setActiveTab("validation");
      toast({ title: "Análise concluída", description: `${data?.report?.analyzed ?? 0} produtos analisados` });
    } catch (e) {
      toast({ title: "Erro na análise", description: String(e), variant: "destructive" });
    }
    setAnalyzing(false);
  };

  const runFix = async () => {
    setFixing(true);
    setFixReport(null);
    try {
      const { data, error } = await cloud.functions.invoke("batch-product-ops", { body: { action: "validate_prices" } });
      if (error) throw error;
      setFixReport(data);
      toast({ title: "Correção concluída", description: `${data?.corrected ?? 0} preços corrigidos` });
    } catch (e) {
      toast({ title: "Erro na correção", description: String(e), variant: "destructive" });
    }
    setFixing(false);
  };

  const filtered = search
    ? rows.filter(r => r.categoria.toLowerCase().includes(search.toLowerCase()) || r.unidade.toLowerCase().includes(search.toLowerCase()))
    : rows;

  const sortedCategories = useMemo(() => {
    if (!report?.by_category) return [];
    return Object.entries(report.by_category)
      .sort(([, a]: any, [, b]: any) => b.bugs - a.bugs || b.total - a.total)
      .map(([name, stats]) => ({ name, ...(stats as any) }));
  }, [report]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Brain className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Inteligência de Preço</h1>
        <Badge variant="secondary" className="ml-auto">{rows.length} faixas</Badge>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={runAnalysis} disabled={analyzing || fixing} className="gap-2">
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
          {analyzing ? "Analisando..." : "Analisar Preços"}
        </Button>
        <Button onClick={runFix} disabled={analyzing || fixing} variant="outline" className="gap-2">
          {fixing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
          {fixing ? "Corrigindo..." : "Corrigir Preços Automaticamente"}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="ranges">Faixas</TabsTrigger>
          <TabsTrigger value="validation" disabled={!report}>
            Validação {report && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{report.analyzed}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="bugs" disabled={!report}>
            Bugs {report && report.bug_count > 0 && <Badge variant="destructive" className="ml-1 text-[10px] h-4 px-1">{report.bug_count}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="margins" disabled={!report}>
            Margens {report && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{(report.margin_low || 0) + (report.margin_high || 0)}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="fix" disabled={!fixReport}>
            Correções {fixReport && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{fixReport.corrected}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ─── FAIXAS TAB ─── */}
        <TabsContent value="ranges" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure as faixas de preço por categoria e unidade. Produtos com preços fora dessas faixas serão marcados como suspeitos.
          </p>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Adicionar nova faixa</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 flex-wrap">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Categoria</label>
                  <Input className="w-36 h-8 text-sm" value={newRow.categoria} onChange={e => setNewRow(p => ({ ...p, categoria: e.target.value }))} placeholder="ex: cimento" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Unidade</label>
                  <Input className="w-24 h-8 text-sm" value={newRow.unidade} onChange={e => setNewRow(p => ({ ...p, unidade: e.target.value }))} placeholder="saco" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Mín</label>
                  <Input type="number" step="0.01" className="w-20 h-8 text-sm" value={newRow.preco_min} onChange={e => setNewRow(p => ({ ...p, preco_min: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Máx</label>
                  <Input type="number" step="0.01" className="w-20 h-8 text-sm" value={newRow.preco_max} onChange={e => setNewRow(p => ({ ...p, preco_max: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Médio</label>
                  <Input type="number" step="0.01" className="w-20 h-8 text-sm" value={newRow.preco_medio} onChange={e => setNewRow(p => ({ ...p, preco_medio: parseFloat(e.target.value) || 0 }))} />
                </div>
                <Button size="sm" className="h-8 gap-1" onClick={handleAdd}><Plus className="h-3 w-3" /> Adicionar</Button>
              </div>
            </CardContent>
          </Card>

          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 h-8 text-sm" placeholder="Buscar categoria..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[600px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b z-10">
                    <tr>
                      <th className="text-left py-2.5 px-3">Categoria</th>
                      <th className="text-left py-2.5 px-3 w-24">Unidade</th>
                      <th className="text-center py-2.5 px-3 w-24">Mín (R$)</th>
                      <th className="text-center py-2.5 px-3 w-24">Máx (R$)</th>
                      <th className="text-center py-2.5 px-3 w-24">Médio (R$)</th>
                      <th className="text-center py-2.5 px-3 w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma faixa encontrada</td></tr>
                    ) : filtered.map(row => (
                      <tr key={row.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="py-2 px-3 font-medium capitalize">{row.categoria}</td>
                        <td className="py-2 px-3"><Badge variant="outline" className="text-xs">{row.unidade}</Badge></td>
                        <td className="py-2 px-3">
                          <Input type="number" step="0.01" className="h-7 text-xs text-center w-20 mx-auto" value={row.preco_min} onChange={e => updateRow(row.id, "preco_min", parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="py-2 px-3">
                          <Input type="number" step="0.01" className="h-7 text-xs text-center w-20 mx-auto" value={row.preco_max} onChange={e => updateRow(row.id, "preco_max", parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="py-2 px-3">
                          <Input type="number" step="0.01" className="h-7 text-xs text-center w-20 mx-auto" value={row.preco_medio} onChange={e => updateRow(row.id, "preco_medio", parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSave(row)} disabled={saving}><Save className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(row.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── VALIDATION TAB ─── */}
        <TabsContent value="validation" className="space-y-4">
          {report && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard icon={Activity} label="Analisados" value={report.analyzed} color="text-foreground" />
                <StatCard icon={CheckCircle} label="Preço OK" value={report.price_ok} color="text-green-600 dark:text-green-400" />
                <StatCard icon={TrendingUp} label="Acima da faixa" value={report.price_above_range} color="text-amber-600 dark:text-amber-400" />
                <StatCard icon={TrendingDown} label="Abaixo da faixa" value={report.price_below_range} color="text-orange-600 dark:text-orange-400" />
                <StatCard icon={XCircle} label="Preço zero" value={report.price_zero} color="text-destructive" />
                <StatCard icon={DollarSign} label="Sem categoria" value={report.skipped} color="text-muted-foreground" />
              </div>

              {/* Health bar */}
              {report.analyzed > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Saúde dos preços</span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">{Math.round((report.price_ok / report.analyzed) * 100)}%</span>
                    </div>
                    <Progress value={(report.price_ok / report.analyzed) * 100} className="h-3" />
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> OK</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Acima</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Abaixo</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Zero</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Category breakdown */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Por categoria</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-72">
                    <div className="divide-y">
                      {sortedCategories.map((c: any) => (
                        <div key={c.name} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30">
                          <span className="font-medium capitalize text-sm">{c.name}</span>
                          <div className="flex items-center gap-3 text-xs">
                            <span>{c.total} total</span>
                            {c.ok > 0 && <span className="text-green-600 dark:text-green-400">{c.ok} ok</span>}
                            {c.above > 0 && <span className="text-amber-600 dark:text-amber-400">{c.above} acima</span>}
                            {c.below > 0 && <span className="text-orange-600 dark:text-orange-400">{c.below} abaixo</span>}
                            {c.zero > 0 && <span className="text-destructive">{c.zero} zero</span>}
                            {c.bugs > 0 && <Badge variant="destructive" className="text-[10px] h-4 px-1">{c.bugs} bugs</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Products above range */}
              {report.products_above?.length > 0 && (
                <ProductList title="Produtos acima da faixa" items={report.products_above} type="above" />
              )}

              {/* Products below range */}
              {report.products_below?.length > 0 && (
                <ProductList title="Produtos abaixo da faixa" items={report.products_below} type="below" />
              )}

              {/* Products with zero price */}
              {report.products_zero?.length > 0 && (
                <ProductList title="Produtos sem preço" items={report.products_zero} type="zero" />
              )}
            </>
          )}
        </TabsContent>

        {/* ─── BUGS TAB ─── */}
        <TabsContent value="bugs" className="space-y-4">
          {report && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={Bug} label="Bugs encontrados" value={report.bug_count} color="text-destructive" />
                <StatCard icon={AlertTriangle} label="Promo inválidas" value={report.promo_invalid} color="text-amber-600 dark:text-amber-400" />
                <StatCard icon={CheckCircle} label="Promo OK" value={report.promo_ok} color="text-green-600 dark:text-green-400" />
                <StatCard icon={Activity} label="Produtos com bugs" value={report.bugs?.length ?? 0} color="text-destructive" />
              </div>

              {report.bugs?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bug className="h-4 w-4 text-destructive" /> Bugs detectados</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="max-h-[500px]">
                      <div className="divide-y">
                        {report.bugs.map((b: any, i: number) => (
                          <div key={i} className="px-4 py-3 hover:bg-muted/30">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{b.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{b.category} · {b.unit}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold">{formatCurrency(b.price)}</p>
                                {b.promo_price > 0 && <p className="text-xs text-muted-foreground">Promo: {formatCurrency(b.promo_price)}</p>}
                              </div>
                            </div>
                            <div className="mt-1.5 space-y-1">
                              {b.bugs.map((bug: string, j: number) => (
                                <div key={j} className="flex items-center gap-1.5 text-xs text-destructive">
                                  <Bug className="h-3 w-3 shrink-0" />
                                  <span>{bug}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {report.promo_bugs?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Promoções com problemas</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="max-h-64">
                      <div className="divide-y">
                        {report.promo_bugs.map((b: any, i: number) => (
                          <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 text-sm">
                            <span className="truncate flex-1 min-w-0">{b.name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span>{formatCurrency(b.price)}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-amber-600 dark:text-amber-400">{formatCurrency(b.promo_price)}</span>
                              <Badge variant="outline" className="text-[10px]">{b.issue}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {report.bug_count === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p className="font-medium">Nenhum bug encontrado!</p>
                    <p className="text-sm text-muted-foreground mt-1">Todos os preços estão consistentes.</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ─── MARGINS TAB ─── */}
        <TabsContent value="margins" className="space-y-4">
          {report && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <StatCard icon={CheckCircle} label="Margem OK" value={report.margin_ok} color="text-green-600 dark:text-green-400" />
                <StatCard icon={TrendingDown} label="Margem baixa" value={report.margin_low} color="text-amber-600 dark:text-amber-400" />
                <StatCard icon={TrendingUp} label="Margem alta" value={report.margin_high} color="text-blue-600 dark:text-blue-400" />
                <StatCard icon={XCircle} label="Abaixo da faixa" value={report.margin_below} color="text-orange-600 dark:text-orange-400" />
                <StatCard icon={AlertTriangle} label="Acima da faixa" value={report.margin_above} color="text-destructive" />
              </div>

              {/* Margin health */}
              {report.analyzed > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Distribuição de margem</span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        {Math.round((report.margin_ok / Math.max(1, report.analyzed - report.skipped)) * 100)}% na faixa ideal
                      </span>
                    </div>
                    <div className="h-6 rounded-full overflow-hidden flex bg-muted">
                      {[
                        { value: report.margin_below, color: "bg-orange-500", label: "Abaixo" },
                        { value: report.margin_low, color: "bg-amber-500", label: "Baixa" },
                        { value: report.margin_ok, color: "bg-green-500", label: "OK" },
                        { value: report.margin_high, color: "bg-blue-500", label: "Alta" },
                        { value: report.margin_above, color: "bg-red-500", label: "Acima" },
                      ].filter(s => s.value > 0).map((s, i) => {
                        const total = report.analyzed - report.skipped;
                        const pct = total > 0 ? (s.value / total) * 100 : 0;
                        return (
                          <div key={i} className={`${s.color} h-full transition-all`} style={{ width: `${pct}%` }} title={`${s.label}: ${s.value} (${Math.round(pct)}%)`} />
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Abaixo</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Margem baixa</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> OK (15-85%)</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Margem alta</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Acima</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Category comparison */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Preços reais vs. Faixas esperadas</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-80">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-background border-b">
                        <tr>
                          <th className="text-left py-2 px-3">Categoria</th>
                          <th className="text-center py-2 px-3">Faixa esperada</th>
                          <th className="text-center py-2 px-3">Preço real médio</th>
                          <th className="text-center py-2 px-3">Mín real</th>
                          <th className="text-center py-2 px-3">Máx real</th>
                          <th className="text-center py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCategories.map((c: any) => {
                          const diff = c.avg_price > 0 ? ((c.avg_price - c.range_avg) / c.range_avg * 100) : 0;
                          const status = Math.abs(diff) < 20 ? "ok" : diff > 0 ? "alto" : "baixo";
                          return (
                            <tr key={c.name} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="py-2 px-3 font-medium capitalize">{c.name}</td>
                              <td className="py-2 px-3 text-center text-muted-foreground">{formatCurrency(c.range_min)} - {formatCurrency(c.range_max)}</td>
                              <td className="py-2 px-3 text-center font-bold">{c.avg_price > 0 ? formatCurrency(c.avg_price) : "—"}</td>
                              <td className="py-2 px-3 text-center">{c.min_price > 0 ? formatCurrency(c.min_price) : "—"}</td>
                              <td className="py-2 px-3 text-center">{c.max_price > 0 ? formatCurrency(c.max_price) : "—"}</td>
                              <td className="py-2 px-3 text-center">
                                <Badge variant={status === "ok" ? "default" : "destructive"} className="text-[10px]">
                                  {status === "ok" ? "OK" : diff > 0 ? `+${Math.round(diff)}%` : `${Math.round(diff)}%`}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Products with margin issues */}
              {report.products_margin_issues?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Produtos com margem fora do padrão</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="max-h-64">
                      <div className="divide-y">
                        {report.products_margin_issues.map((p: any, i: number) => (
                          <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 text-sm gap-2">
                            <span className="truncate flex-1 min-w-0">{p.name}</span>
                            <span className="font-bold shrink-0">{formatCurrency(p.price)}</span>
                            <Badge variant={p.margin === "margem_baixa" ? "secondary" : "outline"} className="text-[10px] shrink-0">
                              {p.margin === "margem_baixa" ? "↓ Baixa" : "↑ Alta"} ({p.position}%)
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ─── FIX REPORT TAB ─── */}
        <TabsContent value="fix" className="space-y-4">
          {fixReport && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard icon={Activity} label="Total" value={fixReport.total} color="text-foreground" />
                <StatCard icon={CheckCircle} label="Validados" value={fixReport.validated} color="text-green-600 dark:text-green-400" />
                <StatCard icon={Shield} label="Corrigidos" value={fixReport.corrected} color="text-amber-600 dark:text-amber-400" />
                <StatCard icon={DollarSign} label="Promos fixadas" value={fixReport.promo_fixed} color="text-blue-600 dark:text-blue-400" />
                <StatCard icon={XCircle} label="Zeros fixados" value={fixReport.zero_price_fixed} color="text-orange-600 dark:text-orange-400" />
                <StatCard icon={AlertTriangle} label="Erros" value={fixReport.errors} color="text-destructive" />
              </div>

              {fixReport.by_category && Object.keys(fixReport.by_category).length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Correções por categoria</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="max-h-48">
                      <div className="divide-y">
                        {Object.entries(fixReport.by_category)
                          .sort(([, a]: any, [, b]: any) => b.corrected - a.corrected)
                          .map(([cat, stats]: any) => (
                            <div key={cat} className="flex items-center justify-between px-4 py-2 text-xs hover:bg-muted/30">
                              <span className="font-medium capitalize">{cat}</span>
                              <div className="flex items-center gap-3 text-muted-foreground">
                                <span>{stats.total} total</span>
                                {stats.corrected > 0 && <span className="text-amber-600 dark:text-amber-400">{stats.corrected} fixados</span>}
                                {stats.errors > 0 && <span className="text-destructive">{stats.errors} erros</span>}
                                {stats.ok > 0 && <span className="text-green-600 dark:text-green-400">{stats.ok} ok</span>}
                              </div>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {fixReport.details?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Detalhes das correções ({fixReport.details.length})</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="max-h-64">
                      <div className="divide-y">
                        {fixReport.details.slice(0, 80).map((d: any, i: number) => (
                          <div key={i} className="flex items-center justify-between px-4 py-2 text-xs hover:bg-muted/30 gap-2">
                            <span className="truncate flex-1 min-w-0">{d.name}</span>
                            {d.action === "corrected" || d.action === "zero_fixed" ? (
                              <span className="shrink-0 text-amber-600 dark:text-amber-400">
                                {formatCurrency(d.original)} → {formatCurrency(d.corrected)}
                              </span>
                            ) : (
                              <span className="shrink-0 text-destructive">
                                {formatCurrency(d.price)} (fora da faixa)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Helper components ──

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
        <p className={`text-xl font-bold ${color}`}>{value ?? 0}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      </CardContent>
    </Card>
  );
}

function ProductList({ title, items, type }: { title: string; items: any[]; type: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title} ({items.length})</CardTitle></CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-48">
          <div className="divide-y">
            {items.slice(0, 50).map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-4 py-2 text-xs hover:bg-muted/30 gap-2">
                <span className="truncate flex-1 min-w-0">{p.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold">{formatCurrency(p.price)}</span>
                  {type === "above" && p.suggestion && (
                    <span className="text-muted-foreground">sugestão: {formatCurrency(p.suggestion)}</span>
                  )}
                  {type === "below" && p.suggestion && (
                    <span className="text-muted-foreground">sugestão: {formatCurrency(p.suggestion)}</span>
                  )}
                  <Badge variant="outline" className="text-[10px] capitalize">{p.category}</Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
