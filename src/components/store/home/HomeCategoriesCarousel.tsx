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

        // 0.03 px/ms = 30px/s
        if (el.scrollWidth > el.clientWidth) {
          el.scrollLeft += delta * 0.03;

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

    if (baseItems.length === 0) return null;

    return (
      <div ref={ref}>
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

          <div className="relative">
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-12 z-10",
                "bg-gradient-to-r from-background to-transparent",
              )}
            />
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-12 z-10",
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
                "inline-flex gap-2",
                "whitespace-nowrap",
                "overflow-x-auto overflow-y-hidden",
                "overscroll-x-contain",
                "snap-none",
                "py-0.5",
                "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
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
                      "basis-[45%]",
                      "sm:basis-[38%]",
                      "md:basis-1/3",
                      "lg:basis-[22%]",
                      "xl:basis-[20%]",
                    )}
                  >
                    <Link
                      to={`/loja?categoria=${encodeURIComponent(c.slug)}`}
                      className={cn(
                        "group block h-full",
                        "rounded-[18px] border border-border",
                        "bg-gradient-to-br from-card to-secondary/10",
                        "shadow-sm",
                        "transition-all duration-200 ease-out",
                        "hover:-translate-y-[6px] hover:scale-[1.03] hover:shadow-md",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      )}
                      aria-label={`Categoria: ${c.name}`}
                    >
                      <div className="p-4 sm:p-5 flex flex-col items-center text-center">
                        <div
                          className={cn(
                            "h-[72px] w-[72px] sm:h-[76px] sm:w-[76px]",
                            "rounded-2xl",
                            "border border-border/70",
                            "bg-background/80",
                            "grid place-items-center",
                            "shadow-sm",
                            "overflow-hidden",
                          )}
                        >
                          {img ? (
                            <img
                              src={img}
                              alt={`Categoria ${c.name}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              draggable={false}
                            />
                          ) : (
                            <Icon
                              size={46}
                              className={cn("text-primary", "transition-colors duration-200", "group-hover:text-accent")}
                            />
                          )}
                        </div>

                        <div className="mt-3">
                          <div className="text-[14px] font-semibold leading-snug tracking-tight">{c.name}</div>
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
