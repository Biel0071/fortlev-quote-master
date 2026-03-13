import { useState, useRef } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Globe, Loader2, Search, FileSpreadsheet, CheckCircle2, XCircle, Clock } from "lucide-react";
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

export default function AdminProductScraper() {
  const [urlsInput, setUrlsInput] = useState("");
  const [maxPages, setMaxPages] = useState(10);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ScrapedProduct[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<{ totalUrls: number; totalPages: number; totalProducts: number } | null>(null);
  const cancelRef = useRef(false);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const handleScrape = async () => {
    // Parse URLs: split by newline, then also extract multiple URLs from single lines
    const urls: string[] = [];
    for (const line of urlsInput.split(/[\n\r]+/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // If line contains multiple URLs separated by spaces, split them
      const matches = trimmed.match(/https?:\/\/[^\s]+/g);
      if (matches) {
        urls.push(...matches.map(u => u.trim()));
      }
    }

    if (urls.length === 0) {
      toast({ title: "Informe pelo menos uma URL válida", variant: "destructive" });
      return;
    }

    cancelRef.current = false;
    setLoading(true);
    setProducts([]);
    setStats(null);

    const initialQueue: QueueItem[] = urls.map(u => ({ url: u, status: "pending" as const, pages: 0, products: 0 }));
    setQueue(initialQueue);
    setLogs([`📋 Fila: ${urls.length} URL(s) para processar`]);

    let allProducts: ScrapedProduct[] = [];
    let totalPages = 0;

    for (let i = 0; i < urls.length; i++) {
      if (cancelRef.current) {
        addLog(`⛔ Scraping cancelado pelo usuário`);
        break;
      }

      const url = urls[i];
      const dominio = new URL(url).hostname.replace("www.", "");

      // Update queue: mark current as running
      setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: "running" } : q));
      addLog(`\n🔄 [${i + 1}/${urls.length}] ${dominio}`);

      try {
        const { data, error } = await cloud.functions.invoke("scrape-products", {
          body: { url, maxPages },
        });

        if (error) throw new Error(error.message);
        if (!data?.success) throw new Error(data?.error || "Erro desconhecido");

        const urlProducts = data.products || [];
        allProducts = [...allProducts, ...urlProducts];
        totalPages += data.totalPages || 0;

        // Append logs from edge function
        (data.logs || []).forEach((l: string) => addLog(l));

        // Update queue item
        setQueue(prev => prev.map((q, idx) =>
          idx === i ? { ...q, status: "done", pages: data.totalPages || 0, products: urlProducts.length } : q
        ));

        // Update products in real-time
        setProducts(prev => [...prev, ...urlProducts]);
      } catch (e: any) {
        addLog(`❌ Erro em ${dominio}: ${e.message}`);
        setQueue(prev => prev.map((q, idx) =>
          idx === i ? { ...q, status: "failed" } : q
        ));
      }

      // Rate limit between URLs
      if (i < urls.length - 1 && !cancelRef.current) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    // Deduplicate all products
    const seen = new Set<string>();
    const unique = allProducts.filter(p => {
      const key = p.produto.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setProducts(unique);
    setStats({ totalUrls: urls.length, totalPages, totalProducts: unique.length });
    addLog(`\n🏁 Concluído: ${unique.length} produtos únicos de ${totalPages} páginas`);

    toast({
      title: "Scraping concluído",
      description: `${unique.length} produtos em ${totalPages} páginas de ${urls.length} URLs`,
    });

    setLoading(false);
  };

  const handleCancel = () => {
    cancelRef.current = true;
    setLoading(false);
  };

  const handleExportExcel = () => {
    if (products.length === 0) return;
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
    XLSX.writeFile(wb, "produtos_scrape.xlsx");
    toast({ title: "Excel exportado", description: "produtos_scrape.xlsx" });
  };

  const statusIcon = (s: string) => {
    if (s === "done") return <CheckCircle2 className="h-4 w-4 text-primary" />;
    if (s === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
    if (s === "running") return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const urlCount = (urlsInput.match(/https?:\/\/[^\s]+/g) || []).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Globe className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Scraper de Produtos</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Configuração</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={"Cole uma ou mais URLs de categorias (uma por linha):\nhttps://www.cnr.com.br/pisos-e-revestimentos/\nhttps://www.cnr.com.br/banheiro/\nhttps://www.cnr.com.br/material-hidraulico/"}
            value={urlsInput}
            onChange={(e) => setUrlsInput(e.target.value)}
            rows={5}
            disabled={loading}
            className="font-mono text-sm"
          />
          {urlCount > 0 && (
            <p className="text-xs text-muted-foreground">{urlCount} URL(s) detectada(s)</p>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Máx páginas:</span>
              <Input
                type="number"
                min={1}
                max={50}
                value={maxPages}
                onChange={(e) => setMaxPages(Number(e.target.value) || 10)}
                className="w-24"
                disabled={loading}
              />
            </div>
            {loading ? (
              <Button variant="destructive" onClick={handleCancel} className="gap-2">
                Cancelar
              </Button>
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
              Fila de URLs ({queue.filter(q => q.status === "done").length}/{queue.length} concluídas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
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
          {products.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
