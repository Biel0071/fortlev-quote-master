import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVisitorTracker } from "@/hooks/useVisitorTracker";
import { trackClickEvent } from "@/utils/clickTracking";
import { formatCurrency } from "@/utils/formatters";
import { publicImageUrl } from "@/utils/storage";

function QtyStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-xl border border-border bg-card px-1 py-1"
      aria-label={`Quantidade ${value}`}
    >
      <Button
        type="button"
        variant="ghost"
        className="h-10 w-10 rounded-lg"
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label="Diminuir quantidade"
      >
        −
      </Button>
      <div className="min-w-8 text-center text-sm font-bold tabular-nums">{value}</div>
      <Button
        type="button"
        variant="ghost"
        className="h-10 w-10 rounded-lg"
        onClick={() => onChange(value + 1)}
        aria-label="Aumentar quantidade"
      >
        +
      </Button>
    </div>
  );
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

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={() => {
        trackClickEvent({ sessionToken: tracker.sessionToken, type: "open_product", productId: product?.id });
        nav(`/produto/${product?.id}`);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          trackClickEvent({ sessionToken: tracker.sessionToken, type: "open_product", productId: product?.id });
          nav(`/produto/${product?.id}`);
        }
      }}
      className="group h-full overflow-hidden rounded-2xl bg-card shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
      aria-label={`Abrir produto ${product?.name ?? ""}`}
    >
      <div className="relative aspect-square bg-white border-b border-border overflow-hidden flex items-center justify-center p-2">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={product?.name ?? "Produto"}
            className="max-h-full max-w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
      </div>

      <CardContent className="p-4 sm:p-4 flex flex-col gap-3">
        <div className="min-w-0">
          <div className="text-[15px] sm:text-sm font-semibold leading-snug line-clamp-2">{product?.name}</div>
        </div>

        <div className="mt-auto space-y-3">
          <div className="min-w-0">
            {hasPromo ? (
              <div className="text-xs text-muted-foreground line-through">{formatCurrency(basePrice)}</div>
            ) : null}
            <div className="text-lg sm:text-lg font-extrabold tracking-tight">{formatCurrency(effectivePrice)}</div>
            {installments ? <div className="text-xs text-muted-foreground">{installments}</div> : null}
          </div>

          <div
            className="flex flex-col gap-2"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[140px,1fr] sm:items-center">
              <QtyStepper value={qty} onChange={setQty} />
              <Button
                variant="accent"
                className={`h-12 rounded-xl px-4 w-full text-base transition-transform ${addingFx ? "scale-[0.97]" : ""}`}
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
        </div>
      </CardContent>
    </Card>
  );
}

