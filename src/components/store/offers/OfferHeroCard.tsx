import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { publicImageUrl } from "@/utils/storage";
import { ShoppingCart, Star } from "lucide-react";
import { useProductRatingSummary } from "@/hooks/useProductRatingSummary";
import { getProductSlug } from "@/utils/productSlug";

type Props = {
  products: any[];
  getOfferPrices: (p: any) => { originalPrice: number; promoPrice: number; discountPct: number };
  onAdd: (id: string, qty: number) => void;
};

export function OfferHeroCard({ products, getOfferPrices, onAdd }: Props) {
  const nav = useNavigate();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (products.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % products.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [products.length]);

  const product = products[index];
  if (!product) return null;

  const prices = getOfferPrices(product);
  const images = (product?.images ?? []) as Array<{ path: string | null }>;
  const validImg = images.find(
    (img) => img.path && !img.path.includes("placeholder") && !img.path.includes("default")
  );
  const imgPath = validImg?.path ?? images[0]?.path ?? null;
  const imgUrl = publicImageUrl("product-images", imgPath);
  const imageSrc = imgUrl || "/placeholder.svg";
  const unitLabel = product.unit && product.unit !== "un" ? `/${product.unit}` : "";
  const rating = useProductRatingSummary(product.id);
  const isMock = Boolean(product?.isMock);

  const openProduct = () => {
    if (isMock) return;
    nav(`/produto/${getProductSlug(product)}`);
  };

  return (
    <div className="relative">
      <div
        className={`relative rounded-2xl border border-border bg-card overflow-hidden shadow-md group ${isMock ? "cursor-default" : "cursor-pointer"}`}
        onClick={openProduct}
      >
        {/* Badge */}
        <div className="absolute top-3 left-3 z-10 flex gap-2">
          <span className="rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground shadow-sm">
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
          <div className="aspect-square sm:aspect-auto sm:w-1/2 flex items-center justify-center p-6 bg-muted/30">
            <img
              src={imageSrc}
              alt={product.name}
              className="max-h-64 max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
              loading="eager"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center gap-3 p-5 sm:p-8 sm:w-1/2">
            <h2 className="text-xl sm:text-2xl font-bold leading-tight line-clamp-2">
              {product.name}
            </h2>

            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < Math.round(rating?.avg ?? 0) ? "fill-current text-promo" : "fill-muted text-muted-foreground/40"}`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {rating?.avg ?? 0} ({rating?.total ?? 0})
              </span>
            </div>

            <div>
              <div className="text-sm text-muted-foreground line-through">
                {formatCurrency(prices.originalPrice)}
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-destructive">
                {formatCurrency(prices.promoPrice)}{unitLabel}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                ou 10x de {formatCurrency(prices.promoPrice / 10)} sem juros
              </div>
              <div className="text-sm font-bold text-pix mt-0.5">
                {formatCurrency(prices.promoPrice * 0.93)} no PIX
              </div>
            </div>

            <Button
              variant="default"
              className="h-12 rounded-xl text-base font-semibold mt-2 w-full sm:w-auto"
              onClick={(e) => {
                e.stopPropagation();
                onAdd(product.id, 1);
              }}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Adicionar ao carrinho
            </Button>
          </div>
        </div>
      </div>

      {/* Dots indicator */}
      {products.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {products.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
