import { useState, useRef, useEffect } from "react";
import { cloud } from "@/lib/cloud";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Globe, Loader2, Search, FileSpreadsheet, CheckCircle2, XCircle, Clock,
  Timer, History, Trash2, Eye,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ScrapedProduct {
  produto: string;
  url: string | null;
  preco: string | null;
  precoNum: number | null;
  pagina: number;
  dominio: string;
}

interface QueueItem {
  url: string;
  status: "pending" | "running" | "done" | "failed";
  pages: number;
  products: number;
}

interface ScrapeHistoryItem {
  id: string;
  created_at: string;
  total_urls: number;
  total_pages: number;
  total_products: number;
  execution_time_seconds: number;
  domains: string[];
  products_json: ScrapedProduct[];
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

function exportProducts(products: ScrapedProduct[], suffix = "") {
  if (products.length === 0) return;
  const ts = new Date().toISOString().slice(0, 16).replace(/[:-]/g, "");
  const rows = products.map((p, i) => ({
    SKU: `SCRP-${String(i + 1).padStart(5, "0")}`,
    Produto: p.produto,
    "Preço": p.precoNum ?? "",
    Categoria: "",
    URL: p.url || "",
    "Domínio": p.dominio || "",
    "Página": p.pagina,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 14 }, { wch: 50 }, { wch: 14 }, { wch: 20 }, { wch: 60 }, { wch: 25 }, { wch: 8 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produtos");
  XLSX.writeFile(wb, `produtos_scrape_${ts}${suffix}.xlsx`);
  toast({ title: "Excel exportado" });
}

function ProductsTable({ products }: { products: ScrapedProduct[] }) {
  return (
    <ScrollArea className="max-h-[500px]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-background border-b">
          <tr>
            <th className="text-left py-2 px-2 w-10">#</th>
            <th className="text-left py-2 px-2">Produto</th>
            <th className="text-left py-2 px-2 w-28">Preço</th>
            <th className="text-left py-2 px-2 w-28">Domínio</th>
            <th className="text-left py-2 px-2 w-16">Pág</th>
            <th className="text-left py-2 px-2 w-20">Link</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-muted/40">
              <td className="py-2 px-2 text-muted-foreground">{i + 1}</td>
              <td className="py-2 px-2 font-medium">{p.produto}</td>
              <td className="py-2 px-2 text-muted-foreground">
                {p.precoNum ? `R$ ${p.precoNum.toFixed(2).replace(".", ",")}` : p.preco || "—"}
              </td>
              <td className="py-2 px-2 text-xs text-muted-foreground">{p.dominio}</td>
              <td className="py-2 px-2 text-center">
                <Badge variant="secondary" className="text-xs">{p.pagina}</Badge>
              </td>
              <td className="py-2 px-2">
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">Ver</a>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}

export default function AdminProductScraper() {
  const [urlsInput, setUrlsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ScrapedProduct[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<{
    totalUrls: number; totalPages: number; totalProducts: number; executionTime: number;
  } | null>(null);
  const [history, setHistory] = useState<ScrapeHistoryItem[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [viewingHistory, setViewingHistory] = useState<ScrapeHistoryItem | null>(null);
  const cancelRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    if (loading) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedTime((Date.now() - startTimeRef.current) / 1000);
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("scrape_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setHistory(data as unknown as ScrapeHistoryItem[]);
  };

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const parseUrls = (input: string): string[] => {
    const urls: string[] = [];
    for (const line of input.split(/[\n\r]+/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const matches = trimmed.match(/https?:\/\/[^\s]+/g);
      if (matches) urls.push(...matches.map(u => u.trim()));
    }
    return urls;
  };

  const handleScrape = async () => {
    const urls = parseUrls(urlsInput);
    if (urls.length === 0) {
      toast({ title: "Informe pelo menos uma URL válida", variant: "destructive" });
      return;
    }

    cancelRef.current = false;
    setLoading(true);
    setProducts([]);
    setStats(null);
    setElapsedTime(0);

    const initialQueue: QueueItem[] = urls.map(u => ({
      url: u, status: "pending" as const, pages: 0, products: 0,
    }));
    setQueue(initialQueue);
    setLogs([`📋 Fila: ${urls.length} URL(s) para processar`]);

    let allProducts: ScrapedProduct[] = [];
    let totalPages = 0;
    const domains = new Set<string>();

    for (let i = 0; i < urls.length; i++) {
      if (cancelRef.current) { addLog(`⛔ Scraping cancelado pelo usuário`); break; }

      const url = urls[i];
      let dominio: string;
      try { dominio = new URL(url).hostname.replace("www.", ""); } catch {
        addLog(`❌ URL inválida: ${url}`);
        setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: "failed" } : q));
        continue;
      }

      domains.add(dominio);
      setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: "running" } : q));
      addLog(`\n🔄 [${i + 1}/${urls.length}] ${dominio}`);

      try {
        const { data, error } = await cloud.functions.invoke("scrape-products", {
          body: { url, maxPages: 0 },
        });
        if (error) throw new Error(error.message);
        if (!data?.success) throw new Error(data?.error || "Erro desconhecido");

        const urlProducts: ScrapedProduct[] = data.products || [];
        allProducts = [...allProducts, ...urlProducts];
        totalPages += data.totalPages || 0;
        (data.logs || []).forEach((l: string) => addLog(l));

        setQueue(prev => prev.map((q, idx) =>
          idx === i ? { ...q, status: "done", pages: data.totalPages || 0, products: urlProducts.length } : q
        ));

        setProducts(prev => {
          const combined = [...prev, ...urlProducts];
          const seen = new Set<string>();
          return combined.filter(p => {
            const key = (p.produto + "|" + (p.url || "")).toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });
      } catch (e: any) {
        addLog(`❌ Erro em ${dominio}: ${e.message}`);
        setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: "failed" } : q));
      }

      if (i < urls.length - 1 && !cancelRef.current) await new Promise(r => setTimeout(r, 1500));
    }

    const seen = new Set<string>();
    const unique = allProducts.filter(p => {
      const key = (p.produto + "|" + (p.url || "")).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const executionTime = (Date.now() - startTimeRef.current) / 1000;
    setProducts(unique);
    setStats({ totalUrls: urls.length, totalPages, totalProducts: unique.length, executionTime });
    addLog(`\n🏁 Concluído: ${unique.length} produtos únicos de ${totalPages} páginas em ${formatDuration(executionTime)}`);

    try {
      await supabase.from("scrape_history").insert({
        total_urls: urls.length,
        total_pages: totalPages,
        total_products: unique.length,
        execution_time_seconds: Math.round(executionTime),
        domains: Array.from(domains),
        products_json: unique as any,
      });
      await loadHistory();
    } catch { /* ignore */ }

    toast({
      title: "Scraping concluído",
      description: `${unique.length} produtos em ${totalPages} páginas (${formatDuration(executionTime)})`,
    });
    setLoading(false);
  };

  const handleCancel = () => { cancelRef.current = true; setLoading(false); };

  const handleDeleteHistory = async (id: string) => {
    await supabase.from("scrape_history").delete().eq("id", id);
    await loadHistory();
  };

  const statusIcon = (s: string) => {
    if (s === "done") return <CheckCircle2 className="h-4 w-4 text-primary" />;
    if (s === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
    if (s === "running") return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const urlCount = parseUrls(urlsInput).length;

  const historyProducts = viewingHistory?.products_json || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Globe className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Scraper de Produtos</h1>
      </div>

      {/* Config */}
      <Card>
        <CardHeader><CardTitle className="text-base">Configuração</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={"Cole uma ou mais URLs de categorias (uma por linha):\nhttps://www.cnr.com.br/pisos-e-revestimentos/\nhttps://www.cnr.com.br/banheiro/"}
            value={urlsInput}
            onChange={(e) => setUrlsInput(e.target.value)}
            rows={5}
            disabled={loading}
            className="font-mono text-sm"
          />
          {urlCount > 0 && (
            <p className="text-xs text-muted-foreground">{urlCount} URL(s) detectada(s) • Paginação ilimitada</p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            {loading ? (
              <>
                <Button variant="destructive" onClick={handleCancel} className="gap-2">Cancelar</Button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="h-4 w-4 animate-pulse" />
                  <span className="font-mono">{formatDuration(elapsedTime)}</span>
                </div>
              </>
            ) : (
              <Button onClick={handleScrape} className="gap-2">
                <Search className="h-4 w-4" />
                Iniciar Scraping
              </Button>
            )}
          </div>
          {loading && <Progress value={undefined} className="h-1" />}
        </CardContent>
      </Card>

      {/* Queue */}
      {queue.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Fila ({queue.filter(q => q.status === "done").length}/{queue.length} concluídas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {queue.map((q, i) => (
                <div key={i} className="flex items-center gap-3 text-sm border rounded-md px-3 py-2">
                  {statusIcon(q.status)}
                  <span className="flex-1 font-mono text-xs truncate">{q.url}</span>
                  {q.status !== "pending" && (
                    <>
                      <Badge variant="secondary" className="text-xs">{q.pages}p</Badge>
                      <Badge variant="outline" className="text-xs">{q.products} prod</Badge>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Logs</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-56 rounded-md border bg-muted/30 p-3">
              <div className="space-y-1 font-mono text-xs">
                {logs.map((log, i) => (
                  <div key={i} className="text-muted-foreground">{log}</div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Stats + Export */}
      {stats && (
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant="outline" className="text-sm px-3 py-1">🌐 {stats.totalUrls} URLs</Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">📄 {stats.totalPages} páginas</Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">📦 {stats.totalProducts} produtos</Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">⏱️ {formatDuration(stats.executionTime)}</Badge>
          {products.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => exportProducts(products)} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Exportar Excel
            </Button>
          )}
        </div>
      )}

      {/* Results Table */}
      {products.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Produtos encontrados ({products.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductsTable products={products} />
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico de Scraping
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center gap-3 text-sm border rounded-md px-3 py-2">
                  <span className="text-xs text-muted-foreground min-w-[120px]">
                    {new Date(h.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <Badge variant="secondary" className="text-xs">{h.total_urls} URLs</Badge>
                  <Badge variant="outline" className="text-xs">{h.total_pages} pág</Badge>
                  <Badge variant="outline" className="text-xs">{h.total_products} prod</Badge>
                  <span className="text-xs text-muted-foreground font-mono">{formatDuration(h.execution_time_seconds)}</span>
                  {h.domains?.length > 0 && (
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">{h.domains.join(", ")}</span>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setViewingHistory(h)}>
                      <Eye className="h-3 w-3" />
                      Ver
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteHistory(h.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Detail Dialog */}
      <Dialog open={!!viewingHistory} onOpenChange={(open) => !open && setViewingHistory(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              Resultado do Scraping —{" "}
              {viewingHistory && new Date(viewingHistory.created_at).toLocaleString("pt-BR", {
                day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
              })}
            </DialogTitle>
          </DialogHeader>

          {viewingHistory && (
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="text-xs">🌐 {viewingHistory.total_urls} URLs</Badge>
                <Badge variant="outline" className="text-xs">📄 {viewingHistory.total_pages} pág</Badge>
                <Badge variant="outline" className="text-xs">📦 {viewingHistory.total_products} prod</Badge>
                <Badge variant="outline" className="text-xs">⏱️ {formatDuration(viewingHistory.execution_time_seconds)}</Badge>
                {viewingHistory.domains?.length > 0 && (
                  <span className="text-xs text-muted-foreground">{viewingHistory.domains.join(", ")}</span>
                )}
                {historyProducts.length > 0 && (
                  <Button variant="outline" size="sm" className="gap-1 text-xs ml-auto" onClick={() => exportProducts(historyProducts, "_hist")}>
                    <FileSpreadsheet className="h-3 w-3" />
                    Exportar Excel
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-auto">
                {historyProducts.length > 0 ? (
                  <ProductsTable products={historyProducts} />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Dados dos produtos não disponíveis para este registro.
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
