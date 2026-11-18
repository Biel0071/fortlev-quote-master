import { useStore, type AppStore } from "@/contexts/StoreContext";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function StoreSwitcher({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { activeStoreId, setStore, availableStores, storesLoading, storesError, reloadStores } = useStore();
  const selectedStore = availableStores.find((option) => option.id === activeStoreId);

  const handleChange = (value: AppStore) => {
    const nextStoreId = setStore(value);
    if (nextStoreId) navigate(`/admin/store/${nextStoreId}/dashboard`);
  };

  return (
    <div className="flex items-center gap-1">
      <Select value={selectedStore?.value ?? ""} onValueChange={(v) => handleChange(v as AppStore)} disabled={availableStores.length === 0}>
        <SelectTrigger className={className} aria-label="Trocar loja">
          <SelectValue placeholder={storesLoading ? "Carregando lojas…" : storesError && availableStores.length === 0 ? "Banco indisponível" : availableStores.length === 0 ? "Nenhuma loja cadastrada" : "Selecione uma loja"} />
        </SelectTrigger>
        <SelectContent className="z-50 bg-popover">
          {availableStores.map((option) => (
            <SelectItem key={option.id} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {storesError && (
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Tentar carregar lojas novamente" title={storesError} onClick={reloadStores}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
