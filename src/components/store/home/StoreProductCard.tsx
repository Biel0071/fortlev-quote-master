import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVisitorTracker } from "@/hooks/useVisitorTracker";
import { trackClickEvent } from "@/utils/clickTracking";
import { formatCurrency } from "@/utils/formatters";
import { publicImageUrl } from "@/utils/storage";
import { cloud } from "@/lib/cloud";
import { getProductSlug } from "@/utils/productSlug";

// Shared cache so we don't re-fetch per card
const ratingsCache = new Map<string, { avg: number; total: number } | null>();
const ratingsFetched = new Set<string>();

function useProductRating(productId: string) {
  const [rating, setRating] = useState<{ avg: number; total: number } | null>(
    ratingsCache.get(productId) ?? null,
  );

  useEffect(() => {
    if (!productId || ratingsFetched.has(productId)) return;
    ratingsFetched.add(productId);
    cloud
      .from("product_rating_summary")
      .select("average_rating, total_reviews")
      .eq("product_id", productId)
      .maybeSingle()
      .then(({ data }) => {
        const d = data as any;
        const val = d && d.total_reviews > 0 ? { avg: d.average_rating, total: d.total_reviews } : null;
        ratingsCache.set(productId, val);
        setRating(val);
      });
  }, [productId]);

  return rating;
}

function MiniStars({ avg, total }: { avg: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mt-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.round(avg)
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted-foreground/40"
            }`}
          />
        ))}
      </div>
      <span className="text-[11px] text-muted-foreground ml-0.5">
        ({total})
      </span>
    </div>
  );
}

function QtyStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-lg sm:rounded-xl border border-border bg-card px-0.5 sm:px-1 py-0.5 sm:py-1"
      aria-label={`Quantidade ${value}`}
    >
      <Button
        type="button"
        variant="ghost"
        className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg text-sm sm:text-base"
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label="Diminuir quantidade"
      >
        −
      </Button>
      <div className="min-w-6 sm:min-w-8 text-center text-xs sm:text-sm font-bold tabular-nums">{value}</div>
      <Button
        type="button"
        variant="ghost"
        className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg text-sm sm:text-base"
        onClick={() => onChange(value + 1)}
        aria-label="Aumentar quantidade"
      >
        +
      </Button>
    </div>
  );
}

function ProductCardRating({ productId }: { productId: string }) {
  const rating = useProductRating(productId);
  if (!rating) return null;
  return <MiniStars avg={rating.avg} total={rating.total} />;
}

export function StoreProductCard({
  product,
  onAdd,
}: {
  product: any;
  onAdd: (productId: string, qty: number) => void;
}) {
  const nav = useNavigate();
  const tracker = useVisitorTracker();
  const [qty, setQty] = useState(1);
  const [addingFx, setAddingFx] = useState(false);

  useEffect(() => {
    if (!addingFx) return;
    const t = window.setTimeout(() => setAddingFx(false), 260);
    return () => window.clearTimeout(t);
  }, [addingFx]);

  const basePrice = Number(product?.price ?? 0);
  const promo = Number(product?.promo_price ?? 0);
  const hasPromo = promo > 0 && basePrice > 0 && promo < basePrice;

  const effectivePrice = useMemo(() => (hasPromo ? promo : basePrice), [hasPromo, promo, basePrice]);

  const installments = useMemo(() => {
    if (!effectivePrice || effectivePrice <= 0) return null;
    const x = effectivePrice / 10;
    return `ou 10x de ${formatCurrency(x)} sem juros`;
  }, [effectivePrice]);

  const imgPath = product?.images?.[0]?.path ?? null;
  const imgUrl = publicImageUrl("product-images", imgPath);
  const imageSrc = imgUrl || "/placeholder.svg";

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={() => {
        trackClickEvent({ sessionToken: tracker.sessionToken, type: "open_product", productId: product?.id });
        nav(`/produto/${getProductSlug(product)}`);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          trackClickEvent({ sessionToken: tracker.sessionToken, type: "open_product", productId: product?.id });
          nav(`/produto/${getProductSlug(product)}`);
        }
      }}
      className="group flex h-full w-full min-w-0 max-w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md"
      aria-label={`Abrir produto ${product?.name ?? ""}`}
    >
      {/* Image — fixed aspect ratio */}
      <div className="relative aspect-square overflow-hidden border-b border-border bg-background flex items-center justify-center p-2 sm:p-3">
        {hasPromo && (
          <span className="absolute top-2 left-2 z-10 rounded-full bg-destructive px-2 py-0.5 text-[10px] sm:text-xs font-bold text-destructive-foreground shadow-sm">
            -{Math.round(((basePrice - promo) / basePrice) * 100)}%
          </span>
        )}
        <img
          src={imageSrc}
          alt={product?.name ?? "Produto"}
          className="max-h-full max-w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
      </div>

      {/* Content */}
      <CardContent className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden p-2.5 sm:p-4">
        {/* Name + Stars */}
        <div className="min-w-0">
          <h3 className="text-xs sm:text-[15px] font-semibold leading-snug line-clamp-2 min-h-[2.2em] sm:min-h-[2.5em]">
            {product?.name}
          </h3>
          <ProductCardRating productId={product?.id} />
        </div>

        {/* Price */}
        <div className="min-w-0 mt-auto pt-0.5 sm:pt-1">
          {hasPromo && (
            <div className="text-[10px] sm:text-xs text-muted-foreground line-through">{formatCurrency(basePrice)}</div>
          )}
          <div className="text-base sm:text-lg font-extrabold tracking-tight leading-tight">{formatCurrency(effectivePrice)}</div>
          <div className="text-xs sm:text-sm font-bold text-green-600 mt-0.5">
            {formatCurrency(effectivePrice * 0.93)} no PIX
          </div>
          {installments && (
            <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">{installments}</div>
          )}
        </div>

        {/* Qty + Add button */}
        <div
          className="flex-shrink-0 mt-1.5 sm:mt-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <QtyStepper value={qty} onChange={setQty} />
            <Button
              variant="accent"
              className={`h-10 sm:h-12 rounded-xl px-3 sm:px-4 w-full text-xs sm:text-base font-semibold transition-transform ${addingFx ? "scale-[0.97]" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setAddingFx(true);
                trackClickEvent({ sessionToken: tracker.sessionToken, type: "add_to_cart", productId: product.id });
                onAdd(product.id, qty);
              }}
            >
              Adicionar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
