import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Truck, CreditCard, ShieldCheck, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
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
import { QuantitySelector } from "@/components/store/pdp/QuantitySelector";
import { ShippingCalculator } from "@/components/store/pdp/ShippingCalculator";
import { PaymentLogosReal } from "@/components/store/pdp/PaymentLogosReal";


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

      const kv = line.match(/^([^:]+):\s*(.*)$/);
      if (kv) {
        out.push({ kind: "kv", key: kv[1].trim(), value: (kv[2] ?? "-").trim() || "-" });
        continue;
      }

      out.push({ kind: "p", text: line.trim() });
    }

    return out;
  }, [lines]);

  return (
    <div className="space-y-3">
      {blocks.map((b, idx) => {
        if (b.kind === "h2") {
          return (
            <h2 key={idx} className="text-base font-semibold tracking-tight">
              {b.text}
            </h2>
          );
        }
        if (b.kind === "kv") {
          return (
            <div key={idx} className="text-sm">
              <span className="text-muted-foreground">{b.key}: </span>
              <span className="font-medium text-foreground">{b.value || "-"}</span>
            </div>
          );
        }
        return (
          <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
            {b.text}
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

  // If headings are missing, keep everything as general
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
    // track product visits for "Precisa de ajuda?" badge
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
      <StoreTopbar cartCount={cart.totalItems} />
      <StoreMobileChrome cartCount={cart.totalItems} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10 space-y-6">
        <Button asChild variant="ghost" className="h-11 rounded-2xl w-fit">
          <Link to="/loja">← Voltar</Link>
        </Button>

        {loading ? (
          <div className="text-muted-foreground">Carregando...</div>
        ) : !product ? (
          <div className="text-muted-foreground">Produto não encontrado.</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* 1️⃣ Galeria */}
            <div className="lg:col-span-7">
              <Card className="rounded-3xl overflow-hidden border-border bg-card shadow-sm">
                <div className="aspect-[4/3] bg-muted/20">
                  {activeImg ? (
                    <img src={activeImg} alt={product.name} className="h-full w-full object-cover" loading="eager" />
                  ) : (
                    <div className="h-full w-full bg-muted" />
                  )}
                </div>
                {images.length > 1 ? (
                  <CardContent className="p-4">
                    <div className="flex gap-2 overflow-x-auto">
                      {images.slice(0, 8).map((im: any, idx: number) => {
                        const url = publicImageUrl("product-images", im.path);
                        const active = url && url === activeImg;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveImg(url)}
                            className={`shrink-0 h-16 w-16 rounded-xl overflow-hidden border ${
                              active ? "border-ring" : "border-border"
                            }`}
                            aria-label={`Ver imagem ${idx + 1} de ${product.name}`}
                          >
                            <img
                              src={url}
                              alt={`${product.name} - imagem ${idx + 1}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                ) : null}
              </Card>
            </div>

            {/* Conteúdo */}
            <div className="lg:col-span-5 space-y-4">
              {/* 2️⃣ Badge promo/destaque */}
              <ProductBadges featured={Boolean((product as any).featured)} basePrice={basePrice} promoPrice={promoPrice} />

              {/* 3️⃣ Nome */}
              <div>
                <h1 className="text-[28px] font-bold tracking-tight leading-tight">{product.name}</h1>

                {/* 4️⃣ Disponibilidade */}
                <div className="mt-2 text-sm">
                  {Number((product as any).stock ?? 0) <= Number((product as any).min_stock ?? 0) ? (
                    <span className="text-muted-foreground">
                      <span className="font-semibold">Últimas unidades disponíveis</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      <span className="font-semibold">Disponível</span> para envio imediato
                    </span>
                  )}
                </div>
              </div>

              {/* 6️⃣ Preço premium */}
              <div className="space-y-2">
                {hasPromo ? (
                  <div className="text-sm text-muted-foreground line-through">De {formatCurrency(basePrice)}</div>
                ) : null}
                <div className="text-4xl font-extrabold tracking-tight">{formatCurrency(effectivePrice)}</div>
                {installments ? <div className="text-sm text-muted-foreground">{installments}</div> : null}
              </div>

              {/* 7️⃣ Desconto PIX (global 7%) */}
              {pixPrice ? (
                <Card className="rounded-3xl border-border bg-card shadow-sm">
                  <CardContent className="p-5">
                    <div className="text-sm font-semibold text-foreground">7% de desconto no PIX</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      No PIX: <span className="font-semibold text-foreground">{formatCurrency(pixPrice)}</span>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* 9️⃣ Total dinâmico */}
              <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 px-4 py-3">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-bold">{formatCurrency(totalDynamic)}</span>
              </div>

              {/* 🔟 Seletor quantidade */}
              <QuantitySelector value={qty} onChange={setQty} />

              {/* 1️⃣1️⃣ Botão principal */}
              <Button
                className="h-14 rounded-2xl w-full shadow-sm transition-transform active:scale-[0.99]"
                onClick={() => {
                  trackClickEvent({ sessionToken: tracker.sessionToken, type: "add_to_cart", productId: (product as any).id });
                  tracker.track({ type: "add_cart", productId: (product as any).id, categoryId: (product as any).category_id ?? null });
                  cart.add((product as any).id, Math.max(1, qty));
                }}
              >
                Adicionar ao carrinho
              </Button>

              {/* 1️⃣2️⃣ Bloco cálculo frete (regra atual por valor) */}
              <ShippingCalculator subtotal={totalDynamic} />

              {/* 1️⃣3️⃣ Cards informativos (Unidade / Prazo / Pagamento) */}
              <Card className="rounded-3xl border-border bg-card shadow-sm">
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <div className="text-xs text-muted-foreground">Unidade</div>
                      <div className="font-semibold">{(product as any).unit ?? "un"}</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <div className="text-xs text-muted-foreground">Prazo</div>
                      <div className="font-semibold">3 a 7 dias úteis</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-secondary/30 p-4 sm:col-span-2">
                      <div className="text-xs text-muted-foreground">Pagamento</div>
                      <div className="font-semibold">Cartão • Boleto • Pix</div>
                      <PaymentLogosReal />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 6️⃣ Blocos 2x2 (Entrega / Parcelamento / Segurança / Garantia) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-primary" />
                    <div className="font-semibold">Entrega</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <div className="font-semibold">Parcelamento</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <div className="font-semibold">Segurança</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <BadgeCheck className="h-5 w-5 text-primary" />
                    <div className="font-semibold">Garantia</div>
                  </div>
                </div>
              </div>
              {/* 8️⃣ Descrição Geral */}
              {descriptionParts.general ? (
                <Card className="rounded-3xl border-border bg-card shadow-sm">
                  <CardContent className="p-5">
                    <ProductDescription markdown={descriptionParts.general} />
                  </CardContent>
                </Card>
              ) : null}

              {/* 9️⃣ Ficha Técnica */}
              {descriptionParts.tech ? (
                <Card className="rounded-3xl border-border bg-card shadow-sm">
                  <CardContent className="p-5">
                    <ProductDescription markdown={descriptionParts.tech} />
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        )}
      </main>

      {/* 🔟 Footer (mesmo da Home) */}
      <StoreFooter footer={home.footer} pageLinks={pageLinks} />
    </div>
  );
}

