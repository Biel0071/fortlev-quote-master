import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { StoreProduct } from "@/types/store";
import { StoreProductCard } from "@/components/store/home/StoreProductCard";

function pickFeatured(products: Array<any>, limit: number) {
  const list = (products ?? []).slice();

  // Hybrid: metrics first, then curated flags.
  list.sort((a, b) => {
    const av = Number(a.views ?? 0);
    const bv = Number(b.views ?? 0);
    if (bv !== av) return bv - av;

    const ac = Number(a.clicks ?? 0);
    const bc = Number(b.clicks ?? 0);
    if (bc !== ac) return bc - ac;

    const as = Number(a.sales ?? 0);
    const bs = Number(b.sales ?? 0);
    if (bs !== as) return bs - as;

    const aFlag = (a.best_seller ? 2 : 0) + (a.featured ? 1 : 0);
    const bFlag = (b.best_seller ? 2 : 0) + (b.featured ? 1 : 0);
    if (bFlag !== aFlag) return bFlag - aFlag;

    return String(a.name ?? "").localeCompare(String(b.name ?? ""));
  });

  return list.slice(0, limit);
}

export function HomeFeaturedProducts({
  loading,
  products,
  onAdd,
}: {
  loading: boolean;
  products: (StoreProduct & { images?: Array<{ path: string | null }> } & { views?: number; clicks?: number; sales?: number })[];
  onAdd: (productId: string, qty: number) => void;
}) {
  const featured = useMemo(() => pickFeatured(products as any[], 8), [products]);

  return (
    <section className="space-y-4" aria-label="Produtos em destaque">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Produtos em destaque</h2>
          <p className="text-sm text-muted-foreground">Os itens mais procurados e com melhor giro.</p>
        </div>
        <Link to="/loja" className="text-sm font-medium underline underline-offset-4">
          Ver tudo
        </Link>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[360px] w-full rounded-2xl" />
          ))}
        </div>
      ) : featured.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">Sem produtos ativos para exibir.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featured.map((p: any) => (
            <StoreProductCard key={p.id} product={p} onAdd={onAdd} />
          ))}
        </div>
      )}
    </section>
  );
}
