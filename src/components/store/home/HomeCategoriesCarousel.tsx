import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import {
  Bolt,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Hammer,
  Home,
  Mountain,
  Package,
  Paintbrush,
  PlugZap,
  ShowerHead,
  Utensils,
  Waves,
  Wrench,
} from "lucide-react";
import type { StoreCategory } from "@/hooks/useStoreCategories";
import { cn } from "@/lib/utils";

type IconLike = React.ComponentType<{
  size?: string | number;
  className?: string;
  strokeWidth?: string | number;
  color?: string;
}>;

function pickIcon(name: string) {
  const key = (name ?? "").trim().toLowerCase();

  if (/(cimento|tijolo|bloco|alvenaria|argamassa)/.test(key)) return Boxes;
  if (/(areia)/.test(key)) return Waves;
  if (/(brita|pedra|cascalho)/.test(key)) return Mountain;
  if (/(hidráulica|hidraulica|encanamento|tubos|conex)/.test(key)) return Droplets;
  if (/(elétrica|eletrica|tomada|fio|cabos)/.test(key)) return PlugZap;
  if (/(pintura|tinta|verniz)/.test(key)) return Paintbrush;
  if (/(ferramenta|marte|martelo)/.test(key)) return Hammer;
  if (/(ferragens|parafuso|porca|bucha)/.test(key)) return Bolt;
  if (/(banheiro|chuveiro|sanit)/.test(key)) return ShowerHead;
  if (/(cozinha|utens|pia)/.test(key)) return Utensils;
  if (/(telhado|cobertura)/.test(key)) return Home;
  if (/(chave|aperto|manuten)/.test(key)) return Wrench;

  return Package;
}

type Props = {
  categories: StoreCategory[];
  hideHeader?: boolean;
  loop?: boolean;
};

export const HomeCategoriesCarousel = React.forwardRef<HTMLDivElement, Props>(
  ({ categories, hideHeader = false, loop = false }, ref) => {
    const items = useMemo(() => categories ?? [], [categories]);

    const [emblaRef, emblaApi] = useEmblaCarousel({
      align: "center",
      containScroll: "trimSnaps",
      dragFree: false,
      loop,
      skipSnaps: false,
    });

    const [selectedIndex, setSelectedIndex] = useState(0);
    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);
    const [hasOverflow, setHasOverflow] = useState(false);

    const onSelect = useCallback(() => {
      if (!emblaApi) return;
      setSelectedIndex(emblaApi.selectedScrollSnap());
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
      setHasOverflow(emblaApi.scrollSnapList().length > 1);
    }, [emblaApi]);

    useEffect(() => {
      if (!emblaApi) return;
      onSelect();
      emblaApi.on("select", onSelect);
      emblaApi.on("reInit", onSelect);

      return () => {
        emblaApi.off("select", onSelect);
        emblaApi.off("reInit", onSelect);
      };
    }, [emblaApi, onSelect]);

    if (items.length === 0) return null;

    return (
      <div ref={ref}>
        <section className="space-y-4" aria-label="Categorias">
          {!hideHeader ? (
            <header className="flex items-end justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold">Categorias</h2>
              </div>
              <Link to="/loja" className="text-sm font-medium underline underline-offset-4">
                Ver catálogo
              </Link>
            </header>
          ) : null}

          <div className="relative">
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 z-20 w-10 sm:w-14",
                "bg-gradient-to-r from-background to-transparent",
              )}
            />
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 right-0 z-20 w-10 sm:w-14",
                "bg-gradient-to-l from-background to-transparent",
              )}
            />

            {hasOverflow ? (
              <>
                <button
                  type="button"
                  onClick={() => emblaApi?.scrollPrev()}
                  disabled={!canScrollPrev}
                  aria-label="Categoria anterior"
                  className={cn(
                    "absolute left-1 top-1/2 z-30 -translate-y-1/2",
                    "h-9 w-9 rounded-full grid place-items-center",
                    "transition-all duration-300 ease-out",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                  )}
                  style={{
                    backgroundColor: "#EDEFF3",
                    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.12)",
                  }}
                >
                  <ChevronLeft color="#1E3A8A" className="h-5 w-5" strokeWidth={2.8} />
                </button>

                <button
                  type="button"
                  onClick={() => emblaApi?.scrollNext()}
                  disabled={!canScrollNext}
                  aria-label="Próxima categoria"
                  className={cn(
                    "absolute right-1 top-1/2 z-30 -translate-y-1/2",
                    "h-9 w-9 rounded-full grid place-items-center",
                    "transition-all duration-300 ease-out",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                  )}
                  style={{
                    backgroundColor: "#EDEFF3",
                    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.12)",
                  }}
                >
                  <ChevronRight color="#1E3A8A" className="h-5 w-5" strokeWidth={2.8} />
                </button>
              </>
            ) : null}

            <div ref={emblaRef} className="overflow-hidden px-6 sm:px-10">
              <div className="flex touch-pan-y select-none">
                {items.map((c, idx) => {
                  const Icon = pickIcon(c.name);
                  const isActive = idx === selectedIndex;

                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "min-w-0 shrink-0 grow-0",
                        "basis-[110px] sm:basis-[126px] md:basis-[132px]",
                        "px-1.5 sm:px-2",
                      )}
                    >
                      <Link
                        to={`/loja?categoria=${encodeURIComponent(c.slug)}`}
                        className={cn(
                          "group flex flex-col items-center text-center",
                          "transition-transform duration-300 ease-out",
                          isActive ? "scale-[1.05]" : "scale-100",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl",
                        )}
                        aria-label={`Categoria: ${c.name}`}
                      >
                        <div
                          className={cn(
                            "h-[84px] w-[84px] sm:h-[96px] sm:w-[96px]",
                            "rounded-full grid place-items-center",
                            "border border-border/60",
                            "transition-all duration-300 ease-out",
                            isActive ? "shadow-md" : "shadow-sm",
                          )}
                          style={{ backgroundColor: "#F4F6F9" }}
                          aria-hidden="true"
                        >
                          <Icon
                            className="h-[68px] w-[68px] sm:h-[76px] sm:w-[76px]"
                            color="#1E3A8A"
                            strokeWidth={3.75}
                          />
                        </div>

                        <div className="mt-2.5 text-[13px] sm:text-sm font-semibold leading-tight tracking-tight text-foreground line-clamp-2">
                          {c.name}
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  },
);
HomeCategoriesCarousel.displayName = "HomeCategoriesCarousel";

