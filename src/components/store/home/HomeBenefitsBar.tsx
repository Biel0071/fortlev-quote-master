import { ShieldCheck, Store, Truck, BadgePercent } from "lucide-react";
import type { HomeBenefit } from "@/hooks/useHomeContent";

function iconFor(key?: string | null) {
  switch ((key ?? "").toLowerCase()) {
    case "truck":
      return Truck;
    case "badge-percent":
      return BadgePercent;
    case "shield-check":
      return ShieldCheck;
    case "store":
      return Store;
    default:
      return Truck;
  }
}

export function HomeBenefitsBar({ benefits }: { benefits: HomeBenefit[] }) {
  const list = benefits && benefits.length > 0
    ? benefits
    : [
        { id: "default-frete", title: "Frete rápido", subtitle: "Entrega ágil na região", icon: "truck", sort_order: 0, active: true },
        { id: "default-pix", title: "Desconto no Pix", subtitle: "Pague e economize", icon: "badge-percent", sort_order: 1, active: true },
        { id: "default-seguro", title: "Compra segura", subtitle: "Pagamento e dados protegidos", icon: "shield-check", sort_order: 2, active: true },
        { id: "default-retire", title: "Retire na loja", subtitle: "Prático e sem espera", icon: "store", sort_order: 3, active: true },
      ];

  if (!list || list.length === 0) return null;

  return (
    <section className="rounded-3xl border border-border bg-card shadow-sm">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2">
        {list.slice(0, 4).map((b) => {
          const Icon = iconFor(b.icon);
          return (
            <div key={b.id} className="rounded-2xl border border-border bg-secondary/30 p-4 flex items-start gap-3">
              <div className="mt-0.5 rounded-xl border border-border bg-background p-2">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight">{b.title}</div>
                {b.subtitle ? <div className="text-xs text-muted-foreground line-clamp-2">{b.subtitle}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
