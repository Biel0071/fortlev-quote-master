import { useMemo, useState } from "react";
import { BadgePercent, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { StoreProduct } from "@/types/store";
import { formatCurrency } from "@/utils/formatters";
import { publicImageUrl } from "@/utils/storage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type HomeOffer = {
  id: string;
  product_id: string;
  badge_text: string | null;
  promo_price: number | null;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  active: boolean;
};

function percentOff(price: number, promo: number) {
  if (!price || price <= 0) return 0;
  const p = Math.round(((price - promo) / price) * 100);
  return Math.max(0, Math.min(99, p));
}

function pickOffersFallback(products: Array<any>, limit: number) {
  return (products ?? [])
    .filter((p) => Number(p?.promo_price ?? 0) > 0 && Number(p?.price ?? 0) > Number(p?.promo_price ?? 0))
    .sort((a, b) => {
      const ao = percentOff(Number(a.price ?? 0), Number(a.promo_price ?? 0));
      const bo = percentOff(Number(b.price ?? 0), Number(b.promo_price ?? 0));
      return bo - ao;
    })
    .slice(0, limit);
}

function OfferCard({
  product,
  promoOverride,
  badgeText,
  onAdd,
}: {
  product: any;
  promoOverride: number | null;
  badgeText: string | null;
  onAdd: (productId: string, qty: number) => void;
}) {
  const [qty, setQty] = useState<number>(1);
  const basePrice = Number(product?.price ?? 0);
  const promo = Number(promoOverride ?? product?.promo_price ?? 0);
  const hasPromo = promo > 0 && basePrice > 0 && promo < basePrice;
  const effective = hasPromo ? promo : basePrice;
  const off = hasPromo ? percentOff(basePrice, promo) : 0;

  const imgUrl = getProductImageUrl(product?.images);

  // Installments hint: fixed 10x (sem juros)
  const installments = useMemo(() => {
    if (!effective || effective <= 0) return null;
    return `ou 10x de ${formatCurrency(effective / 10)} sem juros`;
  }, [effective]);

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
              {off > 0 ? `${off}% OFF` : badgeText || "OFERTA"}
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
          {hasPromo ? <div className="text-xs text-muted-foreground line-through">{formatCurrency(basePrice)}</div> : null}
          <div className="text-lg font-extrabold tracking-tight">
            {formatCurrency(effective)}
            {product?.unit && product.unit !== "un" && (
              <span className="text-xs font-medium text-muted-foreground">/{product.unit}</span>
            )}
          </div>
          {installments ? <div className="text-xs text-muted-foreground">{installments}</div> : null}

          <div className="mt-3 flex items-center gap-2">
            <Input
              className="w-20 h-11 rounded-xl"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              aria-label={`Quantidade de ${product?.name ?? "produto"}`}
            />
            <Button onClick={() => onAdd(product.id, qty)} className="h-11 rounded-xl flex-1">
              Adicionar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function HomeWeeklyOffers({
  loading,
  offers,
  products,
  onAdd,
  hideHeader,
  productIds,
  badgesByProductId,
}: {
  loading: boolean;
  offers: HomeOffer[];
  products: (StoreProduct & { images?: Array<{ path: string | null }> })[];
  onAdd: (productId: string, qty: number) => void;
  hideHeader?: boolean;
  productIds?: string[];
  badgesByProductId?: Record<string, string>;
}) {
  const curated = useMemo(() => (offers ?? []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [offers]);

  const byId = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of products as any[]) m.set(p.id, p);
    return m;
  }, [products]);

  const curatedResolved = useMemo(() => {
    return curated
      .map((o) => {
        const p = byId.get(o.product_id);
        if (!p) return null;
        return { offer: o, product: p };
      })
      .filter(Boolean) as Array<any>;
  }, [curated, byId]);

  const merchResolved = useMemo(() => {
    if (!productIds || productIds.length === 0) return [] as Array<any>;
    return productIds
      .map((id) => {
        const p = byId.get(id);
        if (!p) return null;
        const badge = badgesByProductId?.[id] ?? null;
        return {
          offer: badge ? ({ id: `badge_${id}`, product_id: id, badge_text: badge, promo_price: null } as any) : null,
          product: p,
        };
      })
      .filter(Boolean) as Array<any>;
  }, [productIds, byId, badgesByProductId]);

  const fallback = useMemo(() => {
    if (curatedResolved.length > 0) return [];
    return pickOffersFallback(products as any[], 8).map((p: any) => ({ product: p, offer: null }));
  }, [curatedResolved.length, products]);

  const visible = merchResolved.length > 0 ? merchResolved : curatedResolved.length > 0 ? curatedResolved : fallback;

  return (
    <section className="space-y-4">
      {!hideHeader ? (
        <header className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Ofertas da semana
            </h2>
            <p className="text-sm text-muted-foreground">Preços especiais para comprar agora — adicione sem sair da Home.</p>
          </div>
        </header>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[340px] w-full rounded-2xl" />
          ))}
        </div>
      ) : visible.length === 0 ? null : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5 auto-rows-fr">
          {visible.slice(0, 8).map((x: any) => (
            <OfferCard
              key={(x.offer?.id ?? x.product.id) as string}
              product={x.product}
              promoOverride={x.offer?.promo_price ?? null}
              badgeText={x.offer?.badge_text ?? null}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </section>
  );
}
