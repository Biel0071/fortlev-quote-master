import { Badge } from "@/components/ui/badge";

function pctOff(base: number, promo: number) {
  if (!base || !promo) return null;
  if (promo >= base) return null;
  const pct = Math.round(((base - promo) / base) * 100);
  if (!Number.isFinite(pct) || pct <= 0) return null;
  return pct;
}

export function ProductBadges({
  featured,
  basePrice,
  promoPrice,
}: {
  featured?: boolean | null;
  basePrice: number;
  promoPrice: number;
}) {
  const off = pctOff(basePrice, promoPrice);
  if (!featured && !off) return null;

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
    </div>
  );
}
