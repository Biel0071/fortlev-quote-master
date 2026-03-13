import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";

type ParsedProduct = {
  sku: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  promoPrice: number;
  description: string | null;
};

export default function AdminProductsImport() {
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ inserted: number; errors: number } | null>(null);
  const [clearExisting, setClearExisting] = useState(false);

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return;

    // Detect separator
    const sep = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""));

    const colMap: Record<string, number> = {};
    const fieldNames: Record<string, string[]> = {
      sku: ["sku", "codigo", "code", "cod"],
      name: ["produto", "name", "nome", "descricao"],
      category: ["categoria", "category", "cat"],
      unit: ["unidade", "unit", "un"],
      price: ["preco mercado", "preco", "price", "valor"],
      promoPrice: ["preco loja", "promo", "promo_price", "preco_loja"],
      brand: ["marca", "brand"],
      subcategory: ["subcategoria", "subcategory"],
    };

    for (const [field, aliases] of Object.entries(fieldNames)) {
      const idx = headers.findIndex((h) => aliases.some((a) => h.includes(a)));
      if (idx >= 0) colMap[field] = idx;
    }

    const products: ParsedProduct[] = [];
    const catSet = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
      const get = (field: string) => (colMap[field] != null ? cols[colMap[field]] ?? "" : "");

      const name = get("name");
      if (!name) continue;

      const cat = get("category");
      if (cat) catSet.add(cat);

      const parseNum = (v: string) => {
        const cleaned = v.replace(/[^\d.,\-]/g, "");
        // Handle locale: 1.234,56 -> 1234.56
        if (cleaned.includes(",") && cleaned.includes(".")) {
          if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
            return parseFloat(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
          }
          return parseFloat(cleaned.replace(/,/g, "")) || 0;
        }
        if (cleaned.includes(",")) return parseFloat(cleaned.replace(",", ".")) || 0;
        return parseFloat(cleaned) || 0;
      };

      const brand = get("brand");
      const subcategory = get("subcategory");
      const desc = [brand, subcategory, cat].filter(Boolean).join(" | ");

      products.push({
        sku: get("sku"),
        name,
        category: cat,
        unit: get("unit") || "UN",
        price: parseNum(get("price")),
        promoPrice: parseNum(get("promoPrice")),
        description: desc || null,
      });
    }

    setParsed(products);
    setCategories(Array.from(catSet).sort());
    setResult(null);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
      const text = await file.text();
      parseCSV(text);
    } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      toast({ title: "Formato XLSX detectado", description: "Use o arquivo CSV exportado ou cole os dados." });
    }
  };

  const startImport = async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    setProgress(0);
    setResult(null);

    const batchSize = 500;
    let totalInserted = 0;
    let totalErrors = 0;

    for (let i = 0; i < parsed.length; i += batchSize) {
      const batch = parsed.slice(i, i + batchSize);
      const { data, error } = await cloud.functions.invoke("bulk-import-products", {
        body: { products: batch, clearExisting: i === 0 && clearExisting },
      });

      if (error) {
        totalErrors += batch.length;
        toast({ title: "Erro no lote", description: String(error), variant: "destructive" });
      } else if (data) {
        totalInserted += data.inserted ?? 0;
        totalErrors += data.errors ?? 0;
      }

      setProgress(Math.min(100, Math.round(((i + batch.length) / parsed.length) * 100)));
    }

    setResult({ inserted: totalInserted, errors: totalErrors });
    setImporting(false);
    toast({ title: "Importação concluída", description: `${totalInserted} produtos importados.` });
  };

  // For the uploaded spreadsheet, parse hardcoded data from pre-parsed content
  const loadPreParsedData = async () => {
    toast({ title: "Carregando…", description: "Buscando dados da planilha pré-processada." });

    // Fetch the data directly - the spreadsheet was already parsed
    // We'll generate products from the known structure
    const response = await fetch("/api/spreadsheet-data");
    // Since we can't serve the file, let's parse from a textarea instead
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => nav("/admin/produtos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importar Produtos</h1>
          <p className="text-sm text-muted-foreground">Importe produtos em massa via arquivo CSV ou cole os dados da planilha.</p>
        </div>
      </div>

      {/* File Upload */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Carregar Arquivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full h-24 border-dashed flex-col gap-2">
            <Upload className="h-6 w-6" />
            <span>Clique para selecionar arquivo CSV</span>
          </Button>

          <div className="text-center text-sm text-muted-foreground">ou cole os dados abaixo (separados por TAB ou ;)</div>

          <textarea
            className="w-full h-40 rounded-xl border border-border bg-background p-3 text-sm font-mono resize-y"
            placeholder="SKU;Produto;Categoria;Subcategoria;Marca;Unidade;Preço Mercado;Preço Loja"
            onBlur={(e) => {
              if (e.target.value.trim()) parseCSV(e.target.value);
            }}
          />
        </CardContent>
      </Card>

      {/* Preview */}
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
                      <td className="px-3 py-1.5 text-right text-primary font-medium">R$ {p.promoPrice.toFixed(2)}</td>
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
                <Label htmlFor="clear" className="text-sm">Limpar produtos existentes antes de importar</Label>
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
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
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
