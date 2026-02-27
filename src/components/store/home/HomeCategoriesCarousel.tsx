import React, { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Bolt,
  Boxes,
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { StoreCategory } from "@/hooks/useStoreCategories";
import { publicImageUrl } from "@/utils/storage";
import { cn } from "@/lib/utils";

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
  ({ categories, hideHeader = false, loop = true }, ref) => {
    const baseItems = useMemo(() => categories ?? [], [categories]);
    const loopItems = useMemo(() => (loop ? [...baseItems, ...baseItems] : baseItems), [baseItems, loop]);

    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
      if (!loop) return;
      const el = scrollerRef.current;
      if (!el) return;
      if (baseItems.length === 0) return;

      el.scrollLeft = 0;
      let last = 0;

      const animate = (ts: number) => {
        if (!last) last = ts;
        const delta = ts - last;
        last = ts;

        // mais rápido (antes: 30px/s)
        if (el.scrollWidth > el.clientWidth) {
          el.scrollLeft += delta * 0.06;

          if (el.scrollLeft >= el.scrollWidth / 2) {
            el.scrollLeft -= el.scrollWidth / 2;
          }
        }

        rafRef.current = window.requestAnimationFrame(animate);
      };

      rafRef.current = window.requestAnimationFrame(animate);

      return () => {
        if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      };
    }, [baseItems.length, loop]);

    const scrollByOne = (dir: -1 | 1) => {
      const el = scrollerRef.current;
      if (!el) return;
      const step = Math.max(240, Math.round(el.clientWidth * 0.35));
      el.scrollBy({ left: dir * step, behavior: "smooth" });
    };

    if (baseItems.length === 0) return null;

    return (
      <div ref={ref}>
        <section className="space-y-3" aria-label="Categorias">
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
            <button
              type="button"
              onClick={() => scrollByOne(-1)}
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 z-20",
                "h-10 w-10 rounded-full",
                "bg-background/80 backdrop-blur border border-border",
                "shadow-sm",
                "grid place-items-center",
                "transition-all duration-200",
                "hover:bg-background hover:shadow-md",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
              aria-label="Categorias anteriores"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>

            <button
              type="button"
              onClick={() => scrollByOne(1)}
              className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2 z-20",
                "h-10 w-10 rounded-full",
                "bg-background/80 backdrop-blur border border-border",
                "shadow-sm",
                "grid place-items-center",
                "transition-all duration-200",
                "hover:bg-background hover:shadow-md",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
              aria-label="Próximas categorias"
            >
              <ChevronRight className="h-5 w-5 text-foreground" />
            </button>

            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 w-14 sm:w-16 z-10",
                "bg-gradient-to-r from-background to-transparent",
              )}
            />
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 right-0 w-14 sm:w-16 z-10",
                "bg-gradient-to-l from-background to-transparent",
              )}
            />

            <div
              ref={scrollerRef}
              role="region"
              aria-roledescription="carousel"
              tabIndex={0}
              className={cn(
                "relative w-full",
                "inline-flex gap-1.5 sm:gap-2",
                "whitespace-nowrap",
                "overflow-x-auto overflow-y-hidden",
                "overscroll-x-contain",
                "py-0.5",
                "scrollbar-thin",
                "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                "touch-pan-x",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
              style={{ scrollSnapType: "x mandatory" }}
            >
              {loopItems.map((c, idx) => {
                const Icon = pickIcon(c.name);
                const img = publicImageUrl("category-images", c.image_path ?? null);
                const key = `${c.id}-${idx}`;

                return (
                  <div
                    key={key}
                    className={cn(
                      "shrink-0",
                      "basis-1/2",
                      "md:basis-1/4",
                      "lg:basis-1/4",
                      "snap-start",
                      "px-0.5 sm:px-1",
                    )}
                  >
                    <Link
                      to={`/loja?categoria=${encodeURIComponent(c.slug)}`}
                      className={cn(
                        "group flex h-full flex-col items-center text-center",
                        "rounded-2xl",
                        "py-2 sm:py-2.5",
                        "transition-transform duration-200 ease-out",
                        "hover:-translate-y-0.5",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      )}
                      aria-label={`Categoria: ${c.name}`}
                    >
                      <div
                        className={cn(
                          "h-[88px] w-[88px] sm:h-[96px] sm:w-[96px]",
                          "rounded-full",
                          "bg-muted",
                          "grid place-items-center",
                          "overflow-hidden",
                          "transition-all duration-200 ease-out",
                          "group-hover:bg-primary",
                          "group-hover:shadow-[0_0_0_3px_hsl(var(--accent)/0.25)]",
                          "group-hover:ring-1 group-hover:ring-accent/60",
                        )}
                        style={{ transition: "all 0.25s ease" }}
                      >
                        {img ? (
                          <img
                            src={img}
                            alt={`Categoria ${c.name}`}
                            className={cn(
                              "h-full w-full object-cover",
                              "transition-all duration-200 ease-out",
                              "group-hover:brightness-0 group-hover:invert",
                            )}
                            loading="lazy"
                            draggable={false}
                          />
                        ) : (
                          <Icon
                            size={50}
                            className={cn(
                              "text-foreground",
                              "transition-colors duration-200",
                              "group-hover:text-primary-foreground",
                            )}
                          />
                        )}
                      </div>

                      <div className="mt-2">
                        <div className="text-[13px] sm:text-[14px] font-semibold leading-snug tracking-tight text-foreground">
                          {c.name}
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    );
  },
);
HomeCategoriesCarousel.displayName = "HomeCategoriesCarousel";

