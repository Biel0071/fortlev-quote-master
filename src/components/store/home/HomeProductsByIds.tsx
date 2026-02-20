import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreProductCard } from "@/components/store/home/StoreProductCard";
import type { StoreProduct } from "@/types/store";

export function HomeProductsByIds({
  loading,
  productIds,
  products,
  onAdd,
  limit = 8,
  emptyText = "Sem produtos para exibir.",
}: {
  loading: boolean;
  productIds: string[];
  products: (StoreProduct & { images?: Array<{ path: string | null }> })[];
  onAdd: (productId: string, qty: number) => void;
  limit?: number;
  emptyText?: string;
}) {
  const byId = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of products as any[]) m.set(p.id, p);
    return m;
  }, [products]);

  const visible = useMemo(() => {
    return (productIds ?? [])
      .map((id) => byId.get(id))
      .filter(Boolean)
      .slice(0, limit) as any[];
  }, [productIds, byId, limit]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: limit }).map((_, i) => (
          <Skeleton key={i} className="h-[360px] w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">{emptyText}</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
      {visible.map((p: any) => (
        <StoreProductCard key={p.id} product={p} onAdd={onAdd} />
      ))}

      {/* CTA */}
      <Link
        to="/loja"
        className="hidden xl:flex rounded-2xl border border-border bg-card/50 hover:bg-muted/30 transition items-center justify-center text-sm font-semibold"
        aria-label="Ver todos os produtos"
      >
        Ver tudo
      </Link>
    </div>
  );
}
