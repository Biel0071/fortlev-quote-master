import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, RefreshCw, BadgeCheck, CreditCard } from "lucide-react";
import type { HomePolicy } from "@/hooks/useHomeContent";

function iconFor(key?: string | null) {
  switch ((key ?? "").toLowerCase()) {
    case "truck":
      return Truck;
    case "refresh-cw":
      return RefreshCw;
    case "badge-check":
      return BadgeCheck;
    case "credit-card":
      return CreditCard;
    default:
      return Truck;
  }
}

export function HomePolicies({ policies }: { policies: HomePolicy[] }) {
  if (!policies || policies.length === 0) return null;

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold">Políticas da loja</h2>
        <p className="text-sm text-muted-foreground">Informações importantes antes de finalizar o pedido.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {policies.slice(0, 4).map((p) => {
          const Icon = iconFor(p.icon);
          const href = p.link_url || "/p/politica-de-privacidade";
          return (
            <Link key={p.id} to={href} className="group">
              <Card className="rounded-2xl glass-card card-hover">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-border bg-background/60 p-2">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="font-semibold">{p.title}</div>
                  </div>
                  {p.subtitle ? <div className="text-sm text-muted-foreground line-clamp-2">{p.subtitle}</div> : null}
                  <div className="text-xs text-muted-foreground group-hover:text-foreground/70">Ver detalhes</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
