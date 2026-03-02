import { CreditCard, MessageCircle, ShieldCheck, Truck } from "lucide-react";

const items = [
  { icon: Truck, title: "Entrega rápida" },
  { icon: CreditCard, title: "Parcelamento" },
  { icon: ShieldCheck, title: "Compra segura" },
  { icon: MessageCircle, title: "Atendimento" },
] as const;

export function HomeGuaranteesMiniBar() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {items.map((x) => {
          const Icon = x.icon;
          return (
            <div
              key={x.title}
              className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/20 px-3 py-2.5 text-sm min-h-11"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="font-medium leading-tight">{x.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
