import { useMemo } from "react";
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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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

export function HomeCategoriesCarousel({
  categories,
  hideHeader = false,
  loop = false,
}: {
  categories: StoreCategory[];
  hideHeader?: boolean;
  loop?: boolean;
}) {
  const items = useMemo(() => (categories ?? []).slice(0, 60), [categories]);
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

        <Carousel
          opts={{
            align: "start",
            containScroll: "trimSnaps",
            loop,
          }}
          className="w-full"
          tabIndex={0}
        >
          <CarouselContent className="-ml-3">
            {items.map((c) => {
              const Icon = pickIcon(c.name);
              const img = publicImageUrl("category-images", c.image_path ?? null);

              return (
                <CarouselItem
                  key={c.id}
                  className={cn(
                    "pl-3",
                    // Mobile: 2 (às vezes 3), Tablet: 4, Desktop: 6–7
                    "basis-1/2",
                    "sm:basis-1/3",
                    "md:basis-1/4",
                    "lg:basis-[calc(100%/6)]",
                    "xl:basis-[calc(100%/7)]",
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
                </CarouselItem>
              );
            })}
          </CarouselContent>

          {/* Setas apenas no desktop */}
          <div className="hidden lg:block">
            <CarouselPrevious
              aria-label="Categorias: anterior"
              className={cn(
                "-left-3",
                "bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60",
                "border-border shadow-sm",
              )}
            />
            <CarouselNext
              aria-label="Categorias: próxima"
              className={cn(
                "-right-3",
                "bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60",
                "border-border shadow-sm",
              )}
            />
          </div>
        </Carousel>
      </div>
    </section>
  );
}
