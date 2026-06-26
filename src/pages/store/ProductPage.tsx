import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Truck, CreditCard, ShieldCheck, BadgeCheck, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StoreLayout } from "@/components/store/layout/StoreLayout";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useVisitorTracker } from "@/hooks/useVisitorTracker";
import { useHomeContent } from "@/hooks/useHomeContent";
import { useStorePages } from "@/hooks/useStorePages";
import { formatCurrency } from "@/utils/formatters";
import { publicImageUrl } from "@/utils/storage";
import { getProductImageUrl } from "@/utils/productImage";
import { generateStandardProductDescription } from "@/utils/productDescription";
import { trackClickEvent } from "@/utils/clickTracking";
import { cn } from "@/lib/utils";

import { ProductBadges } from "@/components/store/pdp/ProductBadges";
import { ProductReviews } from "@/components/store/pdp/ProductReviews";
import { CustomerReviewForm } from "@/components/store/pdp/CustomerReviewForm";
import { QuantitySelector } from "@/components/store/pdp/QuantitySelector";
import { ShippingCalculator } from "@/components/store/pdp/ShippingCalculator";
import { PaymentLogosReal } from "@/components/store/pdp/PaymentLogosReal";
import { SmartUpsellCrossSell } from "@/components/store/pdp/SmartUpsellCrossSell";
import { getProductSlug } from "@/utils/productSlug";
import { SmartImage } from "@/components/store/SmartImage";

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
        out.push({ kind: "kv", key: boldKv[1].trim(), value: (boldKv[2] ?? "").trim() });
        continue;
      }

      // Match "Key: Value" patterns
      const kv = cleaned.match(/^([^:]{2,30}):\s*(.*)$/);
      if (kv) {
        out.push({ kind: "kv", key: kv[1].trim(), value: (kv[2] ?? "").trim() });
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
            <div key={idx} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-1 text-xs leading-relaxed min-w-0">
              <span className="font-semibold text-foreground shrink-0">{b.key}:</span>
              <span className="text-muted-foreground break-words [overflow-wrap:anywhere]">{b.value}</span>
            </div>
          );
        }
        return (
          <p key={idx} className="text-xs text-muted-foreground leading-relaxed break-words [overflow-wrap:anywhere]">
            {parseInlineBold(b.text)}
          </p>
        );
      })}
    </div>
  );
}

type MediaItem = { url: string; type: "image" | "video"; path: string };

function ThumbStrip({
  media,
  activeUrl,
  onSelect,
}: {
  media: MediaItem[];
  activeUrl: string | null;
  onSelect: (item: MediaItem) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [media]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -140 : 140, behavior: "smooth" });
  };

  return (
    <div
      className="relative min-w-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {canLeft && (
        <button
          type="button"
          onClick={() => scroll("left")}
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/70 backdrop-blur-sm border border-border/50 flex items-center justify-center shadow-sm transition-opacity duration-200",
            hovered ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          aria-label="Anterior"
        >
          <ChevronLeft className="h-4 w-4 text-foreground/60" />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          onClick={() => scroll("right")}
          className={cn(
            "absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/70 backdrop-blur-sm border border-border/50 flex items-center justify-center shadow-sm transition-opacity duration-200",
            hovered ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          aria-label="Próximo"
        >
          <ChevronRight className="h-4 w-4 text-foreground/60" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex w-full min-w-0 gap-1.5 overflow-x-auto sm:gap-2 scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        onTouchStart={() => setHovered(true)}
        onTouchEnd={() => setTimeout(() => setHovered(false), 1500)}
      >
        {media.slice(0, 8).map((item, idx) => {
          const active = item.url === activeUrl;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelect(item)}
              className={`relative shrink-0 h-14 w-14 sm:h-16 sm:w-16 rounded-lg sm:rounded-xl overflow-hidden border-2 transition-colors ${
                active ? "border-primary" : "border-border"
              }`}
              aria-label={item.type === "video" ? `Ver vídeo ${idx + 1}` : `Ver imagem ${idx + 1}`}
            >
              <img src={item.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              {item.type === "video" ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <span className="h-0 w-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-white" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
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

// Rating is now rendered inside ProductBadges component

export default function ProductPage() {
  const { slug } = useParams();
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

  const rawSlug = useMemo(() => String(slug ?? "").trim(), [slug]);
  const productId = useMemo(() => {
    if (!rawSlug) return "";
    const parts = rawSlug.split("--").map((part) => part.trim()).filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 1] ?? "" : rawSlug;
  }, [rawSlug]);
  const fallbackNameSlug = useMemo(() => {
    if (!rawSlug) return "";
    const parts = rawSlug.split("--").map((part) => part.trim()).filter(Boolean);
    return parts.length > 1 ? parts.slice(0, -1).join("--") : rawSlug;
  }, [rawSlug]);

  const product = useMemo(() => {
    if (!rawSlug) return null;

    return activeProducts.find((p) => String(p.id).trim() === productId)
      ?? activeProducts.find((p) => getProductSlug({ name: p.name }) === fallbackNameSlug)
      ?? null;
  }, [activeProducts, fallbackNameSlug, productId, rawSlug]);

  const images = useMemo(() => {
    const list = (product as any)?.images ?? [];
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    return list.filter((img: any) => {
      const p = img?.path;
      if (!p || seen.has(p)) return false;
      seen.add(p);
      return true;
    });
  }, [product]);

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);
  const [qty, setQty] = useState(1);
  const fallbackProductImage = "/placeholder.svg";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const items: MediaItem[] = [];
      for (const im of images) {
        const type: "image" | "video" = (im as any)?.media_type === "video" ? "video" : "image";
        const path = String((im as any)?.path ?? "");
        if (!path) continue;
        if (type === "video") {
          const { supabase } = await import("@/integrations/supabase/client");
          const { data } = await supabase.storage.from("product-media").createSignedUrl(path, 3600);
          if (data?.signedUrl) items.push({ url: data.signedUrl, type: "video", path });
        } else {
          items.push({ url: publicImageUrl("product-images", path), type: "image", path });
        }
      }
      if (cancelled) return;
      setMedia(items);
      setActiveMedia(items[0] ?? null);
    })();
    return () => { cancelled = true; };
  }, [images]);


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
    if (!product?.id) return;
    const key = "store_product_views_v1";
    const prev = Number(sessionStorage.getItem(key) || "0");
    const next = prev + 1;
    sessionStorage.setItem(key, String(next));
    window.dispatchEvent(new CustomEvent("store:product-visit", { detail: { productId: product.id, count: next } }));
  }, [product?.id]);

  return (
    <StoreLayout
      cartCount={cart.totalItems}
      onCartClick={() => setCartOpen(true)}
      cartOpen={cartOpen}
      onCartOpenChange={setCartOpen}
      footer={home.footer}
      pageLinks={pageLinks}
      footerStoreName={home.footer?.store_name ?? undefined}
    >
      <main className="mx-auto w-full max-w-6xl min-w-0 overflow-x-clip px-4 py-4 pb-32 md:pb-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">
        <Button asChild variant="outline" className="h-9 sm:h-10 rounded-xl w-fit text-xs sm:text-sm gap-1.5 border-border/60 text-muted-foreground hover:text-foreground">
          <Link to="/loja">
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>

        {loading ? (
          <div className="text-muted-foreground text-sm">Carregando...</div>
        ) : !product ? (
          <div className="text-muted-foreground text-sm">Produto não encontrado.</div>
        ) : (
          <div className="grid min-w-0 max-w-full gap-4 overflow-x-clip sm:gap-6 lg:grid-cols-12">
            {/* Gallery */}
            <div className="min-w-0 max-w-full overflow-hidden lg:col-span-7">
              <Card className="rounded-2xl sm:rounded-3xl overflow-hidden border-border bg-card shadow-sm">
                <div className="relative aspect-square sm:aspect-[4/3] bg-white flex items-center justify-center p-4">
                  {activeMedia?.type === "video" ? (
                    <video
                      key={activeMedia.url}
                      src={activeMedia.url}
                      className="max-h-full max-w-full object-contain"
                      controls
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <SmartImage
                      src={activeMedia?.url || fallbackProductImage}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain"
                      loading="eager"
                      fetchPriority="high"
                      fallback={fallbackProductImage}
                      wrapperClassName="flex items-center justify-center"
                    />
                  )}
                </div>
                {media.length > 1 ? (
                  <CardContent className="min-w-0 p-3 sm:p-4">
                    <ThumbStrip media={media} activeUrl={activeMedia?.url ?? null} onSelect={setActiveMedia} />
                  </CardContent>
                ) : null}
              </Card>
            </div>


            {/* Product info */}
            <div className="lg:col-span-5 space-y-3 sm:space-y-4 min-w-0 max-w-full overflow-hidden">
              <ProductBadges featured={Boolean((product as any).featured)} basePrice={basePrice} promoPrice={promoPrice} productId={(product as any).id} />

              <div className="min-w-0 max-w-full">
                <h1 className="text-xl sm:text-[28px] font-bold tracking-tight leading-tight break-words [overflow-wrap:anywhere]">{product.name}</h1>

                {product.category ? (
                  <div className="mt-1 text-xs font-medium text-muted-foreground break-words [overflow-wrap:anywhere]">
                    Categoria: {product.category}
                  </div>
                ) : null}

                <div className="mt-1.5 text-xs sm:text-sm text-muted-foreground break-words [overflow-wrap:anywhere]">
                  {Number((product as any).stock ?? 0) <= Number((product as any).min_stock ?? 0) ? (
                    <span>Últimas unidades disponíveis</span>
                  ) : (
                    <span>Disponível para envio imediato</span>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="space-y-1 min-w-0">
                {hasPromo ? (
                  <div className="text-xs sm:text-sm text-muted-foreground line-through break-words">De {formatCurrency(basePrice)}</div>
                ) : null}
                <div className="text-2xl sm:text-4xl font-semibold tracking-tight break-words">{formatCurrency(effectivePrice)}</div>
                {installments ? <div className="text-xs sm:text-sm text-muted-foreground break-words">{installments}</div> : null}
              </div>

              {/* PIX */}
              {pixPrice ? (
                <Card className="rounded-2xl border-border bg-card shadow-sm w-full min-w-0 overflow-hidden">
                  <CardContent className="p-3 sm:p-5 min-w-0">
                    <div className="text-xs sm:text-sm font-medium text-foreground">7% de desconto no PIX</div>
                    <div className="mt-0.5 text-xs sm:text-sm text-muted-foreground break-words">
                      No PIX: <span className="font-medium text-foreground">{formatCurrency(pixPrice)}</span>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Total */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/20 px-3 sm:px-4 py-2.5 sm:py-3 min-w-0">
                <span className="text-xs sm:text-sm text-muted-foreground">Total</span>
                <span className="text-base sm:text-lg font-semibold text-right break-words">{formatCurrency(totalDynamic)}</span>
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

              {/* Smart Upsell & Cross-Sell */}
              <SmartUpsellCrossSell product={product as any} onCartOpen={() => setCartOpen(true)} />

              {/* Info cards */}
              <Card className="rounded-2xl border-border bg-card shadow-sm min-w-0 max-w-full overflow-hidden">
                <CardContent className="p-3 sm:p-5 min-w-0">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 min-w-0">
                    <div className="rounded-xl border border-border bg-secondary/30 p-3 min-w-0">
                      <div className="text-[10px] sm:text-xs text-muted-foreground">Unidade</div>
                      <div className="text-sm font-medium break-words [overflow-wrap:anywhere]">{(product as any).unit ?? "un"}</div>
                    </div>

                    <div className="rounded-xl border border-border bg-secondary/30 p-3 min-w-0">
                      <div className="text-[10px] sm:text-xs text-muted-foreground">Prazo</div>
                      <div className="text-sm font-medium break-words [overflow-wrap:anywhere]">3 a 7 dias úteis</div>
                    </div>

                    <div className="rounded-xl border border-border bg-secondary/30 p-3 col-span-2 min-w-0">
                      <div className="text-[10px] sm:text-xs text-muted-foreground">Pagamento</div>
                      <div className="text-sm font-medium break-words [overflow-wrap:anywhere]">Cartão • Boleto • Pix</div>
                      <PaymentLogosReal />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-2 sm:gap-3 min-w-0">
                {[
                  { icon: Truck, label: "Entrega" },
                  { icon: CreditCard, label: "Parcelamento" },
                  { icon: ShieldCheck, label: "Segurança" },
                  { icon: BadgeCheck, label: "Garantia" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="rounded-xl border border-border bg-card p-3 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">{label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Description */}
              {descriptionParts.general ? (
                <Card className="rounded-2xl border-border bg-card shadow-sm w-full min-w-0 overflow-hidden">
                  <CardContent className="p-3 sm:p-5 min-w-0">
                    <ProductDescription markdown={descriptionParts.general} />
                  </CardContent>
                </Card>
              ) : null}

              {descriptionParts.tech ? (
                <Card className="rounded-2xl border-border bg-card shadow-sm w-full min-w-0 overflow-hidden">
                  <CardContent className="p-3 sm:p-5 min-w-0">
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

      {/* Sticky buy bar on mobile */}
      {product && !loading && (
        <div className="fixed inset-x-0 bottom-16 z-30 md:hidden border-t border-border bg-background/95 backdrop-blur-md px-3 py-2.5 safe-area-bottom">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold tracking-tight">{formatCurrency(effectivePrice)}</div>
              {installments && <div className="text-[10px] text-muted-foreground truncate">{installments}</div>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center rounded-lg border border-border bg-card">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-9 rounded-lg text-sm"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                >−</Button>
                <span className="min-w-6 text-center text-xs font-bold tabular-nums">{qty}</span>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-9 rounded-lg text-sm"
                  onClick={() => setQty(qty + 1)}
                >+</Button>
              </div>
              <Button
                className="h-10 rounded-xl px-5 text-sm font-semibold"
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
                Comprar
              </Button>
            </div>
          </div>
        </div>
      )}

    </StoreLayout>
  );
}
