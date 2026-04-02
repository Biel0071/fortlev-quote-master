import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { publicImageUrl } from "@/utils/storage";
import { ShoppingCart } from "lucide-react";

type Props = {
  product: any;
  prices: { originalPrice: number; promoPrice: number; discountPct: number };
  onAdd: (id: string, qty: number) => void;
};

export function OfferHeroCard({ product, prices, onAdd }: Props) {
  const nav = useNavigate();
  const imgPath = product?.images?.[0]?.path ?? null;
  const imgUrl = publicImageUrl("product-images", imgPath);
  const [qty] = useState(1);

  return (
    <div
      className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-md cursor-pointer group"
      onClick={() => nav(`/produto/${product.id}`)}
    >
      {/* Badge */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
          -{prices.discountPct}%
        </span>
        {product.best_seller && (
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-sm">
            Mais vendido
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="aspect-square sm:aspect-auto sm:w-1/2 flex items-center justify-center p-6 bg-background/50">
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={product.name}
              className="max-h-64 max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
              loading="eager"
            />
          ) : (
            <div className="h-48 w-48 rounded-xl bg-muted animate-pulse" />
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-center gap-3 p-5 sm:p-8 sm:w-1/2">
          <h2 className="text-xl sm:text-2xl font-bold leading-tight line-clamp-2">
            {product.name}
          </h2>

          <div>
            <div className="text-sm text-muted-foreground line-through">
              {formatCurrency(prices.originalPrice)}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-orange-600 dark:text-orange-400">
              {formatCurrency(prices.promoPrice)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              ou 10x de {formatCurrency(prices.promoPrice / 10)} sem juros
            </div>
          </div>

          <Button
            variant="accent"
            className="h-12 rounded-xl text-base font-semibold mt-2 w-full sm:w-auto"
            onClick={(e) => {
              e.stopPropagation();
              onAdd(product.id, qty);
            }}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Adicionar ao carrinho
          </Button>
        </div>
      </div>
    </div>
  );
}
