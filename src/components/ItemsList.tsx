import { QuotationItem } from '@/types/quotation';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/formatters';
import { Trash2, ShoppingCart } from 'lucide-react';

interface ItemsListProps {
  items: QuotationItem[];
  onRemoveItem: (id: string) => void;
  total: number;
}

export const ItemsList = ({ items, onRemoveItem, total }: ItemsListProps) => {
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
              <th className="px-4 py-3 text-center text-sm font-semibold hidden sm:table-cell">Dimensões</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Qtd.</th>
              <th className="px-4 py-3 text-right text-sm font-semibold hidden sm:table-cell">Valor Unit.</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Subtotal</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
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
                </td>
                <td className="px-4 py-3 text-center text-sm text-muted-foreground hidden sm:table-cell">
                  {item.product.height} x {item.product.diameter}
                </td>
                <td className="px-4 py-3 text-center font-medium">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-sm hidden sm:table-cell">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-fortlev-navy">
                  {formatCurrency(item.subtotal)}
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveItem(item.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-primary/5">
              <td colSpan={4} className="px-4 py-4 text-right font-semibold text-lg">
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
