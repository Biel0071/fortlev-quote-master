import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Brain, Save, Plus, Trash2, Search } from "lucide-react";
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

  const filtered = search
    ? rows.filter(r => r.categoria.toLowerCase().includes(search.toLowerCase()) || r.unidade.toLowerCase().includes(search.toLowerCase()))
    : rows;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Brain className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Inteligência de Preço</h1>
        <Badge variant="secondary" className="ml-auto">{rows.length} faixas</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Configure as faixas de preço por categoria e unidade. Produtos com preços fora dessas faixas serão marcados como suspeitos durante importação e scraping.
      </p>

      {/* Add new */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Adicionar nova faixa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 flex-wrap">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Categoria</label>
              <Input
                className="w-36 h-8 text-sm"
                value={newRow.categoria}
                onChange={e => setNewRow(p => ({ ...p, categoria: e.target.value }))}
                placeholder="ex: cimento"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Unidade</label>
              <Input
                className="w-24 h-8 text-sm"
                value={newRow.unidade}
                onChange={e => setNewRow(p => ({ ...p, unidade: e.target.value }))}
                placeholder="saco"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Mín</label>
              <Input
                type="number" step="0.01" className="w-20 h-8 text-sm"
                value={newRow.preco_min}
                onChange={e => setNewRow(p => ({ ...p, preco_min: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Máx</label>
              <Input
                type="number" step="0.01" className="w-20 h-8 text-sm"
                value={newRow.preco_max}
                onChange={e => setNewRow(p => ({ ...p, preco_max: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Médio</label>
              <Input
                type="number" step="0.01" className="w-20 h-8 text-sm"
                value={newRow.preco_medio}
                onChange={e => setNewRow(p => ({ ...p, preco_medio: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <Button size="sm" className="h-8 gap-1" onClick={handleAdd}>
              <Plus className="h-3 w-3" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8 h-8 text-sm"
          placeholder="Buscar categoria..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
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
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-xs">{row.unidade}</Badge>
                    </td>
                    <td className="py-2 px-3">
                      <Input
                        type="number" step="0.01"
                        className="h-7 text-xs text-center w-20 mx-auto"
                        value={row.preco_min}
                        onChange={e => updateRow(row.id, "preco_min", parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <Input
                        type="number" step="0.01"
                        className="h-7 text-xs text-center w-20 mx-auto"
                        value={row.preco_max}
                        onChange={e => updateRow(row.id, "preco_max", parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <Input
                        type="number" step="0.01"
                        className="h-7 text-xs text-center w-20 mx-auto"
                        value={row.preco_medio}
                        onChange={e => updateRow(row.id, "preco_medio", parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSave(row)} disabled={saving}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(row.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
