import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { publicImageUrl } from "@/utils/storage";
import { ShoppingCart, Star } from "lucide-react";
import { useProductRatingSummary } from "@/hooks/useProductRatingSummary";
import { getProductSlug } from "@/utils/productSlug";

type Props = {
  product: any;
  prices: { originalPrice: number; promoPrice: number; discountPct: number };
  onAdd: (id: string, qty: number) => void;
};

export function OfferProductCard({ product, prices, onAdd }: Props) {
  const nav = useNavigate();
  const imgPath = product?.images?.[0]?.path ?? null;
  const imgUrl = publicImageUrl("product-images", imgPath);
  const imageSrc = imgUrl || "/placeholder.svg";
  const rating = useProductRatingSummary(product.id);
  const isMock = Boolean(product?.isMock);

  const openProduct = () => {
    if (isMock) return;
    nav(`/produto/${getProductSlug(product)}`);
  };

  return (
    <Card
      role={isMock ? undefined : "link"}
      tabIndex={isMock ? -1 : 0}
      onClick={openProduct}
      className={`card-oferta group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-transform duration-300 hover:scale-[1.03] hover:shadow-md ${isMock ? "cursor-default" : "cursor-pointer"}`}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden border-b border-border bg-muted/30 flex items-center justify-center p-3">
        <span className="absolute top-2 left-2 z-10 rounded-full bg-destructive px-2 py-0.5 text-[10px] sm:text-xs font-bold text-destructive-foreground shadow-sm">
          -{prices.discountPct}%
        </span>
        {product.best_seller && (
          <span className="absolute top-2 right-2 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            Top
          </span>
        )}
        <img
          src={imageSrc}
          alt={product.name}
          className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
      </div>

      <CardContent className="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-4">
        <h3 className="text-xs sm:text-sm font-semibold leading-snug line-clamp-2 min-h-[2.2em]">
          {product.name}
        </h3>

        <div className="flex items-center gap-1">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${i < Math.round(rating?.avg ?? 0) ? "fill-current text-promo" : "fill-muted text-muted-foreground/40"}`}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">({rating?.total ?? 0})</span>
        </div>

        <div className="mt-auto">
          <div className="text-[10px] sm:text-xs text-muted-foreground line-through">
            {formatCurrency(prices.originalPrice)}
          </div>
          <div className="text-base sm:text-lg font-extrabold text-destructive">
            {formatCurrency(prices.promoPrice)}
          </div>
          <div className="text-xs font-bold text-pix mt-0.5">
            {formatCurrency(prices.promoPrice * 0.93)} no PIX
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="mt-1">
          <Button
            variant="default"
            className="h-9 sm:h-10 rounded-xl w-full text-xs sm:text-sm font-semibold"
            onClick={(e) => {
              e.stopPropagation();
              onAdd(product.id, 1);
            }}
          >
            <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
            Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
