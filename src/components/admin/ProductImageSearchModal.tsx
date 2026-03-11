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
import { toast } from "@/hooks/use-toast";
import {
  importGoogleProductImages,
  searchGoogleProductImages,
  type GoogleImageResult,
} from "@/services/googleImages";
import { X, ZoomIn, CheckSquare, Square } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  initialQuery: string;
  onImported: () => Promise<void> | void;
};

export function ProductImageSearchModal({
  open,
  onOpenChange,
  productId,
  initialQuery,
  onImported,
}: Props) {
  const [query, setQuery] = useState("");
  const [start, setStart] = useState(1);
  const [results, setResults] = useState<GoogleImageResult[]>([]);
  const [selected, setSelected] = useState<GoogleImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setStart(1);
    setResults([]);
    setSelected([]);
    setPreviewUrl(null);
  }, [open, initialQuery]);

  const selectedMap = useMemo(() => {
    return new Set(selected.map((item) => item.imageUrl));
  }, [selected]);

  const toggleSelect = (item: GoogleImageResult) => {
    setSelected((prev) => {
      const exists = prev.some((x) => x.imageUrl === item.imageUrl);
      if (exists) return prev.filter((x) => x.imageUrl !== item.imageUrl);
      if (prev.length >= 10) {
        toast({ title: "Limite atingido", description: "Você pode selecionar no máximo 10 imagens." });
        return prev;
      }
      return [...prev, item];
    });
  };

  const selectAll = () => {
    const available = results.filter((r) => !selectedMap.has(r.imageUrl));
    const canAdd = Math.min(available.length, 10 - selected.length);
    if (canAdd <= 0) {
      toast({ title: "Limite atingido", description: "Máximo de 10 imagens selecionadas." });
      return;
    }
    setSelected((prev) => [...prev, ...available.slice(0, canAdd)]);
  };

  const deselectAll = () => setSelected([]);

  const runSearch = async (nextStart = 1, append = false) => {
    if (!query.trim()) {
      toast({ title: "Atenção", description: "Informe o nome do produto para buscar imagens." });
      return;
    }

    setLoading(true);
    try {
      const { images } = await searchGoogleProductImages({ query, start: nextStart });
      setStart(nextStart);
      setResults((prev) => {
        if (!append) return images;
        // deduplicate
        const existing = new Set(prev.map((i) => i.imageUrl));
        const unique = images.filter((i) => !existing.has(i.imageUrl));
        return [...prev, ...unique];
      });
      if (images.length === 0 && !append) {
        toast({ title: "Nenhuma imagem", description: "Tente buscar com outros termos.", variant: "destructive" });
      }
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível buscar imagens agora.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (selected.length === 0) {
      toast({ title: "Selecione imagens", description: "Escolha pelo menos uma imagem para adicionar." });
      return;
    }

    setImporting(true);
    try {
      await importGoogleProductImages({ productId, images: selected });
      await onImported();
      toast({ title: "Imagens adicionadas", description: `${selected.length} imagem(ns) salvas e vinculadas ao produto.` });
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
            <DialogTitle className="flex items-center gap-2">
              🔎 Gerador de Imagens — Buscar na Internet
            </DialogTitle>
            <DialogDescription>
              Pesquise imagens do produto, selecione até 10 e importe sem hotlink (download direto).
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Search bar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digite o nome do produto"
                disabled={loading || importing}
                onKeyDown={(e) => e.key === "Enter" && runSearch(1, false)}
              />
              <Button onClick={() => runSearch(1, false)} disabled={loading || importing || !query.trim()} className="shrink-0">
                {loading ? "Buscando..." : "Buscar imagens"}
              </Button>
            </div>

            {/* Action bar */}
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

            {/* Results grid */}
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
                        {/* Checkbox */}
                        <div className="absolute top-2.5 left-2.5 z-10">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(item)}
                            className="bg-background/80 backdrop-blur-sm"
                          />
                        </div>

                        {/* Preview button */}
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

            {/* Load more */}
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

      {/* Full-size preview overlay */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-white/80 z-10"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
