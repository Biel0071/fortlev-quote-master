import { useState, useRef, useEffect, useMemo } from "react";
import { cloud } from "@/lib/cloud";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import {
  Globe, Loader2, Search, FileSpreadsheet, CheckCircle2, XCircle, Clock,
  Timer, History, Trash2, Eye, ArrowLeft, Download, AlertTriangle, ImageOff,
  DollarSign, Filter, Import, ShieldAlert, Brain,
} from "lucide-react";
import * as XLSX from "xlsx";

type ValidationError = "price_error" | "price_auto_corrected" | "image_error" | "missing_image" | "parse_error";

interface ScrapedProduct {
  produto: string;
  url: string | null;
  preco: string | null;
  precoNum: number | null;
  pagina: number;
  dominio: string;
  imagemUrl?: string | null;
  categoria?: string | null;
  unidade?: string;
  priceConfidence?: number;
  errors?: ValidationError[];
}

interface ErrorLog {
  type: ValidationError;
  produto: string;
  detail: string;
}

interface ValidationSummary {
  totalWithErrors: number;
  priceErrors: number;
  priceAutoCorrected: number;
  imageErrors: number;
  missingImages: number;
  parseErrors: number;
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
  products_json: unknown;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

function sanitizeHistoryProducts(items: ScrapedProduct[]): ScrapedProduct[] {
  return items.map((p) => ({
    produto: p.produto ?? "",
    url: p.url ?? null,
    preco: p.preco ?? null,
    precoNum: typeof p.precoNum === "number" ? p.precoNum : null,
    pagina: Number.isFinite(p.pagina) ? p.pagina : 0,
    dominio: p.dominio ?? "",
    imagemUrl: p.imagemUrl ?? null,
    categoria: p.categoria ?? null,
    errors: p.errors ?? [],
  }));
}

function readLocalHistoryProducts(id: string): ScrapedProduct[] {
  try {
    const raw = localStorage.getItem(`scrape_history_items:${id}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScrapedProduct[]) : [];
  } catch {
    return [];
  }
}

function exportProducts(products: ScrapedProduct[], suffix = "") {
  if (products.length === 0) return;
  const ts = new Date().toISOString().slice(0, 16).replace(/[:-]/g, "");
  const rows = products.map((p, i) => ({
    SKU: `SCRP-${String(i + 1).padStart(5, "0")}`,
    Produto: p.produto,
    "Preço": p.precoNum ?? "",
    Categoria: p.categoria || "",
    Imagem: p.imagemUrl || "",
    Erros: (p.errors || []).join(", ") || "OK",
    URL: p.url || "",
    "Domínio": p.dominio || "",
    "Página": p.pagina,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 14 }, { wch: 50 }, { wch: 14 }, { wch: 20 }, { wch: 50 }, { wch: 20 }, { wch: 60 }, { wch: 25 }, { wch: 8 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produtos");
  XLSX.writeFile(wb, `produtos_scrape_${ts}${suffix}.xlsx`);
  toast({ title: "Excel exportado" });
}

const ERROR_LABELS: Record<ValidationError, { label: string; color: string; icon: typeof AlertTriangle }> = {
  price_error: { label: "Preço", color: "text-orange-500", icon: DollarSign },
  price_auto_corrected: { label: "Corrigido", color: "text-blue-500", icon: DollarSign },
  image_error: { label: "Imagem", color: "text-red-500", icon: ShieldAlert },
  missing_image: { label: "Sem imagem", color: "text-amber-500", icon: ImageOff },
  parse_error: { label: "Parse", color: "text-yellow-500", icon: AlertTriangle },
};

function ErrorBadge({ error }: { error: ValidationError }) {
  const config = ERROR_LABELS[error];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`text-[10px] gap-0.5 px-1.5 py-0 ${config.color} border-current/30`}>
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </Badge>
  );
}

function ProductsTable({ products, showImage = false }: { products: ScrapedProduct[]; showImage?: boolean }) {
  return (
    <ScrollArea className="max-h-[500px]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-background border-b z-10">
          <tr>
            <th className="text-left py-2 px-2 w-10">#</th>
            {showImage && <th className="text-left py-2 px-2 w-14">Img</th>}
            <th className="text-left py-2 px-2">Produto</th>
            <th className="text-left py-2 px-2 w-28">Preço</th>
            <th className="text-left py-2 px-2 w-24">Categoria</th>
            <th className="text-left py-2 px-2 w-32">Status</th>
            <th className="text-left py-2 px-2 w-28">Domínio</th>
            <th className="text-left py-2 px-2 w-16">Pág</th>
            <th className="text-left py-2 px-2 w-14">Link</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => {
            const hasErrors = (p.errors?.length ?? 0) > 0;
            return (
              <tr key={i} className={`border-b last:border-0 hover:bg-muted/40 ${hasErrors ? "bg-destructive/5" : ""}`}>
                <td className="py-2 px-2 text-muted-foreground">{i + 1}</td>
                {showImage && (
                  <td className="py-1 px-2">
                    {p.imagemUrl ? (
                      <img
                        src={p.imagemUrl}
                        alt=""
                        className="w-10 h-10 object-cover rounded border"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded border bg-muted/40 flex items-center justify-center">
                        <ImageOff className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </td>
                )}
                <td className="py-2 px-2 font-medium max-w-[200px] truncate">{p.produto}</td>
                <td className={`py-2 px-2 ${p.errors?.includes("price_error") ? "text-orange-500 font-semibold" : "text-muted-foreground"}`}>
                  {p.precoNum ? `R$ ${p.precoNum.toFixed(2).replace(".", ",")}` : p.preco || "—"}
                </td>
                <td className="py-2 px-2 text-xs text-muted-foreground">{p.categoria || "—"}</td>
                <td className="py-2 px-2">
                  {hasErrors ? (
                    <div className="flex flex-wrap gap-1">
                      {p.errors!.map((e, ei) => <ErrorBadge key={ei} error={e} />)}
                    </div>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0">✓ OK</Badge>
                  )}
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
            );
          })}
        </tbody>
      </table>
    </ScrollArea>
  );
}

// ─── Preview / Import step ───
function PreviewImportPanel({
  products,
  validation,
  errorLogs,
  onImport,
  onDismiss,
}: {
  products: ScrapedProduct[];
  validation: ValidationSummary | null;
  errorLogs: ErrorLog[];
  onImport: (selected: ScrapedProduct[]) => void;
  onDismiss: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "ok" | "corrected" | "errors" | "review_queue">("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => {
    // Select products without errors OR auto-corrected (review_queue = price_error only)
    const ids = new Set<number>();
    products.forEach((p, i) => {
      const hasBlockingError = p.errors?.some(e => e === "price_error");
      if (!hasBlockingError) ids.add(i);
    });
    return ids;
  });

  const filtered = useMemo(() => {
    return products
      .map((p, i) => ({ ...p, _idx: i }))
      .filter((p) => {
        if (filter === "ok") return !p.errors?.length;
        if (filter === "corrected") return p.errors?.includes("price_auto_corrected");
        if (filter === "errors") return p.errors?.includes("price_error");
        if (filter === "review_queue") return p.errors?.includes("price_error") || p.errors?.includes("parse_error");
        return true;
      });
  }, [products, filter]);

  const toggleAll = (checked: boolean) => {
    if (checked) {
      const newSet = new Set(selectedIds);
      filtered.forEach((p) => newSet.add(p._idx));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      filtered.forEach((p) => newSet.delete(p._idx));
      setSelectedIds(newSet);
    }
  };

  const toggleOne = (idx: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(idx)) newSet.delete(idx);
    else newSet.add(idx);
    setSelectedIds(newSet);
  };

  const okCount = products.filter(p => !p.errors?.length).length;
  const correctedCount = products.filter(p => p.errors?.includes("price_auto_corrected")).length;
  const errCount = products.filter(p => p.errors?.includes("price_error")).length;
  const reviewQueueCount = products.filter(p => p.errors?.includes("price_error") || p.errors?.includes("parse_error")).length;

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Preview — Revisão antes de importar ({products.length} produtos)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Validation summary */}
        {validation && validation.totalWithErrors > 0 && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              {validation.totalWithErrors} produto(s) com problemas detectados
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {validation.priceErrors > 0 && (
                <div className="flex items-center gap-1 text-orange-600">
                  <DollarSign className="h-3 w-3" /> {validation.priceErrors} preço(s) inválido(s)
                </div>
              )}
              {validation.priceAutoCorrected > 0 && (
                <div className="flex items-center gap-1 text-blue-600">
                  <DollarSign className="h-3 w-3" /> {validation.priceAutoCorrected} corrigido(s) auto
                </div>
              )}
              {validation.missingImages > 0 && (
                <div className="flex items-center gap-1 text-amber-600">
                  <ImageOff className="h-3 w-3" /> {validation.missingImages} sem imagem
                </div>
              )}
              {validation.imageErrors > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <ShieldAlert className="h-3 w-3" /> {validation.imageErrors} imagem incoerente
                </div>
              )}
              {validation.parseErrors > 0 && (
                <div className="flex items-center gap-1 text-yellow-600">
                  <AlertTriangle className="h-3 w-3" /> {validation.parseErrors} erro de parse
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error logs collapsible */}
        {errorLogs.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              📋 Ver {errorLogs.length} log(s) detalhado(s) de erro
            </summary>
            <ScrollArea className="max-h-40 mt-2 rounded border bg-muted/30 p-2">
              <div className="space-y-1 font-mono">
                {errorLogs.map((e, i) => (
                  <div key={i} className="text-muted-foreground">
                    <span className={ERROR_LABELS[e.type]?.color || ""}>[{e.type}]</span>{" "}
                    <span className="font-medium">{e.produto}</span> — {e.detail}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </details>
        )}

        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("all")}
          >
            Todos ({products.length})
          </Button>
          <Button
            variant={filter === "ok" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setFilter("ok")}
          >
            <CheckCircle2 className="h-3 w-3" /> OK ({okCount})
          </Button>
          <Button
            variant={filter === "corrected" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setFilter("corrected")}
          >
            <DollarSign className="h-3 w-3" /> Corrigidos ({correctedCount})
          </Button>
          <Button
            variant={filter === "errors" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setFilter("errors")}
          >
            <AlertTriangle className="h-3 w-3" /> Preço inválido ({errCount})
          </Button>
          <Button
            variant={filter === "review_queue" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setFilter("review_queue")}
          >
            <ShieldAlert className="h-3 w-3" /> Fila revisão ({reviewQueueCount})
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Checkbox
              checked={filtered.every(p => selectedIds.has(p._idx))}
              onCheckedChange={(checked) => toggleAll(!!checked)}
            />
            <span className="text-xs text-muted-foreground">
              {selectedIds.size} selecionado(s)
            </span>
          </div>
        </div>

        {/* Product list with checkboxes */}
        <ScrollArea className="max-h-[400px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background border-b z-10">
              <tr>
                <th className="w-8 px-2 py-2"></th>
                <th className="text-left py-2 px-2 w-14">Img</th>
                <th className="text-left py-2 px-2">Produto</th>
                <th className="text-left py-2 px-2 w-28">Preço</th>
                <th className="text-left py-2 px-2 w-24">Categoria</th>
                <th className="text-left py-2 px-2 w-28">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const hasErrors = (p.errors?.length ?? 0) > 0;
                return (
                  <tr
                    key={p._idx}
                    className={`border-b last:border-0 hover:bg-muted/40 cursor-pointer ${hasErrors ? "bg-destructive/5" : ""}`}
                    onClick={() => toggleOne(p._idx)}
                  >
                    <td className="px-2 py-2">
                      <Checkbox checked={selectedIds.has(p._idx)} />
                    </td>
                    <td className="py-1 px-2">
                      {p.imagemUrl ? (
                        <img src={p.imagemUrl} alt="" className="w-10 h-10 object-cover rounded border"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-10 h-10 rounded border bg-muted/40 flex items-center justify-center">
                          <ImageOff className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 font-medium max-w-[200px] truncate">{p.produto}</td>
                    <td className={`py-2 px-2 ${hasErrors && p.errors?.includes("price_error") ? "text-orange-500 font-semibold" : "text-muted-foreground"}`}>
                      {p.precoNum ? `R$ ${p.precoNum.toFixed(2).replace(".", ",")}` : p.preco || "—"}
                    </td>
                    <td className="py-2 px-2 text-xs text-muted-foreground">{p.categoria || "—"}</td>
                    <td className="py-2 px-2">
                      {hasErrors ? (
                        <div className="flex flex-wrap gap-1">
                          {p.errors!.map((e, ei) => <ErrorBadge key={ei} error={e} />)}
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0">✓ OK</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2 border-t">
          <Button onClick={() => {
            const selected = products.filter((_, i) => selectedIds.has(i));
            if (selected.length === 0) {
              toast({ title: "Selecione pelo menos um produto", variant: "destructive" });
              return;
            }
            onImport(selected);
          }} className="gap-2">
            <Import className="h-4 w-4" />
            Importar {selectedIds.size} produto(s)
          </Button>
          <Button variant="outline" onClick={() => exportProducts(products)} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
          <Button variant="ghost" onClick={onDismiss}>Descartar</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminProductScraper() {
  const [urlsInput, setUrlsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ScrapedProduct[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<{
    totalUrls: number; totalPages: number; totalProducts: number; executionTime: number;
  } | null>(null);
  const [history, setHistory] = useState<ScrapeHistoryItem[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [viewingHistory, setViewingHistory] = useState<ScrapeHistoryItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [importing, setImporting] = useState(false);
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
    setErrorLogs([]);
    setValidation(null);
    setShowPreview(false);

    const initialQueue: QueueItem[] = urls.map(u => ({
      url: u, status: "pending" as const, pages: 0, products: 0,
    }));
    setQueue(initialQueue);
    setLogs([`📋 Fila: ${urls.length} URL(s) para processar`]);

    let allProducts: ScrapedProduct[] = [];
    let allErrorLogs: ErrorLog[] = [];
    let totalPages = 0;
    const domains = new Set<string>();
    let mergedValidation: ValidationSummary = { totalWithErrors: 0, priceErrors: 0, priceAutoCorrected: 0, imageErrors: 0, missingImages: 0, parseErrors: 0 };

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

        // Merge error logs & validation
        if (data.errorLogs) allErrorLogs = [...allErrorLogs, ...(data.errorLogs as ErrorLog[])];
        if (data.validation) {
          const v = data.validation as ValidationSummary;
          mergedValidation.totalWithErrors += v.totalWithErrors;
          mergedValidation.priceErrors += v.priceErrors;
          mergedValidation.priceAutoCorrected += v.priceAutoCorrected || 0;
          mergedValidation.imageErrors += v.imageErrors;
          mergedValidation.missingImages += v.missingImages;
          mergedValidation.parseErrors += v.parseErrors;
        }

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
    setErrorLogs(allErrorLogs);
    setValidation(mergedValidation);
    setStats({ totalUrls: urls.length, totalPages, totalProducts: unique.length, executionTime });
    setShowPreview(true);
    addLog(`\n🏁 Concluído: ${unique.length} produtos únicos de ${totalPages} páginas em ${formatDuration(executionTime)}`);

    const safeProducts = sanitizeHistoryProducts(unique);

    try {
      const { data: inserted, error: historyError } = await supabase
        .from("scrape_history")
        .insert({
          total_urls: urls.length,
          total_pages: totalPages,
          total_products: safeProducts.length,
          execution_time_seconds: Math.round(executionTime),
          domains: Array.from(domains),
          products_json: safeProducts as any,
        })
        .select("id")
        .single();

      if (historyError) {
        addLog(`⚠️ Histórico não salvo: ${historyError.message}`);
      } else if (inserted?.id) {
        localStorage.setItem(`scrape_history_items:${inserted.id}`, JSON.stringify(safeProducts));
      }

      await loadHistory();
    } catch (e: any) {
      addLog(`⚠️ Histórico não salvo: ${e?.message || "erro desconhecido"}`);
    }

    toast({
      title: "Scraping concluído",
      description: `${unique.length} produtos em ${totalPages} páginas (${formatDuration(executionTime)})`,
    });
    setLoading(false);
  };

  const handleImport = async (selected: ScrapedProduct[]) => {
    setImporting(true);
    try {
      const rows = selected.map(p => ({
        name: p.produto,
        price: p.precoNum || 0,
        unit: p.unidade || "UN",
        category: p.categoria || null,
        source_id: p.url || null,
        active: true,
        stock: 0,
        status: p.errors?.includes("price_error") ? "draft" : "published",
      }));

      const { error } = await supabase.from("store_products").insert(rows as any);
      if (error) throw error;

      toast({ title: `${selected.length} produto(s) importado(s) com sucesso!` });
      setShowPreview(false);
    } catch (e: any) {
      toast({ title: "Erro ao importar", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleCancel = () => { cancelRef.current = true; setLoading(false); };

  const handleDeleteHistory = async (id: string) => {
    await supabase.from("scrape_history").delete().eq("id", id);
    localStorage.removeItem(`scrape_history_items:${id}`);
    await loadHistory();
  };

  const statusIcon = (s: string) => {
    if (s === "done") return <CheckCircle2 className="h-4 w-4 text-primary" />;
    if (s === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
    if (s === "running") return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const resolveHistoryProducts = (item: ScrapeHistoryItem | null): ScrapedProduct[] => {
    if (!item) return [];
    const dbProducts = Array.isArray(item.products_json) ? (item.products_json as ScrapedProduct[]) : [];
    if (dbProducts.length > 0) return dbProducts;
    const cachedProducts = readLocalHistoryProducts(item.id);
    if (cachedProducts.length > 0) return cachedProducts;
    if (stats && products.length > 0 && stats.totalProducts === item.total_products && stats.totalPages === item.total_pages) return products;
    return [];
  };

  const hasHistoryProducts = (item: ScrapeHistoryItem): boolean => resolveHistoryProducts(item).length > 0;

  const urlCount = parseUrls(urlsInput).length;
  const historyProducts = resolveHistoryProducts(viewingHistory);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Globe className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Scraper de Produtos</h1>
        <Button variant="outline" size="sm" className="ml-auto gap-1.5 text-xs" onClick={() => window.location.href = "/admin/produtos/inteligencia-preco"}>
          <Brain className="h-3.5 w-3.5" /> Inteligência de Preço
        </Button>
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
            <p className="text-xs text-muted-foreground">{urlCount} URL(s) detectada(s) • Paginação ilimitada • Validação inteligente ativada</p>
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
              <Button onClick={handleScrape} className="gap-2" disabled={importing}>
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

      {/* Stats */}
      {stats && (
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant="outline" className="text-sm px-3 py-1">🌐 {stats.totalUrls} URLs</Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">📄 {stats.totalPages} páginas</Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">📦 {stats.totalProducts} produtos</Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">⏱️ {formatDuration(stats.executionTime)}</Badge>
          {validation && validation.totalWithErrors > 0 && (
            <Badge variant="outline" className="text-sm px-3 py-1 text-amber-600 border-amber-300">
              ⚠️ {validation.totalWithErrors} com erro
            </Badge>
          )}
        </div>
      )}

      {/* Preview / Import Panel (step 8) */}
      {showPreview && products.length > 0 && !loading && (
        <PreviewImportPanel
          products={products}
          validation={validation}
          errorLogs={errorLogs}
          onImport={handleImport}
          onDismiss={() => setShowPreview(false)}
        />
      )}

      {/* Results Table (shown after preview dismissed or for reference) */}
      {!showPreview && products.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Produtos encontrados ({products.length})</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowPreview(true)} className="gap-1 text-xs">
                  <Eye className="h-3 w-3" /> Revisar e importar
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportProducts(products)} className="gap-1 text-xs">
                  <FileSpreadsheet className="h-3 w-3" /> Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ProductsTable products={products} showImage />
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
            <div className="space-y-3">
              {history.map((h) => {
                const hasProducts = hasHistoryProducts(h);
                return (
                  <div key={h.id} className="rounded-xl border border-border p-4 space-y-3 hover:bg-muted/20 transition">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {new Date(h.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {hasProducts && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => exportProducts(resolveHistoryProducts(h), `_${h.id.slice(0,8)}`)}
                          >
                            <Download className="h-3 w-3" />
                            Baixar
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => setViewingHistory(h)}
                          disabled={!hasProducts}
                        >
                          <Eye className="h-3 w-3" />
                          {hasProducts ? "Ver" : "Sem itens"}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteHistory(h.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                      <div className="rounded-lg bg-muted/40 px-3 py-2">
                        <div className="text-muted-foreground">Domínio</div>
                        <div className="font-medium truncate">{h.domains?.join(", ") || "—"}</div>
                      </div>
                      <div className="rounded-lg bg-muted/40 px-3 py-2">
                        <div className="text-muted-foreground">URLs</div>
                        <div className="font-medium">{h.total_urls}</div>
                      </div>
                      <div className="rounded-lg bg-muted/40 px-3 py-2">
                        <div className="text-muted-foreground">Páginas</div>
                        <div className="font-medium">{h.total_pages}</div>
                      </div>
                      <div className="rounded-lg bg-muted/40 px-3 py-2">
                        <div className="text-muted-foreground">Produtos</div>
                        <div className="font-medium">{h.total_products}</div>
                      </div>
                      <div className="rounded-lg bg-muted/40 px-3 py-2">
                        <div className="text-muted-foreground">Tempo</div>
                        <div className="font-medium">{formatDuration(h.execution_time_seconds)}</div>
                      </div>
                      <div className="rounded-lg bg-muted/40 px-3 py-2">
                        <div className="text-muted-foreground">Exportação</div>
                        <div className="font-medium truncate">{hasProducts ? `scrape_${h.id.slice(0,8)}.xlsx` : "—"}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                  <ProductsTable products={historyProducts} showImage />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Este registro antigo não salvou os itens; execute um novo scraping para visualizar e exportar os produtos aqui.
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
