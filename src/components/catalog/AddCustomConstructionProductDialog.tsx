import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import type { ConstructionCategory, ConstructionProduct } from "@/types/construction";
import { unitLabels, categoryLabels } from "@/types/construction";
import { formatCurrency } from "@/utils/formatters";
import { addCustomConstructionProduct } from "@/utils/customCatalog";
import { constructionProducts } from "@/data/constructionProducts";
import { normalizeText } from "@/utils/normalize";
import { cloud } from "@/lib/cloud";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (product: ConstructionProduct) => void;
  canPublish: boolean;
};

type SizeRow = { size: string; price: string };

const parseBRL = (v: string) => {
  const n = Number((v ?? "").replace(/\D/g, "")) / 100;
  return Number.isFinite(n) ? n : 0;
};
const maskBRL = (v: string) => {
  const n = parseInt(v.replace(/\D/g, "")) / 100;
  return isNaN(n) ? "" : formatCurrency(n);
};

function guess(name: string): { category?: ConstructionCategory; unit?: ConstructionProduct["unit"] } {
  const h = normalizeText(name);
  const has = (...k: string[]) => k.some((x) => h.includes(x));
  if (has("vara", "cano", "tubo")) return { category: "hidraulica", unit: "br" };
  if (has("joelho", "luva", "cap ", "juncao", "reducao", "adaptador", "registro", "te ", "curva")) return { category: "hidraulica", unit: "pç" };
  if (has("fio", "cabo")) return { category: "eletrica", unit: "rl" };
  if (has("disjuntor", "tomada", "interruptor", "lampada")) return { category: "eletrica", unit: "un" };
  if (has("cimento", "argamassa", "cal ", "gesso")) return { category: "cimentos", unit: "sc" };
  if (has("areia", "brita", "pedra")) return { category: "agregados", unit: "m³" };
  if (has("bloco", "tijolo")) return { category: "blocos-tijolos", unit: "un" };
  if (has("telha")) return { category: "telhas", unit: "un" };
  if (has("piso", "porcelanato", "revestimento")) return { category: "pisos-revestimentos", unit: "m²" };
  if (has("tinta", "massa corrida")) return { category: "pintura", unit: "un" };
  if (has("vergalhao", "ferro", "treli")) return { category: "estruturas", unit: "br" };
  if (has("prego", "parafuso", "arame")) return { category: "ferragens", unit: "kg" };
  return {};
}

export function AddCustomConstructionProductDialog({ open, onOpenChange, onCreated, canPublish }: Props) {
  const { activeStoreId } = useStore();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<ConstructionProduct["unit"]>("un");
  const [category, setCategory] = useState<ConstructionCategory>("outros");
  const [touched, setTouched] = useState(false);
  const [discount, setDiscount] = useState("20");
  const [useMarket, setUseMarket] = useState(true);
  const [rows, setRows] = useState<SizeRow[]>([{ size: "", price: "" }]);
  const [publishStore, setPublishStore] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setName(""); setRows([{ size: "", price: "" }]); setTouched(false); setPublishStore(false);
    }
  }, [open]);

  useEffect(() => {
    if (touched) return;
    const g = guess(name);
    if (g.category) setCategory(g.category);
    if (g.unit) setUnit(g.unit);
  }, [name, touched]);

  const pct = Math.min(90, Math.max(0, Number(discount) || 0)) / 100;

  const products: ConstructionProduct[] = useMemo(
    () =>
      rows
        .map((r) => {
          const base = parseBRL(r.price);
          const final = useMarket ? Math.round(base * (1 - pct) * 100) / 100 : base;
          const full = [name.trim(), r.size.trim()].filter(Boolean).join(" ");
          return { id: `custom-construction-${crypto.randomUUID()}`, name: full, unit, category, basePrice: final };
        })
        .filter((p) => p.name && p.basePrice > 0),
    [rows, name, unit, category, useMarket, pct]
  );

  const similar = useMemo(() => {
    const q = normalizeText(name.trim());
    if (q.length < 3) return [];
    return constructionProducts.filter((p) => normalizeText(p.name).includes(q)).slice(0, 4);
  }, [name]);

  const canSave = name.trim().length > 0 && products.length > 0;

  const publishToStore = async (list: ConstructionProduct[]) => {
    if (!activeStoreId) return;
    const payload = list.map((p) => ({
      store_id: activeStoreId,
      name: p.name,
      category: categoryLabels[p.category],
      unit: p.unit.toUpperCase(),
      price: useMarket ? Math.round((p.basePrice / (1 - pct || 1)) * 100) / 100 : p.basePrice,
      promo_price: p.basePrice,
      stock: 100,
      active: true,
      status: "published",
    }));
    const { error } = await cloud.from("store_products").insert(payload as any);
    if (error) throw error;
  };

  const handleSave = async (toCatalog: boolean) => {
    if (!canSave) return;
    setBusy(true);
    try {
      let created = products;
      if (toCatalog && canPublish) {
        const { data, error } = await cloud
          .from("construction_catalog_products")
          .insert(products.map((p) => ({
            legacy_id: `custom-${p.category}-${normalizeText(p.name).replace(/[^a-z0-9]+/g, "-")}`.slice(0, 80),
            name: p.name, unit: p.unit, base_price: p.basePrice, category: p.category, active: true,
          })))
          .select("id, legacy_id, name, unit, base_price, category");
        if (error) throw error;
        created = (data ?? []).map((d: any) => ({
          id: d.legacy_id || d.id, name: d.name, unit: d.unit, basePrice: Number(d.base_price), category: d.category,
        }));
      } else {
        created.forEach(addCustomConstructionProduct);
      }
      if (publishStore) await publishToStore(created);
      created.forEach(onCreated);
      toast({
        title: `${created.length} item(ns) criado(s)`,
        description: publishStore ? "Também publicados na loja." : "Já disponíveis para o orçamento.",
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Falha ao salvar", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar item novo</DialogTitle>
          <DialogDescription>Crie um ou vários tamanhos de uma vez. Categoria e unidade são sugeridas pelo nome.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Vara de Cano Esgoto" />
            {similar.length > 0 && (
              <div className="rounded-md border border-border bg-muted/50 p-2 text-xs space-y-1">
                <div className="flex items-center gap-1 font-medium text-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" /> Itens parecidos já existem:
                </div>
                {similar.map((s) => (
                  <div key={s.id} className="text-muted-foreground">{s.name} — {formatCurrency(s.basePrice)}</div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={(v) => { setTouched(true); setCategory(v as ConstructionCategory); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover">
                {Object.entries(categoryLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Unidade</Label>
            <Select value={unit} onValueChange={(v) => { setTouched(true); setUnit(v as ConstructionProduct["unit"]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover">
                {Object.entries(unitLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={useMarket} onCheckedChange={(v) => setUseMarket(!!v)} />
              Informar preço de mercado e aplicar desconto
            </label>
            {useMarket && (
              <div className="flex items-center gap-2 text-sm">
                <Input className="w-20" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/\D/g, ""))} />
                % menor
              </div>
            )}
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Medidas e preços {useMarket ? "(preço de mercado)" : "(preço final)"}</Label>
            {rows.map((r, i) => {
              const base = parseBRL(r.price);
              const final = useMarket ? base * (1 - pct) : base;
              return (
                <div key={i} className="flex items-center gap-2">
                  <Input className="w-32" placeholder="Ex: 100mm" value={r.size}
                    onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, size: e.target.value } : x)))} />
                  <Input className="flex-1" placeholder="R$ 0,00" value={r.price}
                    onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, price: maskBRL(e.target.value) } : x)))} />
                  <span className="w-28 text-sm font-semibold text-primary">{base > 0 ? formatCurrency(final) : "—"}</span>
                  <Button variant="ghost" size="icon" disabled={rows.length === 1}
                    onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, { size: "", price: "" }])}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar medida
            </Button>
          </div>

          {activeStoreId && (
            <label className="md:col-span-2 flex items-center gap-2 text-sm">
              <Checkbox checked={publishStore} onCheckedChange={(v) => setPublishStore(!!v)} />
              Publicar também na loja (produto ativo)
            </label>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="secondary" onClick={() => handleSave(false)} disabled={!canSave || busy}>
            Criar agora ({products.length})
          </Button>
          {canPublish && (
            <Button onClick={() => handleSave(true)} disabled={!canSave || busy}>Publicar no catálogo</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
