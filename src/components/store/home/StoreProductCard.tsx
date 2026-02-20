import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BadgePercent } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils/formatters";
import { publicImageUrl } from "@/utils/storage";

export function StoreProductCard({
  product,
  onAdd,
}: {
  product: any;
  onAdd: (productId: string, qty: number) => void;
}) {
  const [qty, setQty] = useState<number>(1);

  const basePrice = Number(product?.price ?? 0);
  const promo = Number(product?.promo_price ?? 0);
  const hasPromo = promo > 0 && basePrice > 0 && promo < basePrice;

  const effectivePrice = useMemo(() => (hasPromo ? promo : basePrice), [hasPromo, promo, basePrice]);

  const off = useMemo(() => {
    if (!hasPromo) return 0;
    return Math.max(0, Math.min(99, Math.round(((basePrice - promo) / basePrice) * 100)));
  }, [hasPromo, basePrice, promo]);

  const installments = useMemo(() => {
    if (!effectivePrice || effectivePrice <= 0) return null;
    const x = effectivePrice / 10;
    return `em até 10x de ${formatCurrency(x)}`;
  }, [effectivePrice]);

  const imgPath = product?.images?.[0]?.path ?? null;
  const imgUrl = publicImageUrl("product-images", imgPath);

  return (
    <Card className="h-full overflow-hidden rounded-2xl bg-card shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[4/3] bg-muted/20 border-b border-border overflow-hidden">
        {imgUrl ? (
          <img src={imgUrl} alt={product?.name ?? "Produto"} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full bg-muted" />
        )}

        {hasPromo ? (
          <div className="absolute left-3 top-3">
            <div className="inline-flex items-center gap-1 rounded-xl bg-promo text-promo-foreground px-2.5 py-1 text-xs font-bold shadow-sm">
              <BadgePercent className="h-3.5 w-3.5" />
              {off > 0 ? `${off}% OFF` : "OFERTA"}
            </div>
          </div>
        ) : null}
      </div>

      <CardContent className="p-4 flex flex-col gap-3">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">{product?.unit ?? "un"}</div>
          <div className="mt-1 font-semibold leading-tight line-clamp-2">{product?.name}</div>
        </div>

        <div className="mt-auto">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              {hasPromo ? <div className="text-xs text-muted-foreground line-through">{formatCurrency(basePrice)}</div> : null}
              <div className="text-lg font-extrabold tracking-tight">{formatCurrency(effectivePrice)}</div>
              {installments ? <div className="text-xs text-muted-foreground">{installments}</div> : null}
            </div>

            <div className="flex items-center gap-2">
              <Input
                className="w-20 h-11 rounded-xl"
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                aria-label="Quantidade"
              />
              <Button className="h-11 rounded-xl px-4" onClick={() => onAdd(product.id, qty)}>
                Adicionar
              </Button>
            </div>
          </div>

          <Button asChild variant="outline" className="mt-3 w-full h-11 rounded-xl">
            <Link to={`/produto/${product?.id}`}>Ver produto</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

