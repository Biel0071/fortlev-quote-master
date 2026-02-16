import { ShieldCheck, Store, Truck, BadgePercent } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  if (!benefits || benefits.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card/60 backdrop-blur">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2">
        {benefits.slice(0, 4).map((b) => {
          const Icon = iconFor(b.icon);
          return (
            <Card key={b.id} className="rounded-xl border-border bg-muted/20">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="mt-0.5 rounded-lg border border-border bg-background/60 p-2">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-tight">{b.title}</div>
                  {b.subtitle ? <div className="text-xs text-muted-foreground line-clamp-2">{b.subtitle}</div> : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
