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
import { toast } from "@/hooks/use-toast";
import {
  importGoogleProductImages,
  searchGoogleProductImages,
  type GoogleImageResult,
} from "@/services/googleImages";

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

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setStart(1);
    setResults([]);
    setSelected([]);
  }, [open, initialQuery]);

  const selectedMap = useMemo(() => {
    return new Set(selected.map((item) => item.imageUrl));
  }, [selected]);

  const toggleSelect = (item: GoogleImageResult) => {
    setSelected((prev) => {
      const exists = prev.some((x) => x.imageUrl === item.imageUrl);
      if (exists) return prev.filter((x) => x.imageUrl !== item.imageUrl);
      if (prev.length >= 5) {
        toast({ title: "Limite atingido", description: "Você pode selecionar no máximo 5 imagens." });
        return prev;
      }
      return [...prev, item];
    });
  };

  const runSearch = async (nextStart = 1, append = false) => {
    if (!query.trim()) {
      toast({ title: "Atenção", description: "Informe o nome do produto para buscar imagens." });
      return;
    }

    setLoading(true);
    try {
      const { images } = await searchGoogleProductImages({ query, start: nextStart });
      setStart(nextStart);
      setResults((prev) => (append ? [...prev, ...images] : images));
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
      toast({ title: "Imagens adicionadas", description: "As imagens foram salvas e vinculadas ao produto." });
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>🔎 Buscar imagens na internet</DialogTitle>
          <DialogDescription>
            Pesquise, selecione até 5 imagens e adicione ao produto sem hotlink.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite o nome do produto"
              disabled={loading || importing}
            />
            <Button onClick={() => runSearch(1, false)} disabled={loading || importing || !query.trim()}>
              {loading ? "Buscando..." : "Buscar imagens"}
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card/70 backdrop-blur-sm p-3 min-h-[320px]">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="w-full aspect-square rounded-lg" />
                    <Skeleton className="h-8 w-full rounded-md" />
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="h-full min-h-[280px] grid place-items-center text-sm text-muted-foreground text-center px-4">
                Faça uma busca para visualizar as imagens.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-h-[420px] overflow-y-auto pr-1">
                {results.map((item, idx) => {
                  const isSelected = selectedMap.has(item.imageUrl);
                  return (
                    <div key={`${item.imageUrl}-${idx}`} className="rounded-lg border border-border bg-background p-2 space-y-2">
                      <img
                        src={item.thumbnail || item.imageUrl}
                        alt={item.title || `Resultado ${idx + 1}`}
                        className="w-full aspect-square object-cover rounded-md"
                        loading="lazy"
                      />
                      <p className="text-xs text-muted-foreground line-clamp-2 min-h-8">{item.title || "Imagem"}</p>
                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        className="w-full"
                        onClick={() => toggleSelect(item)}
                        disabled={importing}
                      >
                        {isSelected ? "Selecionada" : "Selecionar"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>{selected.length}/5 imagens selecionadas</span>
            <Button
              variant="outline"
              onClick={() => runSearch(start + 5, true)}
              disabled={loading || importing || !query.trim()}
            >
              Buscar mais 5
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || importing}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={importing || selected.length === 0}>
            {importing ? "Adicionando..." : "Adicionar imagens ao produto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
