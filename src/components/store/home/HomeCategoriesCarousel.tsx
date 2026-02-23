import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import type { StoreCategory } from "@/hooks/useStoreCategories";
import { publicImageUrl } from "@/utils/storage";
import { cn } from "@/lib/utils";

const emojiMap: Record<string, string> = {
  cimento: "🧱",
  areia: "🏖️",
  brita: "🪨",
  tijolo: "🧱",
  "hidráulica": "🚰",
  hidraulica: "🚰",
  "elétrica": "💡",
  eletrica: "💡",
  pintura: "🎨",
  ferramentas: "🛠️",
  banheiro: "🚿",
  cozinha: "🍽️",
  telhado: "🏠",
  ferragens: "🔩",
};

function pickEmoji(name: string) {
  const key = (name ?? "").trim().toLowerCase();
  return emojiMap[key] ?? emojiMap[key.replace(/\s+/g, " ")] ?? "📦";
}

export function HomeCategoriesCarousel({
  categories,
  hideHeader = false,
}: {
  categories: StoreCategory[];
  hideHeader?: boolean;
}) {
  const items = useMemo(() => (categories ?? []).slice(0, 40), [categories]);

  const [api, setApi] = useState<any>(null);

  // Gentle auto-slide (mobile-first). Stops if user interacts.
  useEffect(() => {
    if (!api) return;
    let stopped = false;

    const stop = () => {
      stopped = true;
    };

    api.on?.("pointerDown", stop);
    api.on?.("mouseDown", stop);

    const t = window.setInterval(() => {
      if (stopped) return;
      if (!api) return;
      if (api.canScrollNext?.()) api.scrollNext?.();
      else api.scrollTo?.(0);
    }, 2800);

    return () => {
      window.clearInterval(t);
      api.off?.("pointerDown", stop);
      api.off?.("mouseDown", stop);
    };
  }, [api]);

  if (items.length === 0) return null;

  return (
    <section className="space-y-4" aria-label="Categorias">
      {!hideHeader ? (
        <header className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold">Categorias</h2>
            <p className="text-sm text-muted-foreground">Encontre rápido pelo departamento.</p>
          </div>
          <Link to="/loja" className="text-sm font-medium underline underline-offset-4">
            Ver catálogo
          </Link>
        </header>
      ) : null}

      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
          dragFree: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-3">
          {items.map((c) => {
            const emoji = pickEmoji(c.name);
            const img = publicImageUrl("category-images", c.image_path ?? null);
            return (
              <CarouselItem key={c.id} className="pl-3 basis-[9.25rem] sm:basis-[10rem]">
                <Link
                  to={`/loja?categoria=${encodeURIComponent(c.slug)}`}
                  className={cn(
                    "group block rounded-2xl border border-border bg-card p-3",
                    "hover:bg-muted/30 transition",
                  )}
                  aria-label={`Categoria: ${c.name}`}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-full border border-border bg-background shadow-sm overflow-hidden grid place-items-center">
                        {img ? (
                          <img src={img} alt={`Categoria ${c.name}`} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <span className="text-2xl leading-none">{emoji}</span>
                        )}
                      </div>
                      {img ? <div className="absolute inset-0 rounded-full bg-background/0 group-hover:bg-background/10 transition" /> : null}
                    </div>

                    <div className="text-sm font-medium leading-tight line-clamp-2 group-hover:underline underline-offset-4">
                      {c.name}
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
