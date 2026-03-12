import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/formatters";
import { Copy, Download, Pencil, Power, Trash2 } from "lucide-react";

type Row = {
  id: string;
  name: string;
  price: number;
  promo_price: number;
  stock: number;
  active: boolean;
};

export default function AdminProductsList() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);

  const [batchRunning, setBatchRunning] = useState(false);
  const [batchDone, setBatchDone] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const cancelRef = useRef(false);
  const runningRef = useRef(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await cloud
      .from("store_products")
      .select("id, name, price, promo_price, stock, active")
      .order("name", { ascending: true });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows((data ?? []) as any);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(s));
  }, [q, rows]);

  const activeIds = useMemo(() => rows.filter((r) => r.active).map((r) => r.id), [rows]);

  const toggleActive = async (p: Row) => {
    const { error } = await cloud
      .from("store_products")
      .update({ active: !p.active } as any)
      .eq("id", p.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: p.active ? "Desativado" : "Ativado", description: p.name });
      setRows((prev) => prev.map((r) => (r.id === p.id ? { ...r, active: !r.active } : r)));
    }
  };

  const duplicateProduct = async (p: Row) => {
    const { data: original, error: fetchErr } = await cloud
      .from("store_products")
      .select("*")
      .eq("id", p.id)
      .single();
    if (fetchErr || !original) {
      toast({ title: "Erro ao duplicar", description: fetchErr?.message ?? "Produto não encontrado", variant: "destructive" });
      return;
    }
    const { id, created_at, updated_at, views, clicks, sales, source_id, sku, ...rest } = original as any;
    const { data: newProd, error: insertErr } = await cloud
      .from("store_products")
      .insert({
        ...rest,
        name: `${rest.name} (cópia)`,
        active: false,
        status: "draft",
        source_id: null,
        sku: null,
      } as any)
      .select("id, name, price, promo_price, stock, active")
      .single();
    if (insertErr) {
      toast({ title: "Erro ao duplicar", description: insertErr.message, variant: "destructive" });
    } else if (newProd) {
      toast({ title: "Duplicado", description: `${(newProd as any).name} criado como rascunho.` });
      setRows((prev) => [...prev, newProd as any]);
    }
  };

  const deleteProduct = async () => {
    if (!deleteTarget) return;
    await cloud.from("store_product_images").delete().eq("product_id", deleteTarget.id);
    const { error } = await cloud.from("store_products").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Excluído", description: deleteTarget.name });
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const startBatch = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    cancelRef.current = false;
    setBatchRunning(true);
    setBatchDone(0);
    setBatchTotal(activeIds.length);

    if (activeIds.length === 0) {
      toast({ title: "Nada para fazer", description: "Nenhum produto ativo encontrado." });
      setBatchRunning(false);
      runningRef.current = false;
      return;
    }

    let done = 0;
    for (const productId of activeIds) {
      if (cancelRef.current) break;
      const { error } = await cloud.functions.invoke("generate-product-images", {
        body: { productId, overwrite: true, count: 5 },
      });
      if (error) {
        toast({ title: "Falha ao gerar", description: String((error as any).message ?? error), variant: "destructive" });
      }
      done += 1;
      setBatchDone(done);
      await new Promise((r) => setTimeout(r, 800));
    }

    setBatchRunning(false);
    runningRef.current = false;
    toast({ title: cancelRef.current ? "Interrompido" : "Concluído", description: `${done}/${activeIds.length} produtos.` });
    await load();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
          <p className="text-sm text-muted-foreground">Gerencie catálogo, preços, estoque e status dos seus produtos.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={exportExcel} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Exportar Excel
          </Button>
          <Button variant="outline" onClick={() => nav("/admin/produtos/imagens")}>
            🔎 Gerador de Imagens
          </Button>
          <Button onClick={() => nav("/admin/produtos/novo")}>Novo produto</Button>
        </div>
      </div>

      {batchRunning && (
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="font-medium">Gerando imagens…</div>
            <div className="text-sm text-muted-foreground">{batchDone}/{batchTotal} produtos processados</div>
          </div>
          <Button variant="outline" onClick={() => { cancelRef.current = true; }}>Parar</Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto..." className="md:col-span-2" />
        <Button variant="outline" onClick={load} disabled={loading || batchRunning}>Recarregar</Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle>Lista</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-muted-foreground">Nenhum produto.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-border bg-card/60 backdrop-blur p-4 hover:bg-muted/30 transition space-y-3"
                >
                  <Link to={`/admin/produtos/editar/${p.id}`} className="block">
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-medium line-clamp-1">{p.name}</div>
                      <Badge variant={p.active ? "default" : "secondary"} className="shrink-0">
                        {p.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground flex items-center justify-between">
                      <span>Estoque: {p.stock}</span>
                      <span className="font-semibold text-foreground">
                        {p.promo_price > 0 ? formatCurrency(Number(p.promo_price)) : formatCurrency(Number(p.price))}
                      </span>
                    </div>
                    {p.promo_price > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">Preço normal: {formatCurrency(Number(p.price))}</div>
                    )}
                  </Link>

                  {/* Action buttons row */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                    <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => nav(`/admin/produtos/editar/${p.id}`)}>
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => duplicateProduct(p)}>
                      <Copy className="h-3 w-3 mr-1" /> Duplicar
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => toggleActive(p)}>
                      <Power className="h-3 w-3 mr-1" /> {p.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              O produto <strong>{deleteTarget?.name}</strong> será removido permanentemente junto com suas imagens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}