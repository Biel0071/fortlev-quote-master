import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Filter, Search, Sparkles } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import type { Product, QuotationItem } from "@/types/quotation";
import { getProductPrice } from "@/data/products";
import { normalizeText } from "@/utils/normalize";
import { useFortlevCatalogProducts } from "@/hooks/useCatalogProducts";
import { AddCustomFortlevProductDialog } from "@/components/catalog/AddCustomFortlevProductDialog";
import { useIsAdmin } from "@/hooks/useIsAdmin";

interface ProductSelectorProps {
  onAddItem: (item: QuotationItem) => void;
}

const categoryFilters: Array<{ key: "all" | Product["type"]; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "caixa", label: "Caixas d'Água" },
  { key: "tanque", label: "Tanques" },
  { key: "tanque-industrial", label: "Industriais" },
  { key: "tanque-verde", label: "Verdes" },
];

const typeLabels: Record<string, { label: string; color: string }> = {
  caixa: { label: "", color: "" },
  tanque: { label: "Tanque", color: "bg-muted text-foreground" },
  "tanque-industrial": { label: "Industrial", color: "bg-muted text-foreground" },
  "tanque-verde": { label: "Verde", color: "bg-muted text-foreground" },
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

export const ProductSelector = ({ onAddItem }: ProductSelectorProps) => {
  const { isAdmin } = useIsAdmin();
  const allProducts = useFortlevCatalogProducts();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | Product["type"]>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const normalizedQuery = useMemo(() => normalizeText(searchTerm), [searchTerm]);

  const searchMatches = useMemo(() => {
    if (!normalizedQuery) return allProducts;
    return allProducts.filter((p) => {
      const hay = normalizeText(`${p.name} ${p.capacity}${p.unit} ${p.type}`);
      return hay.includes(normalizedQuery);
    });
  }, [allProducts, normalizedQuery]);

  const filteredProducts = useMemo(() => {
    const base = categoryFilter === "all" ? searchMatches : searchMatches.filter((p) => p.type === categoryFilter);
    return base;
  }, [categoryFilter, searchMatches]);

  const countsByType = useMemo(() => {
    const counts: Record<string, number> = { all: searchMatches.length };
    for (const t of ["caixa", "tanque", "tanque-industrial", "tanque-verde"] as Array<Product["type"]>) {
      counts[t] = searchMatches.filter((p) => p.type === t).length;
    }
    return counts;
  }, [searchMatches]);

  const handleProductChange = (productId: string) => {
    const product = allProducts.find((p) => p.id === productId) ?? null;
    setSelectedProduct(product);

    if (product) {
      setUnitPrice(formatCurrency(getProductPrice(product)));
    } else {
      setUnitPrice("");
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct || !unitPrice) return;

    const price = parseCurrencyToNumber(unitPrice);
    const item: QuotationItem = {
      id: crypto.randomUUID(),
      product: selectedProduct,
      quantity,
      unitPrice: price,
      subtotal: price * quantity,
    };

    onAddItem(item);
    setSelectedProduct(null);
    setQuantity(1);
    setUnitPrice("");
  };

  const subtotal = selectedProduct && unitPrice ? parseCurrencyToNumber(unitPrice) * quantity : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Adicionar Produto
          </h3>
          <p className="text-xs text-muted-foreground">Total de produtos cadastrados: {allProducts.length}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
          <Sparkles className="h-4 w-4" />
          Adicionar item novo
        </Button>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1">
          <Search className="h-4 w-4" />
          Buscar por nome
        </Label>
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Digite para filtrar (ex: 1000L, tanque, verde...)"
          className="h-11"
        />
      </div>

      {/* Category Filters */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1">
          <Filter className="h-4 w-4" />
          Filtrar por Categoria
        </Label>
        <div className="flex flex-wrap gap-2">
          {categoryFilters
            .filter((f) => f.key === "all" || !normalizedQuery || (countsByType[f.key] ?? 0) > 0)
            .map((filter) => (
              <Badge
                key={filter.key}
                variant={categoryFilter === filter.key ? "default" : "outline"}
                className="cursor-pointer transition-all hover:scale-105"
                onClick={() => setCategoryFilter(filter.key)}
              >
                {filter.label}
                {filter.key !== "all" && <span className="ml-1 text-xs opacity-70">({countsByType[filter.key] ?? 0})</span>}
              </Badge>
            ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 space-y-2">
          <Label className="text-sm font-medium">Produto</Label>
          <Select value={selectedProduct?.id || ""} onValueChange={handleProductChange}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder={filteredProducts.length ? "Selecione o produto" : "Nenhum produto encontrado"} />
            </SelectTrigger>
            <SelectContent className="max-h-[400px] bg-background z-50">
              {categoryFilter === "all" ? (
                categoryFilters.filter(f => f.key !== 'all').map((filter) => {
                  const groupProducts = allProducts
                    .filter(p => p.type === filter.key)
                    .filter((p) => !normalizedQuery || normalizeText(`${p.name} ${p.capacity}${p.unit} ${p.type}`).includes(normalizedQuery));

                  if (groupProducts.length === 0) return null;

                  return (
                    <SelectGroup key={filter.key}>
                      <SelectLabel className="font-bold text-foreground py-2 bg-muted/50">{filter.label}</SelectLabel>
                      {groupProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id} className="bg-background hover:bg-muted">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {product.capacity.toLocaleString("pt-BR")}
                              {product.unit}
                              {typeLabels[product.type]?.label && (
                                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${typeLabels[product.type].color}`}>
                                  {typeLabels[product.type].label}
                                </span>
                              )}
                            </span>
                            <span className="text-muted-foreground text-sm">- {formatCurrency(product.basePrice)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                }).filter(Boolean)
              ) : (
                <SelectGroup>
                  <SelectLabel className="font-bold text-foreground py-2 bg-muted/50">
                    {categoryFilters.find((f) => f.key === categoryFilter)?.label}
                  </SelectLabel>
                  {filteredProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id} className="bg-background hover:bg-muted">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {product.capacity.toLocaleString("pt-BR")}
                          {product.unit}
                          {typeLabels[product.type]?.label && (
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${typeLabels[product.type].color}`}>
                              {typeLabels[product.type].label}
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground text-sm">- {formatCurrency(product.basePrice)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}

              {filteredProducts.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">
                  Nada encontrado. Use “Adicionar item novo” para criar agora.
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Quantidade</Label>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Valor Unitário</Label>
          <Input placeholder="R$ 0,00" value={unitPrice} onChange={(e) => setUnitPrice(formatPriceInput(e.target.value))} className="h-11" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        {subtotal > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">Subtotal: </span>
            <span className="font-semibold text-foreground">{formatCurrency(subtotal)}</span>
          </div>
        )}
        <Button onClick={handleAddItem} disabled={!selectedProduct || !unitPrice} className="ml-auto">
          <Plus className="h-4 w-4" />
          Adicionar Item
        </Button>
      </div>

      <AddCustomFortlevProductDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        canPublish={isAdmin}
        onCreated={(p) => {
          setSelectedProduct(p);
          setUnitPrice(formatCurrency(p.basePrice));
        }}
      />
    </div>
  );
};
