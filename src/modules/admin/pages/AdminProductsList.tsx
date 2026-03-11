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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/formatters";

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

  const [batchOpen, setBatchOpen] = useState(false);
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

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(s));
  }, [q, rows]);

  const activeIds = useMemo(() => rows.filter((r) => r.active).map((r) => r.id), [rows]);

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

    toast({
      title: "Geração iniciada",
      description: `Gerando 5 imagens por produto (sobrescrevendo). Isso pode levar vários minutos.`,
    });

    let done = 0;

    for (const productId of activeIds) {
      if (cancelRef.current) break;

      const { error } = await cloud.functions.invoke("generate-product-images", {
        body: { productId, overwrite: true, count: 5 },
      });

      if (error) {
        toast({
          title: "Falha ao gerar",
          description: String((error as any).message ?? error),
          variant: "destructive",
        });
        // continua para o próximo
      }

      done += 1;
      setBatchDone(done);

      // Pequena pausa para reduzir risco de rate limit
      await new Promise((r) => setTimeout(r, 800));
    }

    setBatchRunning(false);
    runningRef.current = false;

    if (cancelRef.current) {
      toast({ title: "Interrompido", description: `Processado: ${done}/${activeIds.length}` });
    } else {
      toast({ title: "Concluído", description: `Imagens geradas para ${done}/${activeIds.length} produtos.` });
    }

    await load();
  };

  const stopBatch = () => {
    cancelRef.current = true;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
          <p className="text-sm text-muted-foreground">Gerencie catálogo, preços, estoque e status.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => nav("/admin/produtos/imagens")}>
            🔎 Gerador de Imagens
          </Button>
          <AlertDialog open={batchOpen} onOpenChange={setBatchOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={loading || batchRunning}>
                Gerar imagens (IA)
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Gerar imagens para todos os produtos ativos?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso vai <strong>sobrescrever</strong> as imagens existentes e gerar <strong>5 imagens</strong> por produto com fundo neutro.
                  O processo pode levar vários minutos e consome créditos de IA.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={batchRunning}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async (e) => {
                    e.preventDefault();
                    setBatchOpen(false);
                    await startBatch();
                  }}
                  disabled={batchRunning}
                >
                  Iniciar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={() => nav("/admin/produtos/novo")}>Novo produto</Button>
        </div>
      </div>

      {batchRunning ? (
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="font-medium">Gerando imagens…</div>
            <div className="text-sm text-muted-foreground">{batchDone}/{batchTotal} produtos processados</div>
          </div>
          <Button variant="outline" onClick={stopBatch}>
            Parar
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto..." className="md:col-span-2" />
        <Button variant="outline" onClick={load} disabled={loading || batchRunning}>
          Recarregar
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Lista</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-muted-foreground">Nenhum produto.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((p) => (
                <Link
                  key={p.id}
                  to={`/admin/produtos/editar/${p.id}`}
                  className="text-left rounded-xl border border-border bg-card/60 backdrop-blur p-4 hover:bg-muted/30 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium line-clamp-1">{p.name}</div>
                    <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Ativo" : "Inativo"}</Badge>
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
