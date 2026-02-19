import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Product } from "@/types/quotation";
import { formatCurrency } from "@/utils/formatters";
import { addCustomFortlevProduct } from "@/utils/customCatalog";
import { cloud } from "@/lib/cloud";
import { toast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (product: Product) => void;
  canPublish: boolean;
};

const TYPE_OPTIONS: Array<{ value: Product["type"]; label: string }> = [
  { value: "caixa", label: "Caixa" },
  { value: "tanque", label: "Tanque" },
  { value: "tanque-industrial", label: "Industrial" },
  { value: "tanque-verde", label: "Verde" },
];

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

export function AddCustomFortlevProductDialog({ open, onOpenChange, onCreated, canPublish }: Props) {
  const [name, setName] = useState("Caixa d'Água");
  const [capacity, setCapacity] = useState<number>(1000);
  const [unit, setUnit] = useState<Product["unit"]>("L");
  const [type, setType] = useState<Product["type"]>("caixa");
  const [basePrice, setBasePrice] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [diameter, setDiameter] = useState<string>("");
  const [publishing, setPublishing] = useState(false);

  const product: Product = useMemo(
    () => ({
      id: `custom-fortlev-${crypto.randomUUID()}`,
      name: name.trim() || "Produto",
      capacity: Number(capacity || 0),
      unit,
      height,
      diameter,
      basePrice: parseCurrencyToNumber(basePrice),
      type,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name, capacity, unit, height, diameter, basePrice, type]
  );

  const canSave = product.name.trim().length > 0 && product.capacity > 0 && product.basePrice > 0;

  const handleCreateLocal = () => {
    if (!canSave) return;
    addCustomFortlevProduct(product);
    onCreated(product);
    onOpenChange(false);
    toast({ title: "Item criado", description: "O item foi criado e já pode ser adicionado ao orçamento." });
  };

  const handlePublish = async () => {
    if (!canSave || !canPublish) return;
    setPublishing(true);
    try {
      const legacyId = `legacy-${product.capacity}${product.unit}-${product.type}-${product.name}`
        .toLowerCase()
        .replace(/\s+/g, "-")
        .slice(0, 80);

      const { error } = await cloud.from("fortlev_catalog_products").insert({
        legacy_id: legacyId,
        name: product.name,
        capacity: product.capacity,
        unit: product.unit,
        height: product.height,
        diameter: product.diameter,
        base_price: product.basePrice,
        type: product.type,
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
            Se não encontrar o produto, crie aqui e ele aparecerá imediatamente na busca.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Caixa d'Água de Polietileno" />
          </div>

          <div className="space-y-2">
            <Label>Capacidade</Label>
            <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Math.max(1, Number(e.target.value) || 1))} />
          </div>

          <div className="space-y-2">
            <Label>Unidade</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as Product["unit"])}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="L">Litros (L)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as Product["type"])}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Preço base</Label>
            <Input placeholder="R$ 0,00" value={basePrice} onChange={(e) => setBasePrice(formatPriceInput(e.target.value))} />
          </div>

          <div className="space-y-2">
            <Label>Altura (opcional)</Label>
            <Input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Ex: 88 cm" />
          </div>

          <div className="space-y-2">
            <Label>Diâmetro (opcional)</Label>
            <Input value={diameter} onChange={(e) => setDiameter(e.target.value)} placeholder="Ex: 122 cm" />
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
