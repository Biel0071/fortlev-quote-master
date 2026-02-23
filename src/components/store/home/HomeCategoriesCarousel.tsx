import { useEffect, useMemo, useRef } from "react";
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
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import type { StoreCategory } from "@/hooks/useStoreCategories";
import { publicImageUrl } from "@/utils/storage";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function pickIcon(name: string) {
  const key = (name ?? "").trim().toLowerCase();

  // Mapeamento por palavras-chave (não altera nomes; só escolhe ícone coerente)
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

function usePrefersReducedMotion() {
  const prefersReduced = useRef(false);

  useEffect(() => {
    const mql = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mql) return;

    const update = () => {
      prefersReduced.current = !!mql.matches;
    };

    update();
    mql.addEventListener?.("change", update);
    return () => mql.removeEventListener?.("change", update);
  }, []);

  return prefersReduced;
}

export function HomeCategoriesCarousel({
  categories,
  hideHeader = false,
  loop = true,
}: {
  categories: StoreCategory[];
  hideHeader?: boolean;
  loop?: boolean;
}) {
  const items = useMemo(() => (categories ?? []).slice(0, 60), [categories]);
  const loopItems = useMemo(() => {
    if (!loop) return items;
    // Duplica para loop infinito real (reset imperceptível no meio)
    return [...items, ...items];
  }, [items, loop]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const lastTsRef = useRef<number | null>(null);
  const resumeTimeoutRef = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const pause = () => {
    pausedRef.current = true;
    if (resumeTimeoutRef.current) {
      window.clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  };

  const resume = () => {
    pausedRef.current = false;
    if (resumeTimeoutRef.current) {
      window.clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  };

  const resumeAfter = (ms: number) => {
    pausedRef.current = true;
    if (resumeTimeoutRef.current) window.clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = window.setTimeout(() => {
      pausedRef.current = false;
      resumeTimeoutRef.current = null;
    }, ms);
  };

  const scrollByStep = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;

    // step proporcional ao viewport (mantém sensação premium em todos tamanhos)
    const step = Math.max(240, Math.round(el.clientWidth * 0.72));
    pause();
    el.scrollBy({ left: direction * step, behavior: "smooth" });
    resumeAfter(900);
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    // Começa no “meio” quando loop ativo para permitir reset nos dois sentidos.
    if (loop) {
      const half = Math.floor(el.scrollWidth / 2);
      if (half > 0) el.scrollLeft = Math.max(0, half - 1);
    }

    const tick = (ts: number) => {
      rafRef.current = window.requestAnimationFrame(tick);

      if (reducedMotion.current) return;
      if (pausedRef.current) {
        lastTsRef.current = ts;
        return;
      }

      const node = scrollerRef.current;
      if (!node) return;

      const last = lastTsRef.current;
      lastTsRef.current = ts;
      if (last == null) return;

      // 0.3px–0.6px por frame ~ (0.018–0.036 px/ms @ 60fps)
      const speedPxPerMs = 0.028; // suave e constante
      const delta = Math.min(32, ts - last);

      node.scrollLeft += delta * speedPxPerMs;

      if (!loop) return;

      const half = node.scrollWidth / 2;
      if (half <= 0) return;

      // Reset imperceptível ao passar do fim da primeira metade
      if (node.scrollLeft >= half) {
        node.scrollLeft -= half;
      }
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      if (resumeTimeoutRef.current) window.clearTimeout(resumeTimeoutRef.current);
    };
  }, [loop, reducedMotion]);

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

      <div className="relative">
        {/* Fade lateral para indicar continuidade */}
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

        {/* Setas apenas no desktop */}
        <div className="hidden lg:block">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Categorias: anterior"
            className={cn(
              "absolute -left-3 top-1/2 -translate-y-1/2 z-20",
              "h-9 w-9 rounded-full",
              "bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60",
              "border-border shadow-sm",
            )}
            onClick={() => scrollByStep(-1)}
            onMouseEnter={pause}
            onMouseLeave={resume}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Categorias: próxima"
            className={cn(
              "absolute -right-3 top-1/2 -translate-y-1/2 z-20",
              "h-9 w-9 rounded-full",
              "bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60",
              "border-border shadow-sm",
            )}
            onClick={() => scrollByStep(1)}
            onMouseEnter={pause}
            onMouseLeave={resume}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div
          ref={scrollerRef}
          role="region"
          aria-roledescription="carousel"
          tabIndex={0}
          className={cn(
            "relative w-full",
            "flex gap-3",
            "overflow-x-auto overflow-y-hidden",
            "overscroll-x-contain",
            "snap-x snap-mandatory",
            "scroll-smooth",
            "py-1",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          onMouseEnter={pause}
          onMouseLeave={resume}
          onPointerDown={() => resumeAfter(1400)}
          onPointerUp={() => resumeAfter(600)}
          onTouchStart={() => resumeAfter(1400)}
          onTouchEnd={() => resumeAfter(600)}
          onScroll={() => resumeAfter(900)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              scrollByStep(-1);
            }
            if (e.key === "ArrowRight") {
              e.preventDefault();
              scrollByStep(1);
            }
          }}
        >
          {loopItems.map((c, idx) => {
            const Icon = pickIcon(c.name);
            const img = publicImageUrl("category-images", c.image_path ?? null);

            // Key estável mesmo duplicando: id + índice
            const key = `${c.id}-${idx}`;

            return (
              <div
                key={key}
                className={cn(
                  "shrink-0",
                  // Mobile: 2 (às vezes 3), Tablet: 4, Desktop: 6–7
                  "basis-1/2",
                  "sm:basis-1/3",
                  "md:basis-1/4",
                  "lg:basis-[calc(100%/6)]",
                  "xl:basis-[calc(100%/7)]",
                  // Snap central no mobile, start no resto
                  "snap-center sm:snap-start",
                  "pl-0",
                )}
              >
                <Link
                  to={`/loja?categoria=${encodeURIComponent(c.slug)}`}
                  className={cn(
                    "group block h-full",
                    "rounded-[18px] border border-border",
                    "bg-gradient-to-br from-card to-secondary/15",
                    "shadow-sm",
                    "transition-all duration-200 ease-out",
                    "hover:-translate-y-[6px] hover:scale-[1.03] hover:shadow-md",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  )}
                  aria-label={`Categoria: ${c.name}`}
                  onFocus={pause}
                  onBlur={resume}
                >
                  <div className="p-5 sm:p-6 flex flex-col items-center text-center">
                    <div
                      className={cn(
                        "h-[84px] w-[84px] sm:h-[92px] sm:w-[92px]",
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
                          size={52}
                          className={cn(
                            "text-primary",
                            "transition-colors duration-200",
                            "group-hover:text-accent",
                          )}
                        />
                      )}
                    </div>

                    <div className="mt-4">
                      <div className="text-[15px] font-semibold leading-snug tracking-tight">{c.name}</div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
