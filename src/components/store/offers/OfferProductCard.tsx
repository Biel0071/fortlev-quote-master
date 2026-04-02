import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { publicImageUrl } from "@/utils/storage";
import { ShoppingCart } from "lucide-react";

type Props = {
  product: any;
  prices: { originalPrice: number; promoPrice: number; discountPct: number };
  onAdd: (id: string, qty: number) => void;
};

export function OfferProductCard({ product, prices, onAdd }: Props) {
  const nav = useNavigate();
  const imgPath = product?.images?.[0]?.path ?? null;
  const imgUrl = publicImageUrl("product-images", imgPath);

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={() => nav(`/produto/${product.id}`)}
      className="group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Badge */}
      <div className="relative aspect-square overflow-hidden border-b border-border bg-background flex items-center justify-center p-3">
        <span className="absolute top-2 left-2 z-10 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-white shadow-sm">
          -{prices.discountPct}%
        </span>
        {product.best_seller && (
          <span className="absolute top-2 right-2 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            Top
          </span>
        )}
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={product.name}
            className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full rounded-lg bg-muted animate-pulse" />
        )}
      </div>

      <CardContent className="flex flex-1 flex-col gap-2 p-2.5 sm:p-4">
        <h3 className="text-xs sm:text-sm font-semibold leading-snug line-clamp-2 min-h-[2.2em]">
          {product.name}
        </h3>

        <div className="mt-auto">
          <div className="text-[10px] sm:text-xs text-muted-foreground line-through">
            {formatCurrency(prices.originalPrice)}
          </div>
          <div className="text-base sm:text-lg font-extrabold text-orange-600 dark:text-orange-400">
            {formatCurrency(prices.promoPrice)}
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="mt-1">
          <Button
            variant="accent"
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
