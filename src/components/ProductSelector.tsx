import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { products, getProductLabel } from '@/data/products';
import { Product, QuotationItem } from '@/types/quotation';
import { Plus, Package } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface ProductSelectorProps {
  onAddItem: (item: QuotationItem) => void;
}

export const ProductSelector = ({ onAddItem }: ProductSelectorProps) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('');

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product || null);
  };

  const handleAddItem = () => {
    if (!selectedProduct || !unitPrice) return;

    const price = parseFloat(unitPrice.replace(/\D/g, '')) / 100;
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
        <Package className="h-5 w-5 text-fortlev-yellow" />
        Adicionar Produto
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 space-y-2">
          <Label className="text-sm font-medium">Produto</Label>
          <Select
            value={selectedProduct?.id || ''}
            onValueChange={handleProductChange}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Selecione a caixa d'água" />
            </SelectTrigger>
            <SelectContent>
              {products.map(product => (
                <SelectItem key={product.id} value={product.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{product.capacity}{product.unit}</span>
                    <span className="text-muted-foreground text-sm">
                      ({product.height} x {product.diameter})
                    </span>
                  </div>
                </SelectItem>
              ))}
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
          variant="accent"
          onClick={handleAddItem}
          disabled={!selectedProduct || !unitPrice}
          className="ml-auto"
        >
          <Plus className="h-4 w-4" />
          Adicionar Item
        </Button>
      </div>
    </div>
  );
};
