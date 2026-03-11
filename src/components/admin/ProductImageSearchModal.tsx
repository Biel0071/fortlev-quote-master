import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  importGoogleProductImages,
  searchGoogleProductImages,
  type GoogleImageResult,
  type ImageSearchSource,
} from "@/services/googleImages";
import { X, ZoomIn, CheckSquare, Square, RotateCcw } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  initialQuery: string;
  onImported: () => Promise<void> | void;
};

const sourceOptions: Array<{ value: ImageSearchSource; label: string }> = [
  { value: "bing", label: "Bing Images" },
  { value: "google", label: "Google Images" },
  { value: "mercado_livre", label: "Mercado Livre" },
  { value: "amazon", label: "Amazon" },
  { value: "shopee", label: "Shopee" },
  { value: "alibaba", label: "Alibaba" },
];

export function ProductImageSearchModal({
  open,
  onOpenChange,
  productId,
  initialQuery,
  onImported,
}: Props) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<ImageSearchSource>("bing");
  const [start, setStart] = useState(1);
  const [results, setResults] = useState<GoogleImageResult[]>([]);
  const [selected, setSelected] = useState<GoogleImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setSource("bing");
    setStart(1);
    setResults([]);
    setSelected([]);
    setPreviewUrl(null);
  }, [open, initialQuery]);

  const selectedMap = useMemo(() => new Set(selected.map((item) => item.imageUrl)), [selected]);

  const toggleSelect = (item: GoogleImageResult) => {
    setSelected((prev) => {
      const exists = prev.some((x) => x.imageUrl === item.imageUrl);
      if (exists) return prev.filter((x) => x.imageUrl !== item.imageUrl);
      return [...prev, item];
    });
  };

  const selectAll = () => {
    const available = results.filter((r) => !selectedMap.has(r.imageUrl));
    if (available.length === 0) return;
    setSelected((prev) => [...prev, ...available]);
  };

  const deselectAll = () => setSelected([]);

  const runSearch = async (nextStart = 1, append = false) => {
    if (!query.trim()) {
      toast({ title: "Atenção", description: "Informe o nome do produto para buscar imagens." });
      return;
    }

    setLoading(true);
    try {
      const { images } = await searchGoogleProductImages({ query, start: nextStart, source });
      setStart(nextStart);
      setResults((prev) => {
        if (!append) return images;
        const existing = new Set(prev.map((i) => i.imageUrl));
        const unique = images.filter((i) => !existing.has(i.imageUrl));
        return [...prev, ...unique];
      });

      if (images.length === 0 && !append) {
        toast({ title: "Nenhuma imagem", description: "Tente buscar com outra fonte.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({
        title: "Erro",
        description: e?.message || "Não foi possível buscar imagens agora.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForNewSource = () => {
    setStart(1);
    setResults([]);
    setSelected([]);
  };

  const handleImport = async () => {
    if (selected.length === 0) {
      toast({ title: "Selecione imagens", description: "Escolha pelo menos uma imagem para adicionar." });
      return;
    }

    setImporting(true);
    try {
      const result = await importGoogleProductImages({ productId, images: selected });
      await onImported();

      if (result.failed > 0) {
        toast({
          title: "Importação parcial",
          description: `${result.imported.length} de ${result.requested} imagem(ns) foram salvas no produto.`,
        });
      } else {
        toast({
          title: "Imagens adicionadas",
          description: `${result.imported.length} imagem(ns) salvas e vinculadas ao produto.`,
        });
      }

      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Erro",
        description: e?.message || "Não foi possível importar imagens.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">🔎 Gerador de Imagens — Buscar na Internet</DialogTitle>
            <DialogDescription>
              Pesquise imagens do produto, selecione até 10 e importe sem hotlink (download direto).
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digite o nome do produto"
                disabled={loading || importing}
                onKeyDown={(e) => e.key === "Enter" && runSearch(1, false)}
                className="md:col-span-2"
              />
              <Select
                value={source}
                onValueChange={(v: ImageSearchSource) => {
                  setSource(v);
                  resetForNewSource();
                }}
                disabled={loading || importing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a fonte" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => runSearch(1, false)} disabled={loading || importing || !query.trim()}>
                {loading ? "Buscando..." : "Buscar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  resetForNewSource();
                  void runSearch(1, false);
                }}
                disabled={loading || importing || !query.trim()}
              >
                <RotateCcw className="w-4 h-4 mr-1" /> Buscar novamente com outra fonte
              </Button>
            </div>

            {results.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectAll} disabled={importing}>
                  <CheckSquare className="w-4 h-4 mr-1" /> Selecionar todas
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll} disabled={importing || selected.length === 0}>
                  <Square className="w-4 h-4 mr-1" /> Limpar seleção
                </Button>
                <span className="text-sm text-muted-foreground ml-auto">
                  {selected.length}/10 selecionadas · {results.length} resultados
                </span>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card/70 backdrop-blur-sm p-3 min-h-[320px]">
              {loading && results.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="w-full aspect-square rounded-lg" />
                      <Skeleton className="h-4 w-3/4 rounded-md" />
                    </div>
                  ))}
                </div>
              ) : results.length === 0 ? (
                <div className="h-full min-h-[280px] grid place-items-center text-sm text-muted-foreground text-center px-4">
                  <div>
                    <p className="text-lg mb-1">📷</p>
                    <p>Faça uma busca para visualizar as imagens.</p>
                    <p className="text-xs mt-1">Ex: "cimento cp2 50kg", "caixa d'água 1000L"</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {results.map((item, idx) => {
                    const isSelected = selectedMap.has(item.imageUrl);
                    return (
                      <div
                        key={`${item.imageUrl}-${idx}`}
                        className={`relative group rounded-lg border-2 bg-background p-1.5 transition-all cursor-pointer ${
                          isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-muted-foreground/40"
                        }`}
                        onClick={() => toggleSelect(item)}
                      >
                        <div className="absolute top-2.5 left-2.5 z-10">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(item)}
                            className="bg-background/80 backdrop-blur-sm"
                          />
                        </div>

                        <button
                          type="button"
                          className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewUrl(item.imageUrl);
                          }}
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>

                        <img
                          src={item.thumbnail || item.imageUrl}
                          alt={item.title || `Resultado ${idx + 1}`}
                          className="w-full aspect-square object-cover rounded-md"
                          loading="lazy"
                        />
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 min-h-8 px-0.5">
                          {item.title || "Imagem"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {results.length > 0 && results.length < 40 && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => runSearch(start + 10, true)}
                  disabled={loading || importing || !query.trim()}
                >
                  {loading ? "Buscando..." : "Buscar mais imagens"}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border pt-3 mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || importing}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={importing || selected.length === 0}>
              {importing ? "Importando..." : `Importar ${selected.length} imagem(ns)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {previewUrl && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <button className="absolute top-4 right-4 text-foreground/90 hover:text-foreground z-10" onClick={() => setPreviewUrl(null)}>
            <X className="w-8 h-8" />
          </button>
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-[85vh] object-contain rounded-lg border border-border"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
