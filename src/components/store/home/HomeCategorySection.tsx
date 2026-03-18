import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { StoreCategory } from "@/hooks/useStoreCategories";
import type { StoreProduct } from "@/types/store";
import { StoreProductCard } from "@/components/store/home/StoreProductCard";

export function HomeCategorySection({
  category,
  products,
  onAdd,
}: {
  category: StoreCategory;
  products: (StoreProduct & { images?: Array<{ path: string | null }> })[];
  onAdd: (productId: string, qty: number) => void;
}) {
  const safeProducts = useMemo(() => (products ?? []).slice(0, 8), [products]);

  if (safeProducts.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">{category.name}</h3>
          {category.description ? <p className="text-sm text-muted-foreground">{category.description}</p> : null}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={`/loja?categoria=${encodeURIComponent(category.slug)}`}>Ver mais</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
        {safeProducts.map((p: any) => (
          <StoreProductCard key={p.id} product={p} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}
