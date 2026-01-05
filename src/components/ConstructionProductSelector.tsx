import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { constructionProducts, constructionCategories, getConstructionProductsByCategory } from '@/data/constructionProducts';
import { ConstructionProduct, ConstructionQuotationItem, categoryLabels, unitLabels } from '@/types/construction';
import { Plus, Package, Filter } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';

interface ConstructionProductSelectorProps {
  onAddItem: (item: ConstructionQuotationItem) => void;
}

const categoryColors: Record<string, string> = {
  'agregados': 'bg-amber-500/20 text-amber-700',
  'cimentos': 'bg-gray-500/20 text-gray-700',
  'blocos-tijolos': 'bg-orange-500/20 text-orange-700',
  'telhas': 'bg-red-500/20 text-red-700',
  'hidraulica': 'bg-blue-500/20 text-blue-700',
  'eletrica': 'bg-yellow-500/20 text-yellow-700',
  'ferramentas': 'bg-purple-500/20 text-purple-700',
  'acabamentos': 'bg-pink-500/20 text-pink-700',
  'estruturas': 'bg-slate-500/20 text-slate-700',
  'madeiras': 'bg-emerald-500/20 text-emerald-700',
  'churrasqueiras': 'bg-rose-500/20 text-rose-700',
  'outros': 'bg-zinc-500/20 text-zinc-700',
};

export const ConstructionProductSelector = ({ onAddItem }: ConstructionProductSelectorProps) => {
  const [selectedProduct, setSelectedProduct] = useState<ConstructionProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredProducts = categoryFilter === 'all' 
    ? constructionProducts 
    : constructionProducts.filter(p => p.category === categoryFilter);

  const handleProductChange = (productId: string) => {
    const product = constructionProducts.find(p => p.id === productId);
    setSelectedProduct(product || null);
    
    if (product) {
      setUnitPrice(formatCurrency(product.basePrice));
    } else {
      setUnitPrice('');
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct || !unitPrice) return;

    const price = parseFloat(unitPrice.replace(/\D/g, '')) / 100;
    const item: ConstructionQuotationItem = {
      id: crypto.randomUUID(),
      product: selectedProduct,
      quantity,
      unitPrice: price,
      subtotal: price * quantity,
    };

    onAddItem(item);
    setSelectedProduct(null);
    setQuantity(1);
    setUnitPrice('');
  };

  const formatPriceInput = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const number = parseInt(cleaned) / 100;
    if (isNaN(number)) return '';
    return formatCurrency(number);
  };

  const subtotal = selectedProduct && unitPrice
    ? (parseFloat(unitPrice.replace(/\D/g, '')) / 100) * quantity
    : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Package className="h-5 w-5 text-orange-500" />
        Adicionar Produto
      </h3>

      {/* Category Filters */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1">
          <Filter className="h-4 w-4" />
          Filtrar por Categoria
        </Label>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={categoryFilter === 'all' ? 'default' : 'outline'}
            className={`cursor-pointer transition-all hover:scale-105 ${
              categoryFilter === 'all' 
                ? 'bg-orange-600 text-white' 
                : 'hover:bg-orange-600/10'
            }`}
            onClick={() => setCategoryFilter('all')}
          >
            Todos ({constructionProducts.length})
          </Badge>
          {constructionCategories.map(cat => (
            <Badge
              key={cat.key}
              variant={categoryFilter === cat.key ? 'default' : 'outline'}
              className={`cursor-pointer transition-all hover:scale-105 ${
                categoryFilter === cat.key 
                  ? 'bg-orange-600 text-white' 
                  : 'hover:bg-orange-600/10'
              }`}
              onClick={() => setCategoryFilter(cat.key)}
            >
              {cat.label}
              <span className="ml-1 text-xs opacity-70">({cat.count})</span>
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 space-y-2">
          <Label className="text-sm font-medium">Produto</Label>
          <Select
            value={selectedProduct?.id || ''}
            onValueChange={handleProductChange}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Selecione o produto" />
            </SelectTrigger>
            <SelectContent className="max-h-[400px] bg-background z-50">
              {categoryFilter === 'all' ? (
                constructionCategories.map(cat => (
                  <SelectGroup key={cat.key}>
                    <SelectLabel className="font-bold text-orange-700 py-2 bg-muted/50">
                      {cat.label}
                    </SelectLabel>
                    {getConstructionProductsByCategory(cat.key).map(product => (
                      <SelectItem key={product.id} value={product.id} className="bg-background hover:bg-muted">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{product.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${categoryColors[product.category]}`}>
                            {unitLabels[product.unit]}
                          </span>
                          <span className="text-muted-foreground text-sm ml-auto">
                            {formatCurrency(product.basePrice)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))
              ) : (
                <SelectGroup>
                  <SelectLabel className="font-bold text-orange-700 py-2 bg-muted/50">
                    {categoryLabels[categoryFilter as keyof typeof categoryLabels]}
                  </SelectLabel>
                  {filteredProducts.map(product => (
                    <SelectItem key={product.id} value={product.id} className="bg-background hover:bg-muted">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{product.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${categoryColors[product.category]}`}>
                          {unitLabels[product.unit]}
                        </span>
                        <span className="text-muted-foreground text-sm ml-auto">
                          {formatCurrency(product.basePrice)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Quantidade {selectedProduct && `(${unitLabels[selectedProduct.unit]})`}
          </Label>
          <Input
            type="number"
            min={1}
            step={selectedProduct?.unit === 'm³' || selectedProduct?.unit === 'm²' ? '0.1' : '1'}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(0.1, parseFloat(e.target.value) || 1))}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Valor Unitário</Label>
          <Input
            placeholder="R$ 0,00"
            value={unitPrice}
            onChange={(e) => setUnitPrice(formatPriceInput(e.target.value))}
            className="h-11"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        {subtotal > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">Subtotal: </span>
            <span className="font-semibold text-foreground">{formatCurrency(subtotal)}</span>
          </div>
        )}
        <Button
          onClick={handleAddItem}
          disabled={!selectedProduct || !unitPrice}
          className="ml-auto bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" />
          Adicionar Item
        </Button>
      </div>
    </div>
  );
};
