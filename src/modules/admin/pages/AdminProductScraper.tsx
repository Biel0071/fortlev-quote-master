import { useState, useRef } from "react";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Download, Globe, Loader2, Search, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

interface ScrapedProduct {
  produto: string;
  url: string | null;
  preco: string | null;
  pagina: number;
}

export default function AdminProductScraper() {
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(10);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ScrapedProduct[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState<{ totalPages: number; totalProducts: number } | null>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  const handleScrape = async () => {
    if (!url.trim()) {
      toast({ title: "Informe a URL da categoria", variant: "destructive" });
      return;
    }
    setLoading(true);
    setProducts([]);
    setLogs(["🔍 Iniciando scraping..."]);
    setStats(null);

    try {
      const { data, error } = await cloud.functions.invoke("scrape-products", {
        body: { url: url.trim(), maxPages },
      });

      if (error) throw new Error(error.message);

      if (!data?.success) {
        throw new Error(data?.error || "Erro desconhecido");
      }

      setProducts(data.products || []);
      setLogs(data.logs || []);
      setStats({ totalPages: data.totalPages, totalProducts: data.totalProducts });

      toast({
        title: "Scraping concluído",
        description: `${data.totalProducts} produtos em ${data.totalPages} páginas`,
      });
    } catch (e: any) {
      toast({ title: "Erro no scraping", description: e.message, variant: "destructive" });
      setLogs((prev) => [...prev, `❌ Erro: ${e.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (products.length === 0) return;

    const rows = products.map((p, i) => ({
      SKU: `SCRP-${String(i + 1).padStart(5, "0")}`,
      Produto: p.produto,
      Preço: p.preco || "",
      Categoria: "",
      URL: p.url || "",
      Página: p.pagina,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 14 },
      { wch: 50 },
      { wch: 14 },
      { wch: 20 },
      { wch: 60 },
      { wch: 8 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, "produtos_scrape.xlsx");

    toast({ title: "Excel exportado", description: "produtos_scrape.xlsx" });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Globe className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Scraper de Produtos</h1>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="URL da categoria (ex: https://loja.com/pisos)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
              disabled={loading}
            />
            <Input
              type="number"
              min={1}
              max={50}
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value) || 10)}
              className="w-36"
              placeholder="Máx páginas"
              disabled={loading}
            />
            <Button onClick={handleScrape} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {loading ? "Processando..." : "Iniciar Scraping"}
            </Button>
          </div>
          {loading && <Progress value={undefined} className="h-1" />}
        </CardContent>
      </Card>

      {/* Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-40 rounded-md border bg-muted/30 p-3" ref={logsRef}>
              <div className="space-y-1 font-mono text-xs">
                {logs.map((log, i) => (
                  <div key={i} className="text-muted-foreground">
                    {log}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Stats + Export */}
      {stats && (
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant="outline" className="text-sm px-3 py-1">
            📄 {stats.totalPages} páginas analisadas
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">
            📦 {stats.totalProducts} produtos encontrados
          </Badge>
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
            <CardTitle className="text-base">
              Produtos encontrados ({products.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background border-b">
                  <tr>
                    <th className="text-left py-2 px-2 w-10">#</th>
                    <th className="text-left py-2 px-2">Produto</th>
                    <th className="text-left py-2 px-2 w-28">Preço</th>
                    <th className="text-left py-2 px-2 w-16">Página</th>
                    <th className="text-left py-2 px-2 w-20">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 px-2 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 px-2 font-medium">{p.produto}</td>
                      <td className="py-2 px-2 text-muted-foreground">{p.preco || "—"}</td>
                      <td className="py-2 px-2 text-center">
                        <Badge variant="secondary" className="text-xs">
                          {p.pagina}
                        </Badge>
                      </td>
                      <td className="py-2 px-2">
                        {p.url ? (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline text-xs"
                          >
                            Ver
                          </a>
                        ) : (
                          "—"
                        )}
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
