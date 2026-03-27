import React, { useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { publicImageUrl } from "@/utils/storage";

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

type IconLike = React.ComponentType<{ size?: string | number; className?: string }>;

function CategoryAvatar({
  name,
  img,
  Icon,
}: {
  name: string;
  img: string;
  Icon: IconLike;
}) {
  const [imgOk, setImgOk] = useState(Boolean(img));

  React.useEffect(() => {
    setImgOk(Boolean(img));
  }, [img]);

  return (
    <div
      className={cn(
        "h-[72px] w-[72px] sm:h-[76px] sm:w-[76px]",
        "rounded-full",
        "border border-border/70",
        "bg-background/80",
        "grid place-items-center",
        "shadow-sm",
        "overflow-hidden",
        "transition-shadow duration-200",
        "group-hover:shadow-md",
      )}
      aria-hidden="true"
    >
      {imgOk ? (
        <img
          src={img}
          alt={`Categoria ${name}`}
          className="h-full w-full object-cover"
          loading="lazy"
          draggable={false}
          onError={() => setImgOk(false)}
        />
      ) : (
        <Icon
          size={46}
          className={cn("text-primary", "transition-colors duration-200", "group-hover:text-accent")}
        />
      )}
    </div>
  );
}

type Props = {
  categories: StoreCategory[];
  hideHeader?: boolean;
};

const ITEM_WIDTH_MOBILE = 140;
const ITEM_WIDTH_DESKTOP = 164;
const ITEM_GAP = 12;
const DRAG_CLICK_THRESHOLD = 8;
const CATEGORY_CAROUSEL_SPEED_FACTOR = 0.36;

export const HomeCategoriesCarousel = React.forwardRef<HTMLDivElement, Props>(
  ({ categories, hideHeader = false }, ref) => {
    const navigate = useNavigate();
    const [isPaused, setIsPaused] = useState(false);
    const [manualShift, setManualShift] = useState(0);

    const normalizedCategories = useMemo(
      () => (categories ?? []).filter((c) => c?.id && c?.name && c?.slug),
      [categories],
    );
    const hasLoop = normalizedCategories.length > 1;
    const loopedCategories = useMemo(
      () => (hasLoop ? [...normalizedCategories, ...normalizedCategories] : normalizedCategories),
      [hasLoop, normalizedCategories],
    );

    const durationSeconds = useMemo(() => {
      const baseDuration = Math.min(35, Math.max(20, normalizedCategories.length * 4 || 20));
      const adjusted = baseDuration / CATEGORY_CAROUSEL_SPEED_FACTOR;
      return Math.round(adjusted);
    }, [normalizedCategories.length]);


    const getCycleWidth = () => {
      const base = typeof window !== "undefined" && window.innerWidth < 640 ? ITEM_WIDTH_MOBILE : ITEM_WIDTH_DESKTOP;
      return normalizedCategories.length * (base + ITEM_GAP);
    };

    const normalizeShift = (value: number) => {
      if (!hasLoop) return value;
      const cycleWidth = getCycleWidth();
      if (cycleWidth <= 0) return value;

      let next = value;
      while (next <= -cycleWidth) next += cycleWidth;
      while (next >= cycleWidth) next -= cycleWidth;
      return next;
    };

    const shiftBy = (direction: "prev" | "next") => {
      if (!hasLoop) return;
      const base = typeof window !== "undefined" && window.innerWidth < 640 ? ITEM_WIDTH_MOBILE : ITEM_WIDTH_DESKTOP;
      const step = direction === "next" ? -(base + ITEM_GAP) : base + ITEM_GAP;
      setManualShift((prev) => normalizeShift(prev + step));
    };

    const dragRef = useRef({
      active: false,
      startX: 0,
      startShift: 0,
      moved: false,
    });

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!hasLoop || e.button !== 0) return;
      dragRef.current = { active: true, startX: e.clientX, startShift: manualShift, moved: false };
      setIsPaused(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current.active) return;
      const delta = e.clientX - dragRef.current.startX;
      if (Math.abs(delta) > DRAG_CLICK_THRESHOLD) {
        dragRef.current.moved = true;
      }
      setManualShift(normalizeShift(dragRef.current.startShift + delta));
      e.preventDefault();
    };

    const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      setIsPaused(false);
      globalThis.setTimeout(() => {
        dragRef.current.moved = false;
      }, 0);
    };

    if (!normalizedCategories.length) return null;

    return (
      <div ref={ref}>
        <section className="space-y-4" aria-label="Categorias">
          {!hideHeader ? (
            <header className="flex items-end justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">Categorias</h2>
              <Link to="/loja" className="text-sm font-medium underline underline-offset-4">
                Ver catálogo
              </Link>
            </header>
          ) : null}

          <div
            className={cn(
              "relative w-full select-none touch-pan-y",
              hasLoop ? "cursor-grab active:cursor-grabbing" : "",
            )}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            onTouchCancel={() => setIsPaused(false)}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <button
              type="button"
              className="absolute left-0 top-1/2 z-20 -translate-y-1/2 border-0 bg-transparent p-0 text-primary shadow-none"
              onClick={() => shiftBy("prev")}
              disabled={!hasLoop}
              aria-label="Categoria anterior"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <button
              type="button"
              className="absolute right-0 top-1/2 z-20 -translate-y-1/2 border-0 bg-transparent p-0 text-primary shadow-none"
              onClick={() => shiftBy("next")}
              disabled={!hasLoop}
              aria-label="Próxima categoria"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            <div className="overflow-hidden mx-7 sm:mx-9">
              <div
                className={cn(
                  "w-max [will-change:transform]",
                  "motion-safe:animate-[scrollLoop_var(--carousel-duration)_linear_infinite]",
                  "motion-reduce:animate-none",
                  isPaused && "[animation-play-state:paused]",
                )}
                style={{ "--carousel-duration": `${durationSeconds}s` } as CSSProperties}
              >
                <div className="flex w-max gap-3" style={{ transform: `translateX(${manualShift}px)` }}>
                  {loopedCategories.map((c, index) => {
                    const Icon = pickIcon(c.name);
                    const img = publicImageUrl("category-images", c.image_path ?? null);

                    return (
                      <Link
                        key={`${c.id}-${index}`}
                        to={`/loja?categoria=${encodeURIComponent(c.slug)}`}
                        className={cn(
                          "group flex w-[140px] shrink-0 flex-col items-center text-center sm:w-[164px]",
                          "rounded-2xl px-2 py-3 sm:px-3 sm:py-4",
                          "transition-transform duration-200 ease-out hover:-translate-y-1",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        )}
                        aria-label={`Categoria: ${c.name}`}
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                        onClick={(e) => {
                          if (dragRef.current.moved) e.preventDefault();
                        }}
                      >
                        <CategoryAvatar name={c.name} img={img} Icon={Icon} />
                        <div className="mt-3 text-[14px] font-semibold leading-snug tracking-tight text-foreground">{c.name}</div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  },
);

HomeCategoriesCarousel.displayName = "HomeCategoriesCarousel";
