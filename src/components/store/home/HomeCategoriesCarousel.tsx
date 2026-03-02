import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
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

  useEffect(() => {
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

export const HomeCategoriesCarousel = React.forwardRef<HTMLDivElement, Props>(
  ({ categories, hideHeader = false }, ref) => {
    const [api, setApi] = useState<CarouselApi>();
    const [canPrev, setCanPrev] = useState(false);
    const [canNext, setCanNext] = useState(false);

    useEffect(() => {
      if (!api) return;

      const updateArrows = () => {
        if (categories.length > 1) {
          setCanPrev(true);
          setCanNext(true);
          return;
        }

        setCanPrev(api.canScrollPrev());
        setCanNext(api.canScrollNext());
      };

      updateArrows();
      api.on("select", updateArrows);
      api.on("reInit", updateArrows);

      return () => {
        api.off("select", updateArrows);
        api.off("reInit", updateArrows);
      };
    }, [api, categories.length]);

    if (!categories || categories.length === 0) return null;

    return (
      <div ref={ref}>
        <section className="space-y-4" aria-label="Categorias">
          {!hideHeader ? (
            <header className="flex items-end justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">Categorias</h2>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => api?.scrollPrev()}
                  disabled={!canPrev}
                  aria-label="Categoria anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => api?.scrollNext()}
                  disabled={!canNext}
                  aria-label="Próxima categoria"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Link to="/loja" className="ml-1 text-sm font-medium underline underline-offset-4">
                  Ver catálogo
                </Link>
              </div>
            </header>
          ) : (
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => api?.scrollPrev()}
                disabled={!canPrev}
                aria-label="Categoria anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => api?.scrollNext()}
                disabled={!canNext}
                aria-label="Próxima categoria"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="relative">
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-10 z-10",
                "bg-gradient-to-r from-background to-transparent",
              )}
            />
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-10 z-10",
                "bg-gradient-to-l from-background to-transparent",
              )}
            />

            <Carousel
              setApi={setApi}
              opts={{
                align: "start",
                dragFree: false,
                containScroll: "trimSnaps",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 sm:-ml-3">
                {categories.map((c) => {
                  const Icon = pickIcon(c.name);
                  const img = publicImageUrl("category-images", c.image_path ?? null);

                  return (
                    <CarouselItem
                      key={c.id}
                      className={cn(
                        "pl-2 sm:pl-3",
                        "basis-[48%]",
                        "sm:basis-[34%]",
                        "md:basis-[26%]",
                        "lg:basis-[20%]",
                        "xl:basis-[16.6%]",
                      )}
                    >
                      <Link
                        to={`/loja?categoria=${encodeURIComponent(c.slug)}`}
                        className={cn(
                          "group flex h-full flex-col items-center text-center",
                          "rounded-2xl",
                          "px-2 py-3 sm:px-3 sm:py-4",
                          "transition-transform duration-200 ease-out",
                          "hover:-translate-y-1",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        )}
                        aria-label={`Categoria: ${c.name}`}
                      >
                        <CategoryAvatar name={c.name} img={img} Icon={Icon} />

                        <div className="mt-3">
                          <div className="text-[14px] font-semibold leading-snug tracking-tight text-foreground">
                            {c.name}
                          </div>
                        </div>
                      </Link>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
            </Carousel>
          </div>
        </section>
      </div>
    );
  },
);

HomeCategoriesCarousel.displayName = "HomeCategoriesCarousel";
