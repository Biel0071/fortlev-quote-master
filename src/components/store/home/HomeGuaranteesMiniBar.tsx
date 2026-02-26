import { BadgeCheck, CreditCard, MessageCircle, ShieldCheck, Truck } from "lucide-react";

const items = [
  { icon: Truck, title: "Entrega rápida" },
  { icon: CreditCard, title: "Parcelamento" },
  { icon: ShieldCheck, title: "Compra segura" },
  { icon: MessageCircle, title: "Atendimento" },
] as const;

export function HomeGuaranteesMiniBar() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((x) => {
        const Icon = x.icon;
        return (
          <div
            key={x.title}
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-secondary/20 px-4 py-2 text-sm"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="font-medium leading-none">{x.title}</span>
          </div>
        );
      })}
    </div>
  );
}
