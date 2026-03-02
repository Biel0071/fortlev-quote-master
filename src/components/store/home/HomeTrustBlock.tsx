import { BadgeCheck, CreditCard, ShieldCheck, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const items = [
  {
    icon: Truck,
    title: "Entrega rápida",
    desc: "Prazo e custo transparentes ao finalizar sua compra.",
  },
  {
    icon: CreditCard,
    title: "Parcelamento",
    desc: "Condições claras para você planejar a compra.",
  },
  {
    icon: ShieldCheck,
    title: "Compra segura",
    desc: "Dados protegidos e processo confiável.",
  },
  {
    icon: BadgeCheck,
    title: "Atendimento",
    desc: "Tire dúvidas e peça orçamento quando precisar.",
  },
] as const;

export function HomeTrustBlock() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((x) => {
        const Icon = x.icon;
        return (
          <Card key={x.title} className="rounded-2xl border-border bg-card shadow-sm">
            <CardContent className="p-5">
              <div className="h-11 w-11 rounded-xl border border-border bg-secondary/40 flex items-center justify-center">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-3 font-semibold">{x.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{x.desc}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
