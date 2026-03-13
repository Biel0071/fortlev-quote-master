import { Button } from "@/components/ui/button";

export function QuantitySelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-2 w-full min-w-0 overflow-hidden">
      <Button
        type="button"
        variant="ghost"
        className="h-10 w-10 rounded-xl shrink-0"
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label="Diminuir quantidade"
      >
        −
      </Button>
      <div className="min-w-10 text-center text-sm font-semibold" aria-label={`Quantidade ${value}`}>
        {value}
      </div>
      <Button
        type="button"
        variant="ghost"
        className="h-10 w-10 rounded-xl"
        onClick={() => onChange(value + 1)}
        aria-label="Aumentar quantidade"
      >
        +
      </Button>
    </div>
  );
}
