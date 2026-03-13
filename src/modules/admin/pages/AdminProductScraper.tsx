import { useState } from "react";
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
  status: string;
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

  const handleScrape = async () => {
    const urls = urlsInput.split(/[\n\r]+/).map(u => u.trim()).filter(u => u.startsWith("http"));
    if (urls.length === 0) {
      toast({ title: "Informe pelo menos uma URL válida", variant: "destructive" });
      return;
    }

    setLoading(true);
    setProducts([]);
    setLogs([`🔍 Iniciando scraping de ${urls.length} URL(s)...`]);
    setStats(null);
    setQueue(urls.map(u => ({ url: u, status: "pending", pages: 0, products: 0 })));

    try {
      const { data, error } = await cloud.functions.invoke("scrape-products", {
        body: { urls, maxPages },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Erro desconhecido");

      setProducts(data.products || []);
      setLogs(data.logs || []);
      setQueue(data.queue || []);
      setStats({ totalUrls: data.totalUrls, totalPages: data.totalPages, totalProducts: data.totalProducts });

      toast({
        title: "Scraping concluído",
        description: `${data.totalProducts} produtos em ${data.totalPages} páginas de ${data.totalUrls} URLs`,
      });
    } catch (e: any) {
      toast({ title: "Erro no scraping", description: e.message, variant: "destructive" });
      setLogs(prev => [...prev, `❌ Erro: ${e.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (products.length === 0) return;
    const rows = products.map((p, i) => ({
      SKU: `SCRP-${String(i + 1).padStart(5, "0")}`,
      Produto: p.produto,
      Preço: p.precoNum ?? "",
      Categoria: "",
      URL: p.url || "",
      Domínio: p.dominio || "",
      Página: p.pagina,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 14 }, { wch: 50 }, { wch: 14 }, { wch: 20 }, { wch: 60 }, { wch: 25 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, "produtos_scrape.xlsx");
    toast({ title: "Excel exportado", description: "produtos_scrape.xlsx" });
  };

  const statusIcon = (s: string) => {
    if (s === "done") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (s === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

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
            placeholder={"Cole uma ou mais URLs de categorias (uma por linha):\nhttps://www.site.com/pisos/\nhttps://www.site.com/tintas/"}
            value={urlsInput}
            onChange={(e) => setUrlsInput(e.target.value)}
            rows={4}
            disabled={loading}
            className="font-mono text-sm"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="number"
              min={1}
              max={50}
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value) || 10)}
              className="w-40"
              placeholder="Máx páginas"
              disabled={loading}
            />
            <Button onClick={handleScrape} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? "Processando..." : "Iniciar Scraping"}
            </Button>
          </div>
          {loading && <Progress value={undefined} className="h-1" />}
        </CardContent>
      </Card>

      {/* Queue */}
      {queue.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Fila de URLs ({queue.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {queue.map((q, i) => (
                <div key={i} className="flex items-center gap-3 text-sm border rounded-md px-3 py-2">
                  {statusIcon(q.status)}
                  <span className="flex-1 font-mono text-xs truncate">{q.url}</span>
                  <Badge variant="secondary" className="text-xs">{q.pages}p</Badge>
                  <Badge variant="outline" className="text-xs">{q.products} prod</Badge>
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
            <ScrollArea className="h-48 rounded-md border bg-muted/30 p-3">
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
