import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/utils/formatters";
import { publicImageUrl } from "@/utils/storage";
import { getProductImageUrl } from "@/utils/productImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

type Recommendation = {
  id: string;
  product_id: string;
  recommended_product_id: string;
  type: "upsell" | "cross_sell" | "related";
  score: number;
};

type EnrichedProduct = {
  id: string;
  name: string;
  price: number;
  promo_price?: number;
  unit?: string | null;
  category?: string | null;
  category_id?: string | null;
  images: { path: string; sort_order: number }[];
  active: boolean;
  views?: number;
  clicks?: number;
  sales?: number;
};

// Construction material cross-sell mapping
const CROSS_SELL_MAP: Record<string, string[]> = {
  cimento: ["areia", "brita", "argamassa", "bloco", "vergalhão"],
  areia: ["cimento", "brita", "argamassa"],
  brita: ["cimento", "areia", "argamassa"],
  argamassa: ["cimento", "rejunte", "piso", "porcelanato"],
  piso: ["argamassa", "rejunte", "nivelador", "espaçador"],
  porcelanato: ["argamassa", "rejunte", "nivelador", "espaçador"],
  rejunte: ["argamassa", "piso", "porcelanato", "espaçador"],
  tubo: ["joelho", "registro", "cola", "anel", "luva"],
  "tubo pvc": ["joelho pvc", "registro", "cola pvc", "anel", "luva"],
  joelho: ["tubo", "cola", "registro", "luva"],
  registro: ["tubo", "joelho", "cola"],
  tinta: ["rolo", "pincel", "lixa", "massa corrida", "selador"],
  rolo: ["tinta", "bandeja", "fita crepe"],
  pincel: ["tinta", "solvente", "lixa"],
  "caixa d'água": ["boia", "tubo", "registro", "abraçadeira"],
  "caixa dagua": ["boia", "tubo", "registro", "abraçadeira"],
  telha: ["cumeeira", "parafuso", "manta", "calha"],
  fio: ["disjuntor", "tomada", "interruptor", "caixa de luz"],
  disjuntor: ["fio", "quadro", "eletroduto"],
  bloco: ["cimento", "areia", "argamassa", "vergalhão"],
  vergalhão: ["arame", "cimento", "areia", "bloco"],
};

function findCrossSellTerms(productName: string): string[] {
  const lower = productName.toLowerCase();
  for (const [key, suggestions] of Object.entries(CROSS_SELL_MAP)) {
    if (lower.includes(key)) return suggestions;
  }
  return [];
}

function isUpsellCandidate(current: EnrichedProduct, candidate: EnrichedProduct): boolean {
  if (candidate.id === current.id) return false;
  if (!candidate.active) return false;
  
  const currentName = current.name.toLowerCase();
  const candidateName = candidate.name.toLowerCase();
  
  // Same base product but bigger/better
  const currentWords = currentName.split(/\s+/).slice(0, 2).join(" ");
  const candidateWords = candidateName.split(/\s+/).slice(0, 2).join(" ");
  
  if (currentWords !== candidateWords) return false;
  
  const effectiveCurrent = (current.promo_price && current.promo_price > 0) ? current.promo_price : current.price;
  const effectiveCandidate = (candidate.promo_price && candidate.promo_price > 0) ? candidate.promo_price : candidate.price;
  
  return effectiveCandidate > effectiveCurrent;
}

function getEffectivePrice(product: EnrichedProduct): number {
  return (product.promo_price && product.promo_price > 0 && product.price > product.promo_price)
    ? product.promo_price
    : product.price;
}

function getNameSimilarityScore(currentName: string, candidateName: string): number {
  const currentTokens = new Set(
    currentName
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );

  return candidateName
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .reduce((score, token) => score + (currentTokens.has(token) ? 1 : 0), 0);
}

function SuggestionCard({
  product,
  currentProduct,
  type,
  onAdd,
}: {
  product: EnrichedProduct;
  currentProduct: EnrichedProduct;
  type: "upsell" | "cross_sell" | "related";
  onAdd: () => void;
}) {
  const imageSrc = getProductImageUrl(product.images);

  const effectivePrice = getEffectivePrice(product);

  const currentEffective = getEffectivePrice(currentProduct);

  const priceDiff = effectivePrice - currentEffective;

  return (
    <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden flex flex-col">
      <div className="aspect-square bg-muted/20 relative">
        <img
          src={imageSrc}
          alt={product.name}
          className="h-full w-full object-contain p-2"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
        {type === "upsell" && (
          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3" /> Upgrade
          </div>
        )}
      </div>
      <CardContent className="p-3 flex flex-col flex-1 gap-2">
        <h4 className="text-xs font-medium leading-snug line-clamp-2 min-h-[2.5em]">{product.name}</h4>
        <div className="text-sm font-semibold text-foreground">{formatCurrency(effectivePrice)}</div>
        {type === "upsell" && priceDiff > 0 && (
          <p className="text-[10px] text-primary font-medium">
            Por apenas {formatCurrency(priceDiff)} a mais
          </p>
        )}
        <Button
          size="sm"
          className="mt-auto h-8 rounded-xl text-xs w-full"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAdd();
          }}
        >
          <ShoppingCart className="h-3 w-3 mr-1" /> Adicionar
        </Button>
      </CardContent>
    </Card>
  );
}

export function SmartUpsellCrossSell({
  product,
  onCartOpen,
}: {
  product: EnrichedProduct;
  onCartOpen: () => void;
}) {
  const { activeProducts } = useStoreProducts();
  const cart = useCart();
  const [dbRecs, setDbRecs] = useState<Recommendation[]>([]);

  // Load configured recommendations from DB
  useEffect(() => {
    if (!product?.id) return;
    cloud
      .from("product_recommendations")
      .select("*")
      .eq("product_id", product.id)
      .order("score", { ascending: false })
      .then(({ data }) => {
        if (data) setDbRecs(data as any[]);
      });
  }, [product?.id]);

  const recommendations = useMemo(() => {
    if (!product || !activeProducts.length) return { upsell: null, crossSell: [], related: [] };

    const others = activeProducts.filter((p) => p.id !== product.id && p.active);
    const productMap = new Map(others.map((p) => [p.id, p]));

    // 1. DB-configured upsell
    const dbUpsells = dbRecs.filter((r) => r.type === "upsell");
    let upsell: EnrichedProduct | null = null;
    for (const r of dbUpsells) {
      const p = productMap.get(r.recommended_product_id);
      if (p) { upsell = p as any; break; }
    }

    // Auto upsell if none configured
    if (!upsell) {
      const candidates = others.filter((c) => isUpsellCandidate(product as any, c as any));
      if (candidates.length > 0) {
        candidates.sort((a, b) => {
          const pa = (a.promo_price && a.promo_price > 0) ? a.promo_price : a.price;
          const pb = (b.promo_price && b.promo_price > 0) ? b.promo_price : b.price;
          return pa - pb; // cheapest upgrade first
        });
        upsell = candidates[0] as any;
      }
    }

    // 2. DB-configured cross-sell
    const dbCross = dbRecs.filter((r) => r.type === "cross_sell");
    let crossSell: EnrichedProduct[] = [];
    for (const r of dbCross) {
      const p = productMap.get(r.recommended_product_id);
      if (p && p.id !== upsell?.id) crossSell.push(p as any);
    }

    // Auto cross-sell if < 4
    if (crossSell.length < 4) {
      const terms = findCrossSellTerms(product.name);
      const usedIds = new Set([product.id, upsell?.id, ...crossSell.map((c) => c.id)]);
      
      for (const term of terms) {
        if (crossSell.length >= 4) break;
        const matches = others.filter(
          (p) => !usedIds.has(p.id) && p.name.toLowerCase().includes(term)
        );
        // Sort by sales/views
        matches.sort((a, b) => ((b as any).sales ?? 0) - ((a as any).sales ?? 0));
        for (const m of matches) {
          if (crossSell.length >= 4) break;
          crossSell.push(m as any);
          usedIds.add(m.id);
        }
      }
    }

    // 3. Related by category (fallback)
    const usedIds = new Set([product.id, upsell?.id, ...crossSell.map((c) => c.id)]);
    let related: EnrichedProduct[] = [];

    // DB related
    const dbRelated = dbRecs.filter((r) => r.type === "related");
    for (const r of dbRelated) {
      const p = productMap.get(r.recommended_product_id);
      if (p && !usedIds.has(p.id)) {
        related.push(p as any);
        usedIds.add(p.id);
      }
    }

    // Auto related by same category or similar name, prioritizing popularity and price proximity
    if (related.length < 4) {
      const rankedRelated = others
        .filter((p) => !usedIds.has(p.id))
        .map((p) => {
          const sameCategory = product.category_id && (p as any).category_id === product.category_id ? 1 : 0;
          const similarity = getNameSimilarityScore(product.name, p.name);
          const popularity = Number((p as any).sales ?? 0) * 10 + Number((p as any).views ?? 0);
          const priceDistance = Math.abs(getEffectivePrice(p as any) - getEffectivePrice(product as any));

          return { product: p, sameCategory, similarity, popularity, priceDistance };
        })
        .filter((entry) => entry.sameCategory > 0 || entry.similarity > 0)
        .sort((a, b) => {
          if (b.sameCategory !== a.sameCategory) return b.sameCategory - a.sameCategory;
          if (b.similarity !== a.similarity) return b.similarity - a.similarity;
          if (b.popularity !== a.popularity) return b.popularity - a.popularity;
          return a.priceDistance - b.priceDistance;
        });

      for (const { product: relatedProduct } of rankedRelated) {
        if (related.length >= 4) break;
        related.push(relatedProduct as any);
        usedIds.add(relatedProduct.id);
      }
    }

    // Fallback: best sellers
    if (related.length < 4) {
      const bestSellers = others
        .filter((p) => !usedIds.has(p.id))
        .sort((a, b) => ((b as any).sales ?? 0) - ((a as any).sales ?? 0));
      
      for (const p of bestSellers) {
        if (related.length >= 4) break;
        related.push(p as any);
        usedIds.add(p.id);
      }
    }

    return { upsell, crossSell: crossSell.slice(0, 4), related: related.slice(0, 4) };
  }, [product, activeProducts, dbRecs]);

  const handleAdd = (p: EnrichedProduct) => {
    const price = (p.promo_price && p.promo_price > 0 && p.price > p.promo_price) ? p.promo_price : p.price;
    cart.add(p.id, 1, {
      name: p.name,
      unitPrice: price,
      unit: p.unit ?? "un",
      imagePath: p.images?.[0]?.path ?? null,
    });
    toast.success(`${p.name} adicionado ao carrinho`);
    onCartOpen();
  };

  const hasSuggestions = recommendations.upsell || recommendations.crossSell.length > 0 || recommendations.related.length > 0;
  if (!hasSuggestions) return null;

  const showCrossSell = recommendations.crossSell.length > 0;
  const showRelated = !showCrossSell && recommendations.related.length > 0;

  const MESSAGES = {
    upsell: "Leve a versão superior",
    cross_sell: "Complete sua obra com esses itens",
    related: "Clientes que compraram este item também levaram",
  };

  return (
    <div className="space-y-4">
      {/* Upsell */}
      {recommendations.upsell && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <ArrowUpRight className="h-4 w-4 text-primary" />
            {MESSAGES.upsell}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <SuggestionCard
              product={recommendations.upsell}
              currentProduct={product}
              type="upsell"
              onAdd={() => handleAdd(recommendations.upsell!)}
            />
          </div>
        </div>
      )}

      {/* Cross-sell */}
      {showCrossSell && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            {MESSAGES.cross_sell}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">

            {recommendations.crossSell.map((p) => (
              <SuggestionCard
                key={p.id}
                product={p}
                currentProduct={product}
                type="cross_sell"
                onAdd={() => handleAdd(p)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Related */}
      {showRelated && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            {MESSAGES.related}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {recommendations.related.map((p) => (
              <SuggestionCard
                key={p.id}
                product={p}
                currentProduct={product}
                type="related"
                onAdd={() => handleAdd(p)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
