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
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((x) => {
          const Icon = x.icon;
          return (
            <div
              key={x.title}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-border bg-secondary/20 px-4 py-2 text-sm"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-medium leading-none">{x.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
