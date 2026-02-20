import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CreditCard, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StoreTopbar } from "@/components/store/StoreTopbar";
import { StoreMobileChrome } from "@/components/store/mobile/StoreMobileChrome";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { formatCurrency } from "@/utils/formatters";
import { publicImageUrl } from "@/utils/storage";

function InfoTile({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <Card className="rounded-2xl border-border bg-card shadow-sm">
      <CardContent className="p-5">
        <div className="h-11 w-11 rounded-xl border border-border bg-secondary/40 flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div className="mt-3 font-semibold">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
      </CardContent>
    </Card>
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
                            <img src={url} alt={`${product.name} - imagem ${idx + 1}`} className="h-full w-full object-cover" loading="lazy" />
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
                {(product as any).description ? (
                  <p className="mt-2 text-sm text-muted-foreground">{(product as any).description}</p>
                ) : null}
              </div>

              <Card className="rounded-3xl border-border bg-card shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div>
                    {hasPromo ? <div className="text-sm text-muted-foreground line-through">{formatCurrency(basePrice)}</div> : null}
                    <div className="text-3xl font-extrabold tracking-tight">{formatCurrency(effectivePrice)}</div>
                    {installments ? <div className="text-sm text-muted-foreground">{installments}</div> : null}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button className="h-12 rounded-2xl" onClick={() => cart.add((product as any).id, 1)}>
                      Adicionar ao carrinho
                    </Button>
                    <Button asChild variant="outline" className="h-12 rounded-2xl">
                      <Link to="/carrinho">Ver carrinho</Link>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <div className="text-xs text-muted-foreground">Unidade</div>
                      <div className="font-semibold">{(product as any).unit ?? "un"}</div>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <div className="text-xs text-muted-foreground">Entrega</div>
                      <div className="font-semibold">A combinar</div>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <div className="text-xs text-muted-foreground">Pagamento</div>
                      <div className="font-semibold">Pix / Cartão</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoTile icon={Truck} title="Entrega" desc="Retire na loja ou receba com agilidade." />
                <InfoTile icon={CreditCard} title="Parcelamento" desc="Condições claras para você decidir." />
                <InfoTile icon={ShieldCheck} title="Segurança" desc="Compra segura e dados protegidos." />
                <InfoTile icon={PackageCheck} title="Garantia" desc="Suporte pós-venda para sua obra." />
              </div>

              {/* Prova social / selo */}
              <Card className="rounded-3xl border-border bg-card shadow-sm">
                <CardContent className="p-5">
                  <div className="font-semibold">Confiança</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Avaliações e selos podem ser exibidos aqui (em breve).
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

