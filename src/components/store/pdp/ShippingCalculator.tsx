import { useMemo, useState } from "react";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calcShipping } from "@/utils/shipping";
import { formatCurrency } from "@/utils/formatters";

function formatCep(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function ShippingCalculator({ subtotal }: { subtotal: number }) {
  const [cep, setCep] = useState("");
  const [didCalc, setDidCalc] = useState(false);

  const shipping = useMemo(() => calcShipping(Math.max(0, subtotal)), [subtotal]);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-3 sm:p-5 space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-2xl bg-secondary/40 flex items-center justify-center">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold leading-tight">Calcule o frete</div>
            <div className="text-sm text-muted-foreground">Usando a regra atual por valor do pedido.</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            value={cep}
            onChange={(e) => setCep(formatCep(e.target.value))}
            placeholder="00000-000"
            inputMode="numeric"
            aria-label="Digite seu CEP"
            className="h-12 rounded-2xl"
          />
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-2xl"
            onClick={() => setDidCalc(true)}
          >
            Calcular
          </Button>
        </div>

        {didCalc ? (
          <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Entrega para </span>
              <span className="font-semibold">{cep || "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Prazo</span>
              <span className="font-semibold">3 a 7 dias úteis</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Frete</span>
              <span className="font-semibold">{shipping.value === 0 ? "Frete Grátis" : formatCurrency(shipping.value)}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
