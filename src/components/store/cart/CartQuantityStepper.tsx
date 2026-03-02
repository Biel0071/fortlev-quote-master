import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
  compact?: boolean;
};

export function CartQuantityStepper({ quantity, onDecrease, onIncrease, onRemove, compact = false }: Props) {
  const removeMode = quantity <= 1;

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={compact ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-lg"}
        onClick={removeMode ? onRemove : onDecrease}
        aria-label={removeMode ? "Remover item" : "Diminuir quantidade"}
      >
        {removeMode ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      </Button>

      <div className="min-w-8 px-1 text-center text-sm font-semibold tabular-nums">{quantity}</div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={compact ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-lg"}
        onClick={onIncrease}
        aria-label="Aumentar quantidade"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
