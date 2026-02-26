import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { formatCurrency } from "@/utils/formatters";
import { publicImageUrl } from "@/utils/storage";
import { generateStandardProductDescription } from "@/utils/productDescription";

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

export default function ProductPage() {
  const { id } = useParams();
  const cart = useCart();
  const { activeProducts, loading } = useStoreProducts();

  const product = useMemo(() => activeProducts.find((p) => p.id === id), [activeProducts, id]);

  const images = useMemo(() => {
    const list = (product as any)?.images ?? [];
    return Array.isArray(list) ? list : [];
  }, [product]);

  const [activeImg, setActiveImg] = useState<string | null>(null);

  const basePrice = useMemo(() => Number((product as any)?.price ?? 0), [product]);
  const promoPrice = useMemo(() => Number((product as any)?.promo_price ?? 0), [product]);
  const hasPromo = promoPrice > 0 && basePrice > 0 && promoPrice < basePrice;
  const effectivePrice = hasPromo ? promoPrice : basePrice;

  const installments = useMemo(() => {
    if (!effectivePrice || effectivePrice <= 0) return null;
    return `em até 10x de ${formatCurrency(effectivePrice / 10)}`;
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
            {/* Galeria */}
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
              <div>
                <h1 className="text-[28px] font-bold tracking-tight leading-tight">{product.name}</h1>
                <div className="mt-3">
                  {hasPromo ? (
                    <div className="text-sm text-muted-foreground line-through">{formatCurrency(basePrice)}</div>
                  ) : null}
                  <div className="text-3xl font-extrabold tracking-tight">{formatCurrency(effectivePrice)}</div>
                  {installments ? <div className="text-sm text-muted-foreground">{installments}</div> : null}
                  <div className="mt-2 text-sm text-muted-foreground">Unidade: {(product as any).unit ?? "un"}</div>
                </div>
              </div>

              <Card className="rounded-3xl border-border bg-card shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <Button className="h-14 rounded-2xl w-full" onClick={() => cart.add((product as any).id, 1)}>
                    Adicionar ao carrinho
                  </Button>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <div className="text-xs text-muted-foreground">Unidade</div>
                      <div className="font-semibold">{(product as any).unit ?? "un"}</div>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <div className="text-xs text-muted-foreground">Entrega</div>
                      <div className="font-semibold">Prazo de entrega: 3 a 7 dias úteis</div>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <div className="text-xs text-muted-foreground">Pagamento</div>
                      <div className="font-semibold">Pix / Cartão</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-border bg-card p-4 font-semibold">🚚 Entrega</div>
                    <div className="rounded-2xl border border-border bg-card p-4 font-semibold">💳 Parcelamento</div>
                    <div className="rounded-2xl border border-border bg-card p-4 font-semibold">🔒 Segurança</div>
                    <div className="rounded-2xl border border-border bg-card p-4 font-semibold">🛡 Garantia</div>
                  </div>
                </CardContent>
              </Card>

              {descriptionMd ? (
                <Card className="rounded-3xl border-border bg-card shadow-sm">
                  <CardContent className="p-5">
                    <ProductDescription markdown={descriptionMd} />
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

