import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

type ParsedProduct = {
  sku: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  promoPrice: number;
  description: string | null;
};

function normalizeHeader(h: string) {
  return (h ?? "").toString().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
}

function parseNum(v: unknown): number {
  const s = String(v ?? "").replace(/[^\d.,\-]/g, "");
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
    return parseFloat(s.replace(/,/g, "")) || 0;
  }
  if (s.includes(",")) return parseFloat(s.replace(",", ".")) || 0;
  return parseFloat(s) || 0;
}

const FIELD_MAP: Record<string, string[]> = {
  sku: ["sku", "codigo", "code", "cod"],
  name: ["produto", "name", "nome"],
  category: ["categoria", "category"],
  unit: ["unidade", "unit", "un"],
  price: ["preco mercado", "preco", "price", "valor"],
  promoPrice: ["preco loja", "promo", "promo_price", "preco_loja"],
  brand: ["marca", "brand"],
  subcategory: ["subcategoria", "subcategory"],
};

function buildColumnMap(headers: string[]): Record<string, number> {
  const norm = headers.map(normalizeHeader);
  const map: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(FIELD_MAP)) {
    const idx = norm.findIndex((h) => aliases.some((a) => h.includes(a)));
    if (idx >= 0) map[field] = idx;
  }
  return map;
}

function rowsToProducts(rows: any[][]): { products: ParsedProduct[]; categories: string[] } {
  if (rows.length < 2) return { products: [], categories: [] };
  const headers = rows[0].map(String);
  const colMap = buildColumnMap(headers);
  const products: ParsedProduct[] = [];
  const catSet = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    const get = (f: string) => (colMap[f] != null ? String(cols[colMap[f]] ?? "") : "");
    const name = get("name");
    if (!name) continue;
    const cat = get("category");
    if (cat) catSet.add(cat);
    const brand = get("brand");
    const sub = get("subcategory");
    products.push({
      sku: get("sku"),
      name,
      category: cat,
      unit: get("unit") || "UN",
      price: parseNum(get("price")),
      promoPrice: parseNum(get("promoPrice")),
      description: [brand, sub].filter(Boolean).join(" | ") || null,
    });
  }
  return { products, categories: Array.from(catSet).sort() };
}

export default function AdminProductsImport() {
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ inserted: number; errors: number } | null>(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [loading, setLoading] = useState(false);

  const processWorkbook = useCallback((wb: XLSX.WorkBook) => {
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    const { products, categories: cats } = rowsToProducts(rows);
    setParsed(products);
    setCategories(cats);
    setResult(null);
    toast({ title: `${products.length} produtos carregados`, description: `${cats.length} categorias encontradas.` });
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      processWorkbook(wb);
    } catch (err) {
      toast({ title: "Erro ao ler arquivo", description: String(err), variant: "destructive" });
    }
    setLoading(false);
  };

  const loadPreBuilt = async () => {
    setLoading(true);
    try {
      const res = await fetch("/data/produtos_construcao_padronizado_2500.xlsx");
      const buf = await res.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      processWorkbook(wb);
    } catch (err) {
      toast({ title: "Erro", description: String(err), variant: "destructive" });
    }
    setLoading(false);
  };

  const startImport = async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    setProgress(0);
    setResult(null);

    const batchSize = 200;
    let totalInserted = 0;
    let totalErrors = 0;

    for (let i = 0; i < parsed.length; i += batchSize) {
      const batch = parsed.slice(i, i + batchSize);
      try {
        const { data, error } = await cloud.functions.invoke("bulk-import-products", {
          body: { products: batch, clearExisting: i === 0 && clearExisting },
        });

        if (error) {
          totalErrors += batch.length;
          console.error("Batch error:", error);
        } else if (data) {
          totalInserted += data.inserted ?? 0;
          totalErrors += data.errors ?? 0;
        }
      } catch (err) {
        totalErrors += batch.length;
        console.error("Import error:", err);
      }

      setProgress(Math.min(100, Math.round(((i + batch.length) / parsed.length) * 100)));

      // Small delay between batches to avoid overwhelming the server
      if (i + batchSize < parsed.length) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    setResult({ inserted: totalInserted, errors: totalErrors });
    setImporting(false);
    toast({ title: "Importação concluída", description: `${totalInserted} produtos importados.` });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => nav("/admin/produtos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importar Produtos</h1>
          <p className="text-sm text-muted-foreground">Importe produtos em massa via XLSX ou CSV.</p>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Carregar Arquivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={handleFile} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={loading} className="w-full h-24 border-dashed flex-col gap-2">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
            <span className="text-sm font-medium">Selecionar arquivo XLSX / CSV</span>
            <span className="text-xs text-muted-foreground">Arraste ou clique para selecionar</span>
          </Button>
        </CardContent>
      </Card>

      {parsed.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Pré-visualização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">{parsed.length} produtos</Badge>
              <Badge variant="secondary">{categories.length} categorias</Badge>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
              ))}
            </div>

            <div className="max-h-60 overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-left">Produto</th>
                    <th className="px-3 py-2 text-left">Categoria</th>
                    <th className="px-3 py-2 text-right">Preço</th>
                    <th className="px-3 py-2 text-right">Promo</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 50).map((p, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <td className="px-3 py-1.5 font-mono text-xs">{p.sku}</td>
                      <td className="px-3 py-1.5 line-clamp-1">{p.name}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{p.category}</td>
                      <td className="px-3 py-1.5 text-right">R$ {p.price.toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-right font-medium text-primary">R$ {p.promoPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.length > 50 && (
                <div className="px-3 py-2 text-xs text-muted-foreground text-center bg-muted/30">
                  + {parsed.length - 50} produtos não exibidos
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Switch id="clear" checked={clearExisting} onCheckedChange={setClearExisting} />
                <Label htmlFor="clear" className="text-sm">Limpar produtos existentes antes</Label>
              </div>
              <Button onClick={startImport} disabled={importing} className="min-w-[180px]">
                {importing ? "Importando…" : `Importar ${parsed.length} produtos`}
              </Button>
            </div>

            {importing && <Progress value={progress} className="h-2" />}

            {result && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                {result.errors > 0 ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                )}
                <div>
                  <div className="font-medium">{result.inserted} produtos importados com sucesso</div>
                  {result.errors > 0 && <div className="text-sm text-destructive">{result.errors} erros</div>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
