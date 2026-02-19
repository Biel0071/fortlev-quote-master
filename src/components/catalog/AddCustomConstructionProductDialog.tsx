import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ConstructionCategory, ConstructionProduct } from "@/types/construction";
import { unitLabels, categoryLabels } from "@/types/construction";
import { formatCurrency } from "@/utils/formatters";
import { addCustomConstructionProduct } from "@/utils/customCatalog";
import { cloud } from "@/lib/cloud";
import { toast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (product: ConstructionProduct) => void;
  canPublish: boolean;
};

function parseCurrencyToNumber(brl: string) {
  const cleaned = (brl ?? "").replace(/\D/g, "");
  const n = Number(cleaned) / 100;
  return Number.isFinite(n) ? n : 0;
}

function formatPriceInput(value: string) {
  const cleaned = value.replace(/\D/g, "");
  const number = parseInt(cleaned) / 100;
  if (isNaN(number)) return "";
  return formatCurrency(number);
}

export function AddCustomConstructionProductDialog({ open, onOpenChange, onCreated, canPublish }: Props) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<ConstructionProduct["unit"]>("un");
  const [category, setCategory] = useState<ConstructionCategory>("outros");
  const [basePrice, setBasePrice] = useState<string>("");
  const [publishing, setPublishing] = useState(false);

  const product: ConstructionProduct = useMemo(
    () => ({
      id: `custom-construction-${crypto.randomUUID()}`,
      name: name.trim() || "Produto",
      unit,
      basePrice: parseCurrencyToNumber(basePrice),
      category,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name, unit, basePrice, category]
  );

  const canSave = product.name.trim().length > 0 && product.basePrice > 0;

  const handleCreateLocal = () => {
    if (!canSave) return;
    addCustomConstructionProduct(product);
    onCreated(product);
    onOpenChange(false);
    toast({ title: "Item criado", description: "O item foi criado e já pode ser adicionado ao orçamento." });
  };

  const handlePublish = async () => {
    if (!canSave || !canPublish) return;
    setPublishing(true);
    try {
      const legacyId = `legacy-${product.category}-${product.unit}-${product.name}`
        .toLowerCase()
        .replace(/\s+/g, "-")
        .slice(0, 80);

      const { error } = await cloud.from("construction_catalog_products").insert({
        legacy_id: legacyId,
        name: product.name,
        unit: product.unit,
        base_price: product.basePrice,
        category: product.category,
        active: true,
      });

      if (error) throw error;

      toast({ title: "Publicado", description: "Item publicado no catálogo (backend)." });
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Falha ao publicar",
        description: e?.message ?? "Não foi possível publicar agora.",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar item novo</DialogTitle>
          <DialogDescription>
            Se não encontrar o item, crie aqui e ele aparecerá imediatamente na busca.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Parafuso 8mm" />
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ConstructionCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {Object.entries(categoryLabels).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Unidade</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as ConstructionProduct["unit"])}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {Object.entries(unitLabels).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Preço base</Label>
            <Input placeholder="R$ 0,00" value={basePrice} onChange={(e) => setBasePrice(formatPriceInput(e.target.value))} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreateLocal} disabled={!canSave}>
            Criar agora
          </Button>
          {canPublish && (
            <Button onClick={handlePublish} disabled={!canSave || publishing}>
              Publicar no catálogo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
