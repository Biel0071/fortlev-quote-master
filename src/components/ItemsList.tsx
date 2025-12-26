import { useState } from 'react';
import { QuotationItem } from '@/types/quotation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/utils/formatters';
import { Trash2, ShoppingCart, Pencil, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ItemsListProps {
  items: QuotationItem[];
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  total: number;
}

const getProductTypeLabel = (type: string): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } => {
  switch (type) {
    case 'caixa':
      return { label: "Caixa d'Água", variant: 'default' };
    case 'tanque':
      return { label: 'Tanque', variant: 'secondary' };
    case 'tanque-industrial':
      return { label: 'Industrial', variant: 'outline' };
    case 'tanque-verde':
      return { label: 'Verde', variant: 'outline' };
    default:
      return { label: 'Produto', variant: 'default' };
  }
};

export const ItemsList = ({ items, onRemoveItem, onUpdateQuantity, total }: ItemsListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);

  const handleStartEdit = (item: QuotationItem) => {
    setEditingId(item.id);
    setEditQuantity(item.quantity);
  };

  const handleSaveEdit = (id: string) => {
    if (editQuantity > 0) {
      onUpdateQuantity(id, editQuantity);
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-border">
        <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">Nenhum item adicionado</p>
        <p className="text-sm text-muted-foreground/70">Selecione produtos acima para adicionar ao orçamento</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <ShoppingCart className="h-5 w-5 text-fortlev-yellow" />
        Itens do Orçamento
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          ({items.length} {items.length === 1 ? 'item' : 'itens'})
        </span>
      </h3>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              <th className="px-4 py-3 text-left text-sm font-semibold">Produto</th>
              <th className="px-4 py-3 text-center text-sm font-semibold hidden sm:table-cell">Tipo</th>
              <th className="px-4 py-3 text-center text-sm font-semibold hidden sm:table-cell">Dimensões</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Qtd.</th>
              <th className="px-4 py-3 text-right text-sm font-semibold hidden sm:table-cell">Valor Unit.</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Subtotal</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const typeInfo = getProductTypeLabel(item.product.type);
              return (
                <tr
                  key={item.id}
                  className={`border-t border-border transition-colors hover:bg-muted/50 ${
                    index % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {item.product.capacity}{item.product.unit}
                    </div>
                    <div className="text-sm text-muted-foreground sm:hidden">
                      {item.product.height} x {item.product.diameter}
                    </div>
                    <div className="sm:hidden mt-1">
                      <Badge variant={typeInfo.variant} className="text-xs">
                        {typeInfo.label}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <Badge variant={typeInfo.variant}>
                      {typeInfo.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-muted-foreground hidden sm:table-cell">
                    {item.product.height} x {item.product.diameter}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingId === item.id ? (
                      <Input
                        type="number"
                        min="1"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(Number(e.target.value))}
                        className="w-16 h-8 text-center mx-auto"
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium">{item.quantity}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm hidden sm:table-cell">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-fortlev-navy">
                    {editingId === item.id 
                      ? formatCurrency(item.unitPrice * editQuantity)
                      : formatCurrency(item.subtotal)
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {editingId === item.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSaveEdit(item.id)}
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCancelEdit}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartEdit(item)}
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemoveItem(item.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-primary/5">
              <td colSpan={5} className="px-4 py-4 text-right font-semibold text-lg">
                Total:
              </td>
              <td className="px-4 py-4 text-right font-bold text-xl text-fortlev-navy">
                {formatCurrency(total)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
