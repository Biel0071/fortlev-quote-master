import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const nav = useNavigate();
  const [qty, setQty] = useState<number>(1);

  const basePrice = Number(product?.price ?? 0);
  const promo = Number(product?.promo_price ?? 0);
  const hasPromo = promo > 0 && basePrice > 0 && promo < basePrice;

  const effectivePrice = useMemo(() => (hasPromo ? promo : basePrice), [hasPromo, promo, basePrice]);

  const installments = useMemo(() => {
    if (!effectivePrice || effectivePrice <= 0) return null;
    const x = effectivePrice / 10;
    return `em até 10x de ${formatCurrency(x)}`;
  }, [effectivePrice]);

  const imgPath = product?.images?.[0]?.path ?? null;
  const imgUrl = publicImageUrl("product-images", imgPath);

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={() => nav(`/produto/${product?.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") nav(`/produto/${product?.id}`);
      }}
      className="group h-full overflow-hidden rounded-2xl bg-card shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
      aria-label={`Abrir produto ${product?.name ?? ""}`}
    >
      <div className="relative aspect-[4/3] bg-muted/20 border-b border-border overflow-hidden">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={product?.name ?? "Produto"}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
      </div>

      <CardContent className="p-4 flex flex-col gap-3">
        <div className="min-w-0">
          <div className="font-semibold leading-tight line-clamp-2">{product?.name}</div>
        </div>

        <div className="mt-auto space-y-3">
          <div className="min-w-0">
            {hasPromo ? <div className="text-xs text-muted-foreground line-through">{formatCurrency(basePrice)}</div> : null}
            <div className="text-lg font-extrabold tracking-tight">{formatCurrency(effectivePrice)}</div>
            {installments ? <div className="text-xs text-muted-foreground">{installments}</div> : null}
          </div>

          <div
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Input
              className="w-full sm:w-20 h-11 rounded-xl"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              aria-label="Quantidade"
            />
            <Button
              className="h-11 rounded-xl px-4 w-full"
              onClick={(e) => {
                e.stopPropagation();
                onAdd(product.id, qty);
              }}
            >
              Adicionar ao carrinho
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

