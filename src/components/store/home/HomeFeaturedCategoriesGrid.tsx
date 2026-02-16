import { Link } from "react-router-dom";
import type { StoreCategory } from "@/hooks/useStoreCategories";
import { publicImageUrl } from "@/utils/storage";
import { cn } from "@/lib/utils";

export function HomeFeaturedCategoriesGrid({ categories }: { categories: StoreCategory[] }) {
  const items = (categories ?? []).slice(0, 6);
  if (items.length === 0) return null;

  return (
    <section className="space-y-4" aria-label="Categorias em destaque">
      <header>
        <h2 className="text-xl font-semibold">Categorias em destaque</h2>
        <p className="text-sm text-muted-foreground">Acesso rápido aos principais departamentos.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((c) => {
          const img = publicImageUrl("category-images", c.image_path ?? null);
          return (
            <Link
              key={c.id}
              to={`/loja?categoria=${encodeURIComponent(c.slug)}`}
              className={cn(
                "group relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm",
                "hover:shadow-md transition-shadow",
              )}
              aria-label={`Ver produtos de ${c.name}`}
            >
              <div className="aspect-[16/10]">
                {img ? (
                  <img src={img} alt={`Categoria ${c.name}`} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-full w-full fortlev-gradient opacity-70" />
                )}
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/15 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="text-base font-semibold leading-tight">{c.name}</div>
                <div className="mt-2 inline-flex items-center rounded-full border border-border bg-background/60 px-3 py-1 text-sm font-medium">
                  Ver produtos
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
