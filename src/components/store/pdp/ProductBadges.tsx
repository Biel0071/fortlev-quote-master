import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cloud } from "@/lib/cloud";

function pctOff(base: number, promo: number) {
  if (!base || !promo) return null;
  if (promo >= base) return null;
  const pct = Math.round(((base - promo) / base) * 100);
  if (!Number.isFinite(pct) || pct <= 0) return null;
  return pct;
}

function InlineRating({ productId }: { productId: string }) {
  const [data, setData] = useState<{ avg: number; total: number } | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!productId) {
      setResolved(true);
      setData(null);
      return;
    }

    let alive = true;
    setResolved(false);

    cloud
      .from("product_rating_summary")
      .select("average_rating, total_reviews")
      .eq("product_id", productId)
      .maybeSingle()
      .then(({ data: d }) => {
        if (!alive) return;
        const row = d as any;
        if (row && Number(row.total_reviews ?? 0) > 0) {
          setData({ avg: Number(row.average_rating ?? 0), total: Number(row.total_reviews ?? 0) });
        } else {
          setData(null);
        }
        setResolved(true);
      })
      .catch(() => {
        if (!alive) return;
        setData(null);
        setResolved(true);
      });

    return () => {
      alive = false;
    };
  }, [productId]);

  if (!resolved) return null;

  if (!data) {
    return <span className="text-xs text-muted-foreground">Sem avaliações ainda</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-px">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i < Math.round(data.avg) ? "fill-primary text-primary" : "text-muted-foreground/20"}`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {Number(data.avg).toFixed(1)} ({data.total})
      </span>
    </div>
  );
}

export function ProductBadges({
  featured,
  basePrice,
  promoPrice,
  productId,
}: {
  featured?: boolean | null;
  basePrice: number;
  promoPrice: number;
  productId?: string;
}) {
  const off = pctOff(basePrice, promoPrice);
  const hasRating = Boolean(productId);

  if (!featured && !off && !hasRating) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {featured ? (
        <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
          DESTAQUE
        </Badge>
      ) : null}
      {off ? (
        <Badge className="rounded-full px-3 py-1 text-xs">-{off}% OFF</Badge>
      ) : null}
      {productId ? <InlineRating productId={productId} /> : null}
    </div>
  );
}
