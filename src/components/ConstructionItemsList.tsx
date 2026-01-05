import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Package, ShoppingCart } from 'lucide-react';
import { ConstructionQuotationItem, unitLabels, categoryLabels } from '@/types/construction';
import { formatCurrency } from '@/utils/formatters';

interface ConstructionItemsListProps {
  items: ConstructionQuotationItem[];
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  total: number;
}

export const ConstructionItemsList = ({ items, onRemoveItem, onUpdateQuantity, total }: ConstructionItemsListProps) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
        <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Nenhum item adicionado ao orçamento</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Selecione produtos acima para adicionar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Package className="h-5 w-5 text-orange-500" />
        Itens do Orçamento
        <span className="text-sm font-normal text-muted-foreground">
          ({items.length} {items.length === 1 ? 'item' : 'itens'})
        </span>
      </h3>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Produto</TableHead>
              <TableHead className="font-semibold text-center w-20">Qtd</TableHead>
              <TableHead className="font-semibold text-center w-20">Un</TableHead>
              <TableHead className="font-semibold text-right w-28">Valor Unit.</TableHead>
              <TableHead className="font-semibold text-right w-28">Subtotal</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{item.product.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {categoryLabels[item.product.category]}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    step={item.product.unit === 'm³' || item.product.unit === 'm²' ? '0.1' : '1'}
                    value={item.quantity}
                    onChange={(e) => onUpdateQuantity(item.id, Math.max(0.1, parseFloat(e.target.value) || 1))}
                    className="w-20 h-8 text-center text-sm"
                  />
                </TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">
                  {unitLabels[item.product.unit]}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.unitPrice)}
                </TableCell>
                <TableCell className="text-right font-semibold text-orange-600">
                  {formatCurrency(item.subtotal)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveItem(item.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Total Summary */}
      <div className="flex justify-end">
        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4 min-w-[280px]">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-foreground">Total:</span>
            <span className="text-2xl font-bold text-orange-600">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
