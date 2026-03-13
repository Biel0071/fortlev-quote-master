import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Truck, CreditCard, ShieldCheck, BadgeCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { CartDrawer } from "@/components/store/CartDrawer";
import { StoreFooter } from "@/components/store/StoreFooter";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useVisitorTracker } from "@/hooks/useVisitorTracker";
import { useHomeContent } from "@/hooks/useHomeContent";
import { useStorePages } from "@/hooks/useStorePages";
import { formatCurrency } from "@/utils/formatters";
import { publicImageUrl } from "@/utils/storage";
import { generateStandardProductDescription } from "@/utils/productDescription";
import { trackClickEvent } from "@/utils/clickTracking";

import { ProductBadges } from "@/components/store/pdp/ProductBadges";
import { ProductReviews } from "@/components/store/pdp/ProductReviews";
import { CustomerReviewForm } from "@/components/store/pdp/CustomerReviewForm";
import { QuantitySelector } from "@/components/store/pdp/QuantitySelector";
import { ShippingCalculator } from "@/components/store/pdp/ShippingCalculator";
import { PaymentLogosReal } from "@/components/store/pdp/PaymentLogosReal";
import { cloud } from "@/lib/cloud";

function parseInlineBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="font-semibold text-foreground">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function ProductDescription({ markdown }: { markdown: string }) {
  const lines = useMemo(() => markdown.split(/\r?\n/), [markdown]);

  const blocks = useMemo(() => {
    const out: Array<
      | { kind: "h2"; text: string }
      | { kind: "p"; text: string }
      | { kind: "kv"; key: string; value: string }
    > = [];

    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line.trim()) continue;

      if (line.startsWith("## ")) {
        out.push({ kind: "h2", text: line.replace(/^##\s+/, "").trim() });
        continue;
      }

      // Strip leading "- " for list items
      const cleaned = line.replace(/^-\s+/, "").trim();

      // Match "**Key:** Value" or "**Key** Value" patterns
      const boldKv = cleaned.match(/^\*\*(.+?)\*\*:?\s*(.*)$/);
      if (boldKv) {
        out.push({ kind: "kv", key: boldKv[1].trim(), value: (boldKv[2] ?? "-").trim() || "-" });
        continue;
      }

      // Match "Key: Value" patterns
      const kv = cleaned.match(/^([^:]{2,30}):\s+(.+)$/);
      if (kv) {
        out.push({ kind: "kv", key: kv[1].trim(), value: (kv[2] ?? "-").trim() || "-" });
        continue;
      }

      out.push({ kind: "p", text: cleaned });
    }

    return out;
  }, [lines]);

  return (
    <div className="w-full min-w-0 space-y-1.5 overflow-hidden break-words">
      {blocks.map((b, idx) => {
        if (b.kind === "h2") {
          return (
            <h2 key={idx} className="text-sm font-semibold tracking-tight text-foreground pt-1 first:pt-0">
              {b.text}
            </h2>
          );
        }
        if (b.kind === "kv") {
          return (
            <div key={idx} className="text-xs leading-relaxed break-words">
              <span className="font-semibold text-foreground">{b.key}: </span>
              <span className="text-muted-foreground">{b.value}</span>
            </div>
          );
        }
        return (
          <p key={idx} className="text-xs text-muted-foreground leading-relaxed break-words">
            {parseInlineBold(b.text)}
          </p>
        );
      })}
    </div>
  );
}

function splitDescription(markdown: string) {
  const md = (markdown ?? "").trim();
  if (!md) return { general: "", tech: "" };

  const generalIdx = md.search(/^##\s+Descrição Geral\s*$/m);
  const techIdx = md.search(/^##\s+Ficha Técnica\s*$/m);

  if (generalIdx === -1 && techIdx === -1) return { general: md, tech: "" };

  const startGeneral = generalIdx !== -1 ? generalIdx : 0;
  const startTech = techIdx !== -1 ? techIdx : -1;

  if (startTech === -1) {
    return { general: md.slice(startGeneral).trim(), tech: "" };
  }

  const general = md.slice(startGeneral, startTech).trim();
  const tech = md.slice(startTech).trim();
  return { general, tech };
}

function ProductRatingBadge({ productId }: { productId: string }) {
  const [summary, setSummary] = useState<{ average_rating: number; total_reviews: number } | null>(null);

  useEffect(() => {
    if (!productId) return;
    cloud
      .from("product_rating_summary")
      .select("average_rating, total_reviews")
      .eq("product_id", productId)
      .single()
      .then(({ data }) => {
        if (data && (data as any).total_reviews > 0) setSummary(data as any);
      });
  }, [productId]);

  if (!summary) return null;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i < Math.round(summary.average_rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {Number(summary.average_rating).toFixed(1)} ({summary.total_reviews})
      </span>
    </div>
  );
}

export default function ProductPage() {
  const { id } = useParams();
  const cart = useCart();
  const tracker = useVisitorTracker();
  const { activeProducts, loading } = useStoreProducts();

  const home = useHomeContent();
  const storePages = useStorePages();
  const pageLinks = useMemo(
    () => storePages.publishedPages.map((p) => ({ title: p.title, slug: p.slug })),
    [storePages.publishedPages],
  );

  const [cartOpen, setCartOpen] = useState(false);

  const product = useMemo(() => activeProducts.find((p) => p.id === id), [activeProducts, id]);

  const images = useMemo(() => {
    const list = (product as any)?.images ?? [];
    return Array.isArray(list) ? list : [];
  }, [product]);

  const [activeImg, setActiveImg] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const basePrice = useMemo(() => Number((product as any)?.price ?? 0), [product]);
  const promoPrice = useMemo(() => Number((product as any)?.promo_price ?? 0), [product]);
  const hasPromo = promoPrice > 0 && basePrice > 0 && promoPrice < basePrice;
  const effectivePrice = hasPromo ? promoPrice : basePrice;

  const totalDynamic = useMemo(() => Math.max(0, effectivePrice * Math.max(1, qty)), [effectivePrice, qty]);

  const installments = useMemo(() => {
    if (!effectivePrice || effectivePrice <= 0) return null;
    return `ou 10x de ${formatCurrency(effectivePrice / 10)} sem juros`;
  }, [effectivePrice]);

  const pixPrice = useMemo(() => {
    if (!effectivePrice || effectivePrice <= 0) return null;
    const v = effectivePrice * 0.93;
    return v > 0 ? v : null;
  }, [effectivePrice]);

  const descriptionMd = useMemo(() => {
    const existing = String((product as any)?.description ?? "").trim();
    if (existing) return existing;
    if (!product) return "";
    return generateStandardProductDescription({
      id: (product as any).id,
      name: (product as any).name,
      categoryName: (product as any).category ?? "",
      sku: (product as any).sku ?? null,
      unit: (product as any).unit ?? null,
    });
  }, [product]);

  const descriptionParts = useMemo(() => splitDescription(descriptionMd), [descriptionMd]);

  useEffect(() => {
    if (!id) return;
    const key = "store_product_views_v1";
    const prev = Number(sessionStorage.getItem(key) || "0");
    const next = prev + 1;
    sessionStorage.setItem(key, String(next));
    window.dispatchEvent(new CustomEvent("store:product-visit", { detail: { productId: id, count: next } }));
  }, [id]);

  useEffect(() => {
    const first = images?.[0]?.path ? publicImageUrl("product-images", images[0].path) : null;
    setActiveImg(first);
  }, [images]);

  return (
    <div className="min-h-screen bg-background">
      <StoreTopbar cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <StoreMobileChrome cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)} />

      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-28 md:pb-10 space-y-4 sm:space-y-6 overflow-x-hidden">
        <Button asChild variant="ghost" className="h-9 sm:h-11 rounded-2xl w-fit text-sm">
          <Link to="/loja">← Voltar</Link>
        </Button>

        {loading ? (
          <div className="text-muted-foreground text-sm">Carregando...</div>
        ) : !product ? (
          <div className="text-muted-foreground text-sm">Produto não encontrado.</div>
        ) : (
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
            {/* Gallery */}
            <div className="lg:col-span-7">
              <Card className="rounded-2xl sm:rounded-3xl overflow-hidden border-border bg-card shadow-sm">
                <div className="aspect-[4/3] bg-muted/20">
                  {activeImg ? (
                    <img src={activeImg} alt={product.name} className="h-full w-full object-cover" loading="eager" />
                  ) : (
                    <div className="h-full w-full bg-muted" />
                  )}
                </div>
                {images.length > 1 ? (
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex gap-1.5 sm:gap-2 overflow-x-auto">
                      {images.slice(0, 8).map((im: any, idx: number) => {
                        const url = publicImageUrl("product-images", im.path);
                        const active = url && url === activeImg;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveImg(url)}
                            className={`shrink-0 h-14 w-14 sm:h-16 sm:w-16 rounded-lg sm:rounded-xl overflow-hidden border-2 transition-colors ${
                              active ? "border-primary" : "border-border"
                            }`}
                            aria-label={`Ver imagem ${idx + 1}`}
                          >
                            <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                ) : null}
              </Card>
            </div>

            {/* Product info */}
            <div className="lg:col-span-5 space-y-3 sm:space-y-4 min-w-0">
              <ProductBadges featured={Boolean((product as any).featured)} basePrice={basePrice} promoPrice={promoPrice} />

              <div>
                <h1 className="text-xl sm:text-[28px] font-bold tracking-tight leading-tight">{product.name}</h1>

                {/* Rating badge */}
                <div className="mt-1.5">
                  <ProductRatingBadge productId={(product as any).id} />
                </div>

                <div className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                  {Number((product as any).stock ?? 0) <= Number((product as any).min_stock ?? 0) ? (
                    <span>Últimas unidades disponíveis</span>
                  ) : (
                    <span>Disponível para envio imediato</span>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="space-y-1">
                {hasPromo ? (
                  <div className="text-xs sm:text-sm text-muted-foreground line-through">De {formatCurrency(basePrice)}</div>
                ) : null}
                <div className="text-2xl sm:text-4xl font-extrabold tracking-tight">{formatCurrency(effectivePrice)}</div>
                {installments ? <div className="text-xs sm:text-sm text-muted-foreground">{installments}</div> : null}
              </div>

              {/* PIX */}
              {pixPrice ? (
                <Card className="rounded-2xl border-border bg-card shadow-sm">
                  <CardContent className="p-3 sm:p-5">
                    <div className="text-xs sm:text-sm font-medium text-foreground">7% de desconto no PIX</div>
                    <div className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                      No PIX: <span className="font-medium text-foreground">{formatCurrency(pixPrice)}</span>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Total */}
              <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 px-3 sm:px-4 py-2.5 sm:py-3">
                <span className="text-xs sm:text-sm text-muted-foreground">Total</span>
                <span className="text-base sm:text-lg font-bold">{formatCurrency(totalDynamic)}</span>
              </div>

              <QuantitySelector value={qty} onChange={setQty} />

              <Button
                className="h-12 sm:h-14 rounded-2xl w-full shadow-sm transition-transform active:scale-[0.99] text-sm sm:text-base"
                onClick={() => {
                  trackClickEvent({ sessionToken: tracker.sessionToken, type: "add_to_cart", productId: (product as any).id });
                  tracker.track({ type: "add_cart", productId: (product as any).id, categoryId: (product as any).category_id ?? null });

                  cart.add((product as any).id, Math.max(1, qty), {
                    name: (product as any).name ?? "Produto",
                    unitPrice: effectivePrice,
                    unit: (product as any).unit ?? "un",
                    imagePath: (product as any)?.images?.[0]?.path ?? null,
                  });
                  setCartOpen(true);
                }}
              >
                Adicionar ao carrinho
              </Button>

              <ShippingCalculator subtotal={totalDynamic} />

              {/* Info cards */}
              <Card className="rounded-2xl border-border bg-card shadow-sm">
                <CardContent className="p-3 sm:p-5">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="rounded-xl border border-border bg-secondary/30 p-3">
                      <div className="text-[10px] sm:text-xs text-muted-foreground">Unidade</div>
                      <div className="text-sm font-medium">{(product as any).unit ?? "un"}</div>
                    </div>

                    <div className="rounded-xl border border-border bg-secondary/30 p-3">
                      <div className="text-[10px] sm:text-xs text-muted-foreground">Prazo</div>
                      <div className="text-sm font-medium">3 a 7 dias úteis</div>
                    </div>

                    <div className="rounded-xl border border-border bg-secondary/30 p-3 col-span-2">
                      <div className="text-[10px] sm:text-xs text-muted-foreground">Pagamento</div>
                      <div className="text-sm font-medium">Cartão • Boleto • Pix</div>
                      <PaymentLogosReal />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {[
                  { icon: Truck, label: "Entrega" },
                  { icon: CreditCard, label: "Parcelamento" },
                  { icon: ShieldCheck, label: "Segurança" },
                  { icon: BadgeCheck, label: "Garantia" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Description */}
              {descriptionParts.general ? (
                <Card className="rounded-2xl border-border bg-card shadow-sm">
                  <CardContent className="p-3 sm:p-5">
                    <ProductDescription markdown={descriptionParts.general} />
                  </CardContent>
                </Card>
              ) : null}

              {descriptionParts.tech ? (
                <Card className="rounded-2xl border-border bg-card shadow-sm">
                  <CardContent className="p-3 sm:p-5">
                    <ProductDescription markdown={descriptionParts.tech} />
                  </CardContent>
                </Card>
              ) : null}

              {/* Reviews */}
              <ProductReviews productId={(product as any).id} />

              {/* Customer review form */}
              <CustomerReviewForm productId={(product as any).id} productName={product.name} />
            </div>
          </div>
        )}
      </main>

      <StoreFooter footer={home.footer} pageLinks={pageLinks} />
    </div>
  );
}
