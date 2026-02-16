import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BadgePercent,
  MessageCircle,
  Sparkles,
  Flame,
  Truck,
  CreditCard,
  ShieldCheck,
  Store,
  Boxes,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type HomeDepartment = {
  id: string;
  kind: "link" | "category" | string;
  label: string;
  icon: string | null;
  link_url: string | null;
  category_id: string | null;
  sort_order: number;
  active: boolean;
};

function iconFor(key?: string | null) {
  switch ((key ?? "").toLowerCase()) {
    case "badge-percent":
      return BadgePercent;
    case "message-circle":
      return MessageCircle;
    case "sparkles":
      return Sparkles;
    case "flame":
      return Flame;
    case "truck":
      return Truck;
    case "credit-card":
      return CreditCard;
    case "shield-check":
      return ShieldCheck;
    case "store":
      return Store;
    case "boxes":
      return Boxes;
    case "wrench":
      return Wrench;
    default:
      return Boxes;
  }
}

export function HomeDepartmentsBar({
  loading,
  departments,
  className,
}: {
  loading: boolean;
  departments: HomeDepartment[];
  className?: string;
}) {
  const items = useMemo(() => (departments ?? []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [departments]);

  if (loading) {
    return (
      <section className={cn("space-y-3", className)} aria-label="Departamentos">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Departamentos</div>
            <div className="text-xs text-muted-foreground">Atalhos rápidos para comprar mais rápido.</div>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-36 shrink-0" />
          ))}
        </div>
      </section>
    );
  }

  if (!items.length) return null;

  return (
    <section className={cn("space-y-3", className)} aria-label="Departamentos">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Departamentos</div>
          <div className="text-xs text-muted-foreground">Atalhos rápidos para comprar mais rápido.</div>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/loja">Ver catálogo</Link>
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((d) => {
          const Icon = iconFor(d.icon);
          const href = d.kind === "category" && d.link_url ? d.link_url : d.link_url || "/loja";
          return (
            <Button
              key={d.id}
              asChild
              variant="outline"
              size="sm"
              className="shrink-0 rounded-full gap-2 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40"
            >
              <Link to={href} aria-label={`Departamento: ${d.label}`}>
                <Icon className="h-4 w-4" />
                <span className="font-medium">{d.label}</span>
              </Link>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
