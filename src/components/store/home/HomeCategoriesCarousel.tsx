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
}: {
  categories: StoreCategory[];
  hideHeader?: boolean;
}) {
  const items = useMemo(() => (categories ?? []).slice(0, 40), [categories]);
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((c) => {
          const Icon = pickIcon(c.name);
          const img = publicImageUrl("category-images", c.image_path ?? null);

          return (
            <Link
              key={c.id}
              to={`/loja?categoria=${encodeURIComponent(c.slug)}`}
              className={cn(
                "group rounded-2xl border border-border",
                "bg-gradient-to-br from-card to-secondary/20",
                "shadow-sm hover:shadow-md",
                "transition-all duration-200",
                "hover:-translate-y-1",
              )}
              aria-label={`Categoria: ${c.name}`}
            >
              <div className="p-5 flex flex-col items-center text-center">
                <div
                  className={cn(
                    "h-[88px] w-[88px] rounded-2xl",
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
                        "text-primary transition-colors duration-200",
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
          );
        })}
      </div>
    </section>
  );
}
