import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const effectivePrice = useMemo(() => {
    const promo = Number(product?.promo_price ?? 0);
    return promo > 0 ? promo : Number(product?.price ?? 0);
  }, [product]);

  const imgPath = product?.images?.[0]?.path ?? null;
  const imgUrl = publicImageUrl("product-images", imgPath);

  return (
    <Card className="overflow-hidden rounded-2xl glass-card card-hover">
      <div className="aspect-[4/3] bg-muted/20 border-b border-border overflow-hidden">
        {imgUrl ? (
          <img src={imgUrl} alt={product?.name ?? "Produto"} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full fortlev-gradient opacity-35" />
        )}
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-base line-clamp-2">{product?.name}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{product?.unit ?? "un"}</div>
          <div className="text-right">
            {Number(product?.promo_price ?? 0) > 0 ? (
              <div className="text-xs text-muted-foreground line-through">{formatCurrency(Number(product?.price ?? 0))}</div>
            ) : null}
            <div className="font-semibold">{formatCurrency(effectivePrice)}</div>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <Input
            className="w-24"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            aria-label="Quantidade"
          />
          <Button className="flex-1" onClick={() => onAdd(product.id, qty)}>
            Adicionar
          </Button>
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link to={`/produto/${product?.id}`}>Ver produto</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
