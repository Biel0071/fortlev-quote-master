import { STORE_OPTIONS, useStore, type AppStore } from "@/contexts/StoreContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function StoreSwitcher({ className }: { className?: string }) {
  const { store, setStore } = useStore();

  return (
    <Select value={store} onValueChange={(v) => setStore(v as AppStore)}>
      <SelectTrigger className={className} aria-label="Trocar loja">
        <SelectValue placeholder="Selecione a loja" />
      </SelectTrigger>
      <SelectContent className="z-50 bg-popover">
        {STORE_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
